// The "OSHA establishments" schema in JSM Assets: one Establishment object per site that keeps its own OSHA 300 log
// (29 CFR 1904.30). Assets REST through Forge: requestJira(route`/jsm/assets/workspace/{id}/v1/...`). Assets refuses
// app-context calls on several endpoints, so Recordable calls it as the signed-in user and keeps a mirror in its own
// storage for triggers, the portal form and Rovo.
import { asApp, asUser, route } from '@forge/api';
import { checked } from './errors.js';
import { EST_TYPES } from './core/establishments.js';

const as = (who) => (who === 'app' ? asApp() : asUser());
const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const call = async (who, r, what, method = 'GET', body) =>
  checked(await as(who).requestJira(r, { method, headers: HEADERS, body: body === undefined ? undefined : JSON.stringify(body) }), what, 'Assets');

/** The site's Assets workspace id, or null when Assets isn't available. */
export async function workspaceId(who = 'user') {
  try {
    const r = await call(who, route`/rest/servicedeskapi/assets/workspace`, 'Finding the Assets workspace');
    return r?.values?.[0]?.workspaceId || null;
  } catch (e) {
    if ([401, 403, 404].includes(e.status)) return null;
    throw e;
  }
}

// defaultTypeId: 0 Text, 10 Select. `user: true` -> an Assets User attribute (type 2), with a text fallback.
export const EST_ATTRS = [
  { name: 'Street', defaultTypeId: 0 },
  { name: 'City', defaultTypeId: 0 },
  { name: 'State', defaultTypeId: 0, description: 'Two-letter code' },
  { name: 'ZIP', defaultTypeId: 0 },
  { name: 'NAICS code', defaultTypeId: 0, description: '6-digit NAICS' },
  { name: 'Industry description', defaultTypeId: 0 },
  { name: 'Establishment type', defaultTypeId: 10, options: EST_TYPES.map((t) => t.label).join(',') },
  { name: 'Company name', defaultTypeId: 0, description: 'Legal company name' },
  { name: 'EIN', defaultTypeId: 0 },
  { name: 'Time zone', defaultTypeId: 0, description: 'e.g. America/Chicago' },
  { name: 'Safety lead', user: true, description: 'Reviews new cases' },
];
export const SCHEMA_VERSION = 1;
export const SCHEMA_NAME = 'OSHA establishments';

export const FIELD_OF = {
  Name: 'name', Street: 'street', City: 'city', State: 'state', ZIP: 'zip', 'NAICS code': 'naics', 'Industry description': 'industry',
  'Establishment type': 'estType', 'Company name': 'company', EIN: 'ein', 'Time zone': 'tz', 'Safety lead': 'leadAccountId', 'Safety lead account ID': 'leadAccountId',
};

export async function listSchemas(ws, who = 'user') {
  const r = await call(who, route`/jsm/assets/workspace/${ws}/v1/objectschema/list?maxResults=100`, 'Listing Assets schemas');
  return (r?.values || []).map((s) => ({ id: String(s.id), name: s.name, key: s.objectSchemaKey }));
}

async function listTypes(ws, schemaId, who) {
  const r = await call(who, route`/jsm/assets/workspace/${ws}/v1/objectschema/${schemaId}/objecttypes/flat`, 'Listing Assets object types');
  return (Array.isArray(r) ? r : r?.values || []).map((t) => ({ id: String(t.id), name: t.name }));
}

async function pickIcon(ws, who) {
  const icons = await call(who, route`/jsm/assets/workspace/${ws}/v1/icon/global`, 'Listing Assets icons').catch(() => []);
  const list = Array.isArray(icons) ? icons : [];
  for (const re of [/factory|building|office|warehouse/i, /location|home|house/i]) {
    const i = list.find((x) => re.test(x.name));
    if (i) return String(i.id);
  }
  return list[0]?.id ? String(list[0].id) : undefined;
}

async function listAttributes(ws, typeId, who) {
  const r = await call(who, route`/jsm/assets/workspace/${ws}/v1/objecttype/${typeId}/attributes`, 'Reading Establishment attributes');
  return (Array.isArray(r) ? r : r?.values || []).map((a) => ({ id: String(a.id), name: a.name, type: a.type }));
}

async function createAttribute(ws, typeId, a, who) {
  const base = { name: a.name, description: a.description || '', minimumCardinality: 0, maximumCardinality: 1 };
  if (a.user) {
    try {
      return await call(who, route`/jsm/assets/workspace/${ws}/v1/objecttypeattribute/${typeId}`, `Adding the ${a.name} attribute`, 'POST', { ...base, type: 2 });
    } catch (e) {
      console.warn('Recordable: User attribute refused, using text', e.status);
      return call(who, route`/jsm/assets/workspace/${ws}/v1/objecttypeattribute/${typeId}`, `Adding the ${a.name} attribute`, 'POST', { ...base, name: `${a.name} account ID`, type: 0, defaultTypeId: 0 });
    }
  }
  return call(who, route`/jsm/assets/workspace/${ws}/v1/objecttypeattribute/${typeId}`, `Adding the ${a.name} attribute`, 'POST', {
    ...base, type: 0, defaultTypeId: a.defaultTypeId, options: a.options || '',
  });
}

