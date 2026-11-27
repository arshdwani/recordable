// Jira and Jira Service Management REST calls. `who` is 'user' (UI resolvers, Rovo actions) or 'app' (scheduled
// escalations and the issue-created trigger, where no user is present).
import { asApp, asUser, route, assumeTrustedRoute, getAppContext } from '@forge/api';
import { checked } from './errors.js';

const as = (who) => (who === 'app' ? asApp() : asUser());
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

const get = async (who, r, what) => checked(await as(who).requestJira(r, { headers: { Accept: 'application/json' } }), what);
const send = async (who, method, r, body, what) =>
  checked(await as(who).requestJira(r, { method, headers: JSON_HEADERS, body: body === undefined ? undefined : JSON.stringify(body) }), what);

/** The issue property key the JSM portal create panel saves under: the app id (UUID part of app.id). */
export function portalPropKey() {
  try {
    const a = getAppContext().appAri;
    return a?.appId || String(a).split('/').pop() || null;
  } catch (_) {
    return null;
  }
}

export async function isJiraAdmin() {
  const r = await get('user', route`/rest/api/3/mypermissions?permissions=ADMINISTER`, 'Checking your permissions');
  return Boolean(r?.permissions?.ADMINISTER?.havePermission);
}

export async function myself() {
  const r = await get('user', route`/rest/api/3/myself`, 'Reading your profile');
  return { accountId: r.accountId, displayName: r.displayName };
}

export async function siteUrl() {
  const r = await get('app', route`/rest/api/3/serverInfo`, 'Reading the site address');
  return String(r?.baseUrl || '').replace(/\/$/, '');
}

// ---- Service desks and request types ----------------------------------------------------------------------
export async function listServiceDesks(who = 'user') {
  const r = await get(who, route`/rest/servicedeskapi/servicedesk?limit=100`, 'Listing service projects');
  return (r?.values || []).map((s) => ({ id: String(s.id), projectId: String(s.projectId), projectKey: s.projectKey, projectName: s.projectName }));
}

export async function listRequestTypes(serviceDeskId, who = 'user') {
  const r = await get(who, route`/rest/servicedeskapi/servicedesk/${serviceDeskId}/requesttype?limit=100`, 'Listing request types');
  return (r?.values || []).map((t) => ({ id: String(t.id), name: t.name, issueTypeId: String(t.issueTypeId), description: t.description || '', groupIds: (t.groupIds || []).map(String) }));
}

// Fields Recordable fills on every request it creates (others that are required would block creation).
export const FILLED_FIELDS = ['summary', 'description'];

export async function requestTypeFields(serviceDeskId, requestTypeId, who = 'user') {
  const r = await get(who, route`/rest/servicedeskapi/servicedesk/${serviceDeskId}/requesttype/${requestTypeId}/field`, 'Reading the request type form');
  return (r?.requestTypeFields || []).map((f) => ({ fieldId: f.fieldId, name: f.name, required: Boolean(f.required) }));
}
export const blockingFields = (fields) => fields.filter((f) => f.required && !FILLED_FIELDS.includes(f.fieldId)).map((f) => f.name);

export const INJURY_TYPE_NAME = 'Injury or illness';

/** Create the "Injury or illness" request type (service project admins; the JSM endpoint is experimental). */
export async function createRequestType(serviceDeskId, issueTypeId, who = 'user') {
  const res = await as(who).requestJira(route`/rest/servicedeskapi/servicedesk/${serviceDeskId}/requesttype`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, 'X-ExperimentalApi': 'opt-in' },
    body: JSON.stringify({
      name: INJURY_TYPE_NAME,
      description: 'Report a work injury, illness, needlestick, hearing test result or near miss that needed care.',
      helpText: 'Tell us what happened, when and where, and what care was given. Report every work injury or illness: you have the right to report without retaliation (29 CFR 1904.35).',
      issueTypeId: String(issueTypeId),
    }),
  });
  return checked(res, `Creating the "${INJURY_TYPE_NAME}" request type`);
}

