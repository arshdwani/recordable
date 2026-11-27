// Persistence on Forge Key-Value Storage. Recordable keeps issue keys, account IDs, dates, codes, numbers and statuses
// only: never the employee's name, job title, narrative or medical details (those stay in the Jira request).
//
//   cfg                     settings (service project, request type, Assets establishments schema, organisation)
//   case:<KEY>              one injury or illness case (coded facts, decision, log entry, OSHA report, audit trail)
//   est:<id>                establishment: the register when Assets is off, a mirror of Assets objects when on
//   year:<estId>:<YYYY>     hours worked, employees, certification, posting, electronic submission, summary task
//   claim:<what>            FAIL_IF_EXISTS claim taken before a side effect (one case, one case number, one alert)
//   sample                  what "Load sample" created: { issues: [KEY], establishments: [id], cases: {name: KEY} }
//   job:sample              sample loading progress (resumable under the 25-second limit)
import { kvs, WhereConditions } from '@forge/kvs';

const safeKey = (s) => String(s).replace(/[^A-Za-z0-9:._#-]+/g, '_');

async function listPrefix(prefix, withKeys = false) {
  const out = [];
  let cursor;
  do {
    let q = kvs.query().where('key', WhereConditions.beginsWith(prefix)).limit(100);
    if (cursor) q = q.cursor(cursor);
    const page = await q.getMany();
    for (const r of page.results || []) out.push(withKeys ? { key: r.key, value: r.value } : r.value);
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

export const getConfig = async () => (await kvs.get('cfg')) || {};
export const saveConfig = (cfg) => kvs.set('cfg', cfg);

export const listCases = () => listPrefix('case:');
export const getCase = (key) => kvs.get('case:' + safeKey(String(key || '').toUpperCase()));
export const saveCase = (c) => kvs.set('case:' + safeKey(c.issueKey), { ...c, updatedAt: Date.now() });
export const deleteCase = (key) => kvs.delete('case:' + safeKey(key));

export const listEstablishments = () => listPrefix('est:');
export const getEstablishment = (id) => (id ? kvs.get('est:' + safeKey(id)) : null);
export const saveEstablishment = (e) => kvs.set('est:' + safeKey(e.id), e);
export const deleteEstablishment = (id) => kvs.delete('est:' + safeKey(id));

const yearKey = (estId, year) => `year:${safeKey(estId)}:${Number(year)}`;
export const getYear = async (estId, year) => (await kvs.get(yearKey(estId, year))) || { estId, year: Number(year) };
export const saveYear = (y) => kvs.set(yearKey(y.estId, y.year), y);
export const listYears = () => listPrefix('year:');
export const deleteYear = (estId, year) => kvs.delete(yearKey(estId, year));

/** Atomic "first one wins": true only for the caller that created the claim. */
export async function claim(key) {
  try {
    await kvs.set('claim:' + safeKey(key), Date.now(), { keyPolicy: 'FAIL_IF_EXISTS' });
    return true;
  } catch (_) {
    return false;
  }
}
export const releaseClaim = (key) => kvs.delete('claim:' + safeKey(key));
export const listClaims = async (prefix) => (await listPrefix('claim:' + safeKey(prefix), true)).map((r) => r.key);
export const deleteRaw = (key) => kvs.delete(key);

export const getSample = async () => (await kvs.get('sample')) || { issues: [], establishments: [], cases: {} };
export const saveSample = (s) => kvs.set('sample', s);
export const deleteSample = () => kvs.delete('sample');
export const getJob = (name) => kvs.get('job:' + name);
export const saveJob = (name, j) => kvs.set('job:' + name, j);
export const deleteJob = (name) => kvs.delete('job:' + name);