/** Find or create the "OSHA establishments" schema, its Establishment type and attributes. */
export async function ensureSchema(ws, { schemaId, who = 'user' } = {}) {
  const schemas = await listSchemas(ws, who);
  let schema = schemaId ? schemas.find((s) => s.id === String(schemaId)) : null;
  if (!schema) schema = schemas.find((s) => /^osha establishments$/i.test(s.name));
  if (!schema) {
    const taken = new Set(schemas.map((s) => s.key));
    const key = ['OSHAEST', 'OSHA', 'ESTAB', 'RECORD'].find((k) => !taken.has(k)) || `OSHA${Date.now() % 1000}`;
    const created = await call(who, route`/jsm/assets/workspace/${ws}/v1/objectschema/create`, 'Creating the OSHA establishments schema in Assets', 'POST', {
      name: SCHEMA_NAME, objectSchemaKey: key, description: 'Sites with an OSHA 300 log (Recordable)',
    });
    schema = { id: String(created.id), name: created.name, key: created.objectSchemaKey };
  }
  const types = await listTypes(ws, schema.id, who);
  let type = types.find((t) => /^establishments?$/i.test(t.name));
  if (!type) {
    const iconId = await pickIcon(ws, who);
    const created = await call(who, route`/jsm/assets/workspace/${ws}/v1/objecttype/create`, 'Creating the Establishment object type', 'POST', {
      name: 'Establishment', description: 'Keeps its own OSHA 300 log', iconId, objectSchemaId: String(schema.id),
    });
    type = { id: String(created.id), name: created.name };
  }
  const have = await listAttributes(ws, type.id, who);
  const attrs = Object.fromEntries(have.map((a) => [a.name, a.id]));
  for (const a of EST_ATTRS) {
    if (attrs[a.name] || (a.user && attrs[`${a.name} account ID`])) continue;
    const created = await createAttribute(ws, type.id, a, who);
    attrs[created.name] = String(created.id);
  }
  return { workspaceId: ws, schemaId: schema.id, schemaName: schema.name, schemaKey: schema.key, typeId: type.id, attrs, version: SCHEMA_VERSION };
}

const valueOf = (attr) => {
  const v = attr?.objectAttributeValues?.[0];
  if (!v) return '';
  return v.user?.key || v.user?.accountId || (v.value ?? v.displayValue ?? '');
};

/** An Assets object -> an establishment. */
export function toEstablishment(obj, attrs) {
  const nameOf = Object.fromEntries(Object.entries(attrs).map(([name, id]) => [String(id), name]));
  const s = { id: `a${obj.id}`, objectId: String(obj.id), objectKey: obj.objectKey, name: obj.label || '' };
  for (const a of obj.attributes || []) {
    const field = FIELD_OF[nameOf[String(a.objectTypeAttributeId)]];
    if (field && field !== 'name') s[field] = String(valueOf(a) || '');
  }
  return s;
}

/** Establishment fields -> Assets attributes payload (only the fields present). */
export function toAttributes(fields, attrs) {
  const out = [];
  for (const [name, field] of Object.entries(FIELD_OF)) {
    if (!(field in fields) || !attrs[name]) continue;
    const raw = fields[field];
    out.push({ objectTypeAttributeId: String(attrs[name]), objectAttributeValues: raw === null || raw === undefined || raw === '' ? [] : [{ value: String(raw) }] });
  }
  return out;
}

export async function listObjects(a, who = 'user') {
  const out = [];
  let startAt = 0;
  for (let page = 0; page < 20; page++) {
    const r = await call(who, route`/jsm/assets/workspace/${a.workspaceId}/v1/object/aql?startAt=${startAt}&maxResults=100&includeAttributes=true`, 'Reading the establishments', 'POST', { qlQuery: `objectTypeId = ${a.typeId}` });
    const values = r?.values || [];
    out.push(...values.map((o) => toEstablishment(o, a.attrs)));
    if (values.length < 100) break;
    startAt += values.length;
  }
  return out;
}

export async function createObject(a, fields, who = 'user') {
  const r = await call(who, route`/jsm/assets/workspace/${a.workspaceId}/v1/object/create`, `Adding ${fields.name} to Assets`, 'POST', {
    objectTypeId: String(a.typeId), attributes: toAttributes(fields, a.attrs),
  });
  return { objectId: String(r.id), objectKey: r.objectKey };
}

export const updateObject = (a, objectId, fields, who = 'user') =>
  call(who, route`/jsm/assets/workspace/${a.workspaceId}/v1/object/${objectId}`, `Updating ${fields.name || 'an establishment'} in Assets`, 'PUT', {
    objectTypeId: String(a.typeId), attributes: toAttributes(fields, a.attrs),
  });

export const deleteObject = (a, objectId, who = 'user') =>
  call(who, route`/jsm/assets/workspace/${a.workspaceId}/v1/object/${objectId}`, 'Removing an establishment from Assets', 'DELETE');

export const objectUrl = (site, a, objectId) =>
  site && a && objectId ? `${site}/jira/assets/object-schema/${a.schemaId}?typeId=${a.typeId}&objectId=${objectId}` : null;