/** The JSM request type of an issue (null when it isn't a JSM request). */
export async function requestTypeOf(issueKey, who = 'app') {
  try {
    const r = await get(who, route`/rest/servicedeskapi/request/${issueKey}?expand=requestType`, `Reading request ${issueKey}`);
    return r?.requestTypeId ? String(r.requestTypeId) : r?.requestType?.id ? String(r.requestType.id) : null;
  } catch (e) {
    if ([400, 403, 404].includes(e.status)) return null;
    throw e;
  }
}

// ---- Projects, issue types, users -----------------------------------------------------------------------
export async function listIssueTypes(projectId, who = 'user') {
  const r = await get(who, route`/rest/api/3/issue/createmeta/${projectId}/issuetypes?maxResults=100`, 'Reading issue types');
  return (r?.issueTypes || r?.values || []).map((t) => ({ id: String(t.id), name: t.name, subtask: Boolean(t.subtask) }));
}

const BOT = /bot\b|bitbucket|automation|integration|\bapp\b|service account|\bsystem\b|^jira |^confluence /i;
/** People who can be assigned in a project (bots and integrations left out). */
export async function assignableUsers(projectKey, who = 'user') {
  const r = await get(who, route`/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=100`, 'Listing people in the project');
  return (r || []).filter((u) => u.accountType === 'atlassian' && u.active !== false && !BOT.test(u.displayName || '')).map((u) => ({ accountId: u.accountId, displayName: u.displayName }));
}

/** Display names for account IDs (looked up when needed, never stored). */
export async function displayNames(ids, who = 'user') {
  const uniq = [...new Set(ids.filter(Boolean))];
  const out = {};
  for (let i = 0; i < uniq.length; i += 50) {
    const chunk = uniq.slice(i, i + 50);
    const qs = chunk.map((id) => `accountId=${encodeURIComponent(id)}`).join('&');
    const res = await as(who).requestJira(assumeTrustedRoute(`/rest/api/3/user/bulk?maxResults=50&${qs}`), { headers: { Accept: 'application/json' } }).catch(() => null);
    if (!res?.ok) continue;
    const r = await res.json().catch(() => null);
    for (const u of r?.values || []) out[u.accountId] = u.displayName;
  }
  return out;
}

// ---- Issues ---------------------------------------------------------------------------------------------
export async function issue(key, who = 'user', fields = 'summary,status,created,reporter,issuetype,parent,project,attachment,labels') {
  const r = await get(who, route`/rest/api/3/issue/${key}?fields=${fields}`, `Reading ${key}`);
  const f = r.fields || {};
  return {
    key: r.key,
    id: r.id,
    summary: f.summary || '',
    description: f.description || null,
    status: f.status?.name || '',
    statusCategory: f.status?.statusCategory?.key || '',
    created: f.created || null,
    reporter: f.reporter ? { accountId: f.reporter.accountId, displayName: f.reporter.displayName } : null,
    isSubtask: Boolean(f.issuetype?.subtask),
    parentKey: f.parent?.key || null,
    projectId: f.project?.id ? String(f.project.id) : null,
    projectKey: f.project?.key || null,
    labels: f.labels || [],
    attachments: (f.attachment || []).map((a) => ({ id: String(a.id), filename: a.filename, created: a.created, size: a.size })),
  };
}

/** Plain text of an ADF document (for intake suggestions; never stored). */
export function adfText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  const inner = (node.content || []).map(adfText).join(node.type === 'doc' ? '\n' : '');
  return ['paragraph', 'heading', 'listItem'].includes(node.type) ? `${inner}\n` : inner;
}

/** Create a JSM request (sample data). Falls back to summary-only when the form has no description field. */
export async function createRequest({ serviceDeskId, requestTypeId, summary, description, raiseOnBehalfOf, who = 'user' }) {
  try {
    const r = await send(who, 'POST', route`/rest/servicedeskapi/request`, {
      serviceDeskId: String(serviceDeskId), requestTypeId: String(requestTypeId), requestFieldValues: { summary, description }, isAdfRequest: true,
      ...(raiseOnBehalfOf ? { raiseOnBehalfOf } : {}),
    }, 'Creating the request');
    return { key: r.issueKey, id: r.issueId };
  } catch (e) {
    if (e.status !== 400 || !/description/i.test(e.body || '')) throw e;
    const r = await send(who, 'POST', route`/rest/servicedeskapi/request`, {
      serviceDeskId: String(serviceDeskId), requestTypeId: String(requestTypeId), requestFieldValues: { summary },
      ...(raiseOnBehalfOf ? { raiseOnBehalfOf } : {}),
    }, 'Creating the request');
    await editFields(r.issueKey, { description }, who).catch(() => null);
    return { key: r.issueKey, id: r.issueId };
  }
}

/**
 * Create the owner's work item: a sub-task of the request (or, in projects without sub-tasks, a task linked to it).
 * Assignment is best effort: when the owner can't be assigned in this project the item is created unassigned.
 * Returns { key, assigned, warning }.
 */
export async function createOwnerTask({ parentKey, projectId, issueTypeId, subtask, summary, description, assignee, labels, due, who = 'user' }) {
  const fields = { project: { id: String(projectId) }, issuetype: { id: String(issueTypeId) }, summary, description, labels };
  if (due) fields.duedate = due;
  if (subtask) fields.parent = { key: parentKey };
  if (assignee) fields.assignee = { accountId: assignee };
  let created;
  let warning = null;
  try {
    created = await send(who, 'POST', route`/rest/api/3/issue`, { fields }, `Creating the owner task for ${parentKey}`);
  } catch (e) {
    if (e.status !== 400) throw e;
    let bad = {};
    try { bad = JSON.parse(e.body || '{}').errors || {}; } catch (_) { /* not JSON */ }
    const drop = Object.keys(bad).filter((k) => k in fields && !['project', 'issuetype', 'summary', 'parent'].includes(k));
    if (!drop.length) throw e;
    for (const k of drop) delete fields[k];
    if (drop.includes('assignee')) warning = "The owner can't be assigned in this project, so the work item is unassigned.";
    created = await send(who, 'POST', route`/rest/api/3/issue`, { fields }, `Creating the owner task for ${parentKey}`);
  }
  if (!subtask) {
    await send(who, 'POST', route`/rest/api/3/issueLink`, { type: { name: 'Relates' }, inwardIssue: { key: created.key }, outwardIssue: { key: parentKey } }, 'Linking the owner task').catch(() => null);
  }
  return { key: created.key, id: created.id, assigned: Boolean(fields.assignee), warning };
}

/** PUT fields; on a 400, drop the fields Jira names and try once more. Returns warnings. */
export async function editFields(key, fields, who = 'user', warnings = []) {
  if (!Object.keys(fields).length) return warnings;
  try {
    await send(who, 'PUT', route`/rest/api/3/issue/${key}?notifyUsers=false`, { fields }, `Updating ${key}`);
  } catch (e) {
    if (e.status !== 400) throw e;
    let bad = {};
    try { bad = JSON.parse(e.body || '{}').errors || {}; } catch (_) { /* not JSON */ }
    const rest = Object.fromEntries(Object.entries(fields).filter(([k]) => !(k in bad)));
    for (const k of Object.keys(fields)) if (k in bad) warnings.push(`${k}: ${bad[k]}`);
    if (Object.keys(rest).length && Object.keys(rest).length < Object.keys(fields).length) {
      await send(who, 'PUT', route`/rest/api/3/issue/${key}?notifyUsers=false`, { fields: rest }, `Updating ${key}`).catch((err) => warnings.push(err.message));
    } else if (!Object.keys(bad).length) warnings.push(e.message);
  }
  return warnings;
}

export async function addLabels(key, labels, who = 'user') {
  return send(who, 'PUT', route`/rest/api/3/issue/${key}?notifyUsers=false`, { update: { labels: labels.map((l) => ({ add: l })) } }, `Labelling ${key}`).catch(() => null);
}

export async function getProperty(key, prop, who = 'user') {
  try {
    const r = await get(who, route`/rest/api/3/issue/${key}/properties/${prop}`, `Reading data on ${key}`);
    return r?.value ?? null;
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

/** Create a plain work item (the annual summary task). */
export async function createIssue({ projectId, issueTypeId, summary, description, assignee, due, labels = [], who = 'user' }) {
  const fields = { project: { id: String(projectId) }, issuetype: { id: String(issueTypeId) }, summary, description, labels };
  if (due) fields.duedate = due;
  if (assignee) fields.assignee = { accountId: assignee };
  try {
    return await send(who, 'POST', route`/rest/api/3/issue`, { fields }, 'Creating the work item');
  } catch (e) {
    if (e.status !== 400) throw e;
    delete fields.assignee;
    delete fields.duedate;
    return send(who, 'POST', route`/rest/api/3/issue`, { fields }, 'Creating the work item');
  }
}

/** Issue keys from a JQL search (enhanced search). */
export async function searchKeys(jql, who = 'user', max = 100) {
  const r = await send(who, 'POST', route`/rest/api/3/search/jql`, { jql, maxResults: max, fields: ['summary'] }, 'Searching work items');
  return (r?.issues || []).map((i) => i.key);
}

export const setProperty = (key, prop, value, who = 'user') =>
  send(who, 'PUT', route`/rest/api/3/issue/${key}/properties/${prop}`, value, `Saving data on ${key}`);
export const deleteProperty = (key, prop, who = 'user') =>
  send(who, 'DELETE', route`/rest/api/3/issue/${key}/properties/${prop}`, undefined, `Removing data from ${key}`).catch(() => null);

/** Internal note (agents only) on a JSM request, or a normal comment on other issues. */
export async function addComment(key, adf, { who = 'user', internal = true } = {}) {
  try {
    return await send(who, 'POST', route`/rest/api/3/issue/${key}/comment`, {
      body: adf,
      properties: internal ? [{ key: 'sd.public.comment', value: { internal: true } }] : undefined,
    }, `Commenting on ${key}`);
  } catch (e) {
    if (!internal) throw e;
    return send(who, 'POST', route`/rest/api/3/issue/${key}/comment`, { body: adf }, `Commenting on ${key}`);
  }
}

/** A reply the requester sees (JSM public comment). */
export const reply = (key, text, who = 'user') =>
  send(who, 'POST', route`/rest/servicedeskapi/request/${key}/comment`, { body: text, public: true }, `Replying on ${key}`);

/** Move an issue to a status in `category` ('done' or 'indeterminate'), going through "In progress" if needed. */
export async function transitionTo(key, category, who = 'user') {
  const names = category === 'done' ? /resolve|done|close|complete|fix/i : /progress|start|work/i;
  let moved = null;
  for (let step = 0; step < 3; step++) {
    const r = await get(who, route`/rest/api/3/issue/${key}/transitions`, `Reading workflow steps for ${key}`);
    const list = r?.transitions || [];
    const direct = list.find((x) => x.to?.statusCategory?.key === category && names.test(x.name)) || list.find((x) => x.to?.statusCategory?.key === category);
    const via = category === 'done' ? list.find((x) => x.to?.statusCategory?.key === 'indeterminate' && /start|progress|work/i.test(`${x.name} ${x.to?.name}`)) : null;
    const t = direct || via;
    if (!t || (moved && !direct && t.to?.name === moved)) return direct ? t.to?.name : moved && category !== 'done' ? moved : null;
    await send(who, 'POST', route`/rest/api/3/issue/${key}/transitions`, { transition: { id: t.id } }, `Moving ${key} to ${t.to?.name}`);
    moved = t.to?.name || t.name;
    if (direct) return moved;
  }
  return null;
}

export const deleteIssue = (key, who = 'user') => send(who, 'DELETE', route`/rest/api/3/issue/${key}?deleteSubtasks=true`, undefined, `Deleting ${key}`);

/** Attach a file (multipart body built by hand). Returns { id, filename }. */
export async function attachFile(key, filename, data, mimeType, who = 'user') {
  const boundary = `----recordable${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const safeName = filename.replace(/["\r\n]/g, '_');
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await as(who).requestJira(route`/rest/api/3/issue/${key}/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'X-Atlassian-Token': 'no-check', Accept: 'application/json' },
    body,
  });
  const out = await checked(res, `Attaching ${filename} to ${key}`);
  const a = Array.isArray(out) ? out[0] : out;
  return { id: String(a?.id || ''), filename: a?.filename || filename };
}
