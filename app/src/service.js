// Recordable's operations, shared by the UI resolvers, the triggers and the Rovo actions.
import * as store from './store.js';
import * as jira from './jira.js';
import * as assets from './assets.js';
import * as estab from './establishments.js';
import { evaluate, clockBadge, countDays } from './core/engine.js';
import { applyPatch, answerPatch } from './core/facts.js';
import { factsFromPortal, portalValues, detectFacts } from './core/intake.js';
import { wallNow, wallToday } from './core/establishments.js';
import { citeText, TREATMENT, TREATMENTS, EXCEPTIONS, TYPES, BODY_PARTS, DIAGNOSES, REPORT_CHECKLIST, REPORT_HOW, BODY_PART, TYPE, MEDS } from './core/catalog.js';
import { form301Blocks, form301Name, form300Blocks, form300ABlocks } from './core/forms.js';
import { logRows, totals, rates, summaryChecks } from './core/log.js';
import { requirement, csv300A, csvCases, sizeCode } from './core/ita.js';
import { renderPdf } from './core/pdf.js';
import { isIsoDate, today as todayIso, fmt, fmtDateTime, yearOf } from './core/dates.js';
import * as adf from './core/adf.js';
import { UserError, friendly } from './errors.js';

export const requireAdmin = async (what) => {
  if (!(await jira.isJiraAdmin().catch(() => false))) throw new UserError(`Only Jira administrators can ${what}.`);
};

const DEFAULT_TZ = 'America/New_York';
export const tzOf = (est) => est?.tz || DEFAULT_TZ;

/** Evaluate a case at the establishment's local "now". */
export async function evaluateCase(c, { now = Date.now(), est } = {}) {
  const e = est !== undefined ? est : await store.getEstablishment(c.facts?.est);
  const tz = tzOf(e);
  const today = wallToday(tz, now);
  const r = evaluate(c.facts || {}, { today });
  const nowMs = wallNow(tz, now);
  return { r, today, nowMs, est: e, badge: clockBadge(r, c.facts, { nowMs, today, logged: c.log?.caseNo || null, reportedAt: c.report?.at || null }) };
}

const STATUS_LABEL = { open: 'Open', logged: 'On the log', closed: 'Closed: not recordable', merged: 'Closed: same as an earlier case' };
export const statusLabel = (s) => STATUS_LABEL[s] || s;

const propOf = (c, ev) => ({
  type: 'case', status: c.status, decision: ev.r.decision, est: c.facts?.est || null, year: c.facts?.incidentDate ? yearOf(c.facts.incidentDate) : null,
  recordBy: ev.r.recordBy || null, reportable: Boolean(ev.r.report?.required && !c.report), caseNo: c.log?.caseNo || null,
});

/** Save the case and keep the issue property (display conditions, JQL) in step. */
async function commit(c, who = 'user') {
  await store.saveCase(c);
  const ev = await evaluateCase(c);
  await jira.setProperty(c.issueKey, 'recordable', propOf(c, ev), who).catch((e) => console.error('Recordable: property', c.issueKey, e.message));
  return ev;
}

export function record(c, { what, by = null, detail = '' }) {
  const history = [...(c.history || []), { at: Date.now(), what, by, detail: String(detail).slice(0, 300) }].slice(-80);
  return { ...c, history };
}

const comment = (key, body, who = 'user') => jira.addComment(key, body, { who, internal: true }).catch((e) => console.error('Recordable: comment', key, e.message));

async function caseOrThrow(issueKey) {
  const c = await store.getCase(String(issueKey || '').trim().toUpperCase());
  if (!c) throw new UserError(`${issueKey || 'That work item'} isn't a Recordable injury or illness case.`);
  return c;
}

// ---- Setup ----------------------------------------------------------------------------------------------
/** Prefer a safety desk, then HR, then facilities. */
export function defaultDesk(desks) {
  for (const re of [/safety|\behs\b|\bhse\b|health|osha|injur|incident/i, /human resources|\bhr\b|people|employee/i, /facilit|operations|plant|site/i]) {
    const d = desks.find((x) => re.test(x.projectName));
    if (d) return d;
  }
  return desks[0] || null;
}

async function taskTypeOf(projectId, who) {
  const types = await jira.listIssueTypes(projectId, who);
  const task = types.find((t) => !t.subtask && /^task$/i.test(t.name)) || types.find((t) => !t.subtask && !/epic/i.test(t.name));
  return task ? { id: task.id, name: task.name } : null;
}

/** Pick (or create) the service project and the "Injury or illness" request type. */
export async function ensureProject(cfg, { create = true } = {}) {
  const desks = await jira.listServiceDesks('user');
  if (!desks.length) throw new UserError('This site has no Jira Service Management project. Create one (any template), then come back.');
  const desk = desks.find((d) => d.id === String(cfg.serviceDeskId)) || defaultDesk(desks);
  const types = await jira.listRequestTypes(desk.id);
  let type = types.find((t) => t.id === String(cfg.requestTypeId)) || types.find((t) => t.name === jira.INJURY_TYPE_NAME);
  if (type && cfg.serviceDeskId === desk.id && cfg.requestTypeId === type.id && cfg.taskType) return cfg;
  let note = null;
  if (!type && create) {
    const base = baseRequestType(types);
    try {
      const made = await jira.createRequestType(desk.id, base?.issueTypeId);
      type = { id: String(made.id), name: made.name };
    } catch (e) {
      console.error('Recordable: request type create failed', e.message);
      type = base;
      note = `Recordable couldn't create the "${jira.INJURY_TYPE_NAME}" request type (${e.status === 403 ? 'you need service project admin rights' : 'Jira refused it'}), so it uses "${base?.name}". Any request can still be treated as an injury or illness with the ••• menu.`;
    }
  }
  if (!type) throw new UserError(`${desk.projectName} has no request types yet.`);
  Object.assign(cfg, {
    serviceDeskId: desk.id, projectId: desk.projectId, projectKey: desk.projectKey, projectName: desk.projectName,
    requestTypeId: type.id, requestTypeName: type.name, taskType: await taskTypeOf(desk.projectId, 'user'), projectNote: note,
  });
  await store.saveConfig(cfg);
  return cfg;
}

/** The work type a new "Injury or illness" request type is built on: an incident or case type, never a change. */
export function baseRequestType(types) {
  const ok = types.filter((t) => !/change|onboard|offboard|transfer|kudos|leave|access|purchase|hardware|software|email/i.test(t.name));
  for (const re of [/incident|injur|accident|safety/i, /case|question|general|help|support|report/i, /request/i]) {
    const t = ok.find((x) => re.test(x.name));
    if (t) return t;
  }
  return ok[0] || types[0] || null;
}

/** Whether the injury form is reachable on the portal (Jira's API can't add a request type to a portal group). */
export async function portalCheck(cfg) {
  if (!cfg.serviceDeskId || !cfg.requestTypeId) return { exists: false };
  const types = await jira.listRequestTypes(cfg.serviceDeskId).catch(() => null);
  if (!types) return { exists: true, unknown: true };
  const t = types.find((x) => x.id === String(cfg.requestTypeId));
  if (!t) return { exists: false };
  return { exists: true, onPortal: t.groupIds.length > 0 };
}

/** Find or create the OSHA establishments schema in Assets. */
export async function connectAssets() {
  await requireAdmin('connect Assets');
  const ws = await assets.workspaceId('user');
  if (!ws) return { ok: false, reason: "Assets isn't available on this site, so Recordable keeps establishments in its own register." };
  const cfg = await store.getConfig();
  cfg.assets = await assets.ensureSchema(ws, { schemaId: cfg.assets?.schemaId, who: 'user' });
  cfg.registerOnly = false;
  delete cfg.assetsNote;
  await store.saveConfig(cfg);
  return { ok: true, assets: { schemaName: cfg.assets.schemaName, schemaKey: cfg.assets.schemaKey } };
}

/** Assets if possible, else the register (with the reason). */
export async function ensureEstablishmentBackend(cfg) {
  if (cfg.assets || cfg.registerOnly) return cfg;
  const r = await connectAssets().catch((e) => {
    console.error('Recordable: Assets setup failed', e.message);
    return { ok: false, reason: `Assets couldn't be set up (${friendly(e)}), so Recordable keeps establishments in its own register. Try again in Settings.` };
  });
  const next = await store.getConfig();
  if (!r.ok) {
    next.registerOnly = true;
    next.assetsNote = r.reason;
    await store.saveConfig(next);
  }
  return next;
}

export async function setUp() {
  await requireAdmin('set up Recordable');
  let cfg = await ensureProject(await store.getConfig());
  cfg = await ensureEstablishmentBackend(cfg);
  return { ok: true, project: `${cfg.projectName} (${cfg.projectKey})`, requestType: cfg.requestTypeName, establishments: estab.usesAssets(cfg) ? `the "${cfg.assets.schemaName}" schema in Assets` : "Recordable's own register", note: cfg.projectNote || cfg.assetsNote || null };
}

// ---- Establishments ------------------------------------------------------------------------------------
export async function listEstablishments() {
  const cfg = await store.getConfig();
  const list = await estab.loadEstablishments(cfg, { who: 'user' });
  const site = await jira.siteUrl().catch(() => '');
  return list.map((e) => ({ ...e, url: assets.objectUrl(site, cfg.assets, e.objectId) })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveEstablishment({ id, ...fields }) {
  await requireAdmin('change establishments');
  const cfg = await ensureEstablishmentBackend(await store.getConfig());
  const e = id ? await estab.updateEstablishment(cfg, id, fields) : await estab.addEstablishment(cfg, fields);
  return { ok: true, id: e.id, name: e.name };
}

export async function removeEstablishment({ id }) {
  await requireAdmin('change establishments');
  const open = (await store.listCases()).filter((c) => c.facts?.est === id);
  if (open.length) throw new UserError(`${open.length} case${open.length === 1 ? ' belongs' : 's belong'} to this establishment (${open.slice(0, 3).map((c) => c.issueKey).join(', ')}). Move or remove them first.`);
  const r = await estab.removeEstablishment(await store.getConfig(), id);
  for (const y of (await store.listYears()).filter((x) => x.estId === id)) await store.deleteYear(id, y.year);
  return r;
}

/** Hours worked and employees for one establishment-year (Form 300A; rates; 1904.41 size). */
export async function saveYear({ estId, year, hours, avgEmployees, peakEmployees }) {
  await requireAdmin('change hours and employee counts');
  if (!(await store.getEstablishment(estId))) throw new UserError('Choose an establishment.');
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new UserError('Choose a year.');
  const n = (v, what, max) => {
    if (v === undefined || v === null || v === '') return undefined;
    const x = Number(String(v).replace(/[, ]/g, ''));
    if (!Number.isInteger(x) || x < 0 || x > max) throw new UserError(`${what} must be a whole number from 0 to ${max.toLocaleString('en-US')}.`);
    return x;
  };
  const cur = await store.getYear(estId, y);
  const next = { ...cur, estId, year: y };
  const h = n(hours, 'Total hours worked', 99999999);
  const a = n(avgEmployees, 'Annual average number of employees', 999999);
  const p = n(peakEmployees, 'Most employees at any one time', 999999);
  if (h !== undefined) next.hours = h;
  if (a !== undefined) next.avgEmployees = a;
  if (p !== undefined) next.peakEmployees = p;
  if (next.hours && next.avgEmployees && next.hours > next.avgEmployees * 8784) throw new UserError(`${next.hours.toLocaleString('en-US')} hours is more than ${next.avgEmployees} employees can work in a year. Check both numbers.`);
  await store.saveYear(next);
  return { ok: true };
}

// ---- Cases ------------------------------------------------------------------------------------------------
/** When the request was raised, in the establishment's local date and time (the day the employer learned of it). */
function receivedLocal(createdIso, tz) {
  const ms = Date.parse(createdIso || '') || Date.now();
  const wall = new Date(wallNow(tz, ms)).toISOString();
  return { date: wall.slice(0, 10), time: wall.slice(11, 16) };
}

export const portalKey = () => jira.portalPropKey();

/** The portal form answers on a request (in Jira; read when needed, never copied into Recordable's storage). */
export async function portalOf(issueKey, who = 'user') {
  const key = portalKey();
  if (!key) return null;
  return portalValues(await jira.getProperty(issueKey, key, who).catch(() => null));
}

/**
 * Start tracking an injury or illness. Facts come from the portal form when there is one, else from `facts`.
 * Idempotent: the first caller wins (the created event and an agent opening the panel can race).
 */
export async function openCase({ issueKey, who = 'user', accountId = null, facts = null, source = 'portal', sample = false, quiet = false }) {
  const key = String(issueKey).toUpperCase();
  const existing = await store.getCase(key);
  if (existing) return { case: existing, existed: true };
  const i = await jira.issue(key, who, 'summary,created,issuetype,project');
  if (i.isSubtask) throw new UserError('Treat the request itself as the injury or illness, not one of its sub-tasks.');
  if (!(await store.claim(`open:${key}`))) return { case: await store.getCase(key), existed: true };
  const portal = facts ? null : await portalOf(key, who);
  const ests = await store.listEstablishments();
  let f = facts ? { ...facts } : portal ? factsFromPortal(portal, {}) : {};
  if (!f.est && ests.length === 1) f.est = ests[0].id;
  const est = ests.find((e) => e.id === f.est) || null;
  const rec = receivedLocal(i.created, tzOf(est));
  if (!f.learnedDate) { f.learnedDate = rec.date; f.learnedTime = rec.time; }
  if (!f.incidentDate && !portal && !facts) f.incidentDate = rec.date;
  let c = {
    issueKey: i.key, issueId: i.id, projectKey: i.projectKey, projectId: i.projectId,
    facts: f, status: 'open', source, sample: Boolean(sample), log: null, report: null, closed: null, history: [],
  };
  c = record(c, { what: 'opened', by: accountId, detail: source === 'portal' ? (portal ? 'From the portal form' : 'From the request (no portal form answers)') : source === 'sample' ? 'Sample case' : 'Treated as an injury or illness' });
  const ev = await commit(c, who);
  if (!quiet) await comment(key, decisionNote(ev, c, { first: true }), who);
  c = await store.getCase(key);
  return { case: c, evaluation: ev.r };
}

/** For the "Treat as injury or illness" action: what the request text suggests (the text itself is never stored). */
export async function intakeFor(issueKey) {
  const key = String(issueKey || '').toUpperCase();
  const existing = await store.getCase(key);
  const i = await jira.issue(key, 'user', 'summary,description,created,issuetype,project');
  const { facts, matched } = detectFacts(`${i.summary}\n${jira.adfText(i.description)}`);
  const ests = await store.listEstablishments();
  return {
    issueKey: key, existing: Boolean(existing), isSubtask: i.isSubtask, matched,
    suggestion: { est: ests.length === 1 ? ests[0].id : null, incidentDate: String(i.created || '').slice(0, 10) || todayIso() },
    establishments: ests.map((e) => ({ value: e.id, label: e.name })),
  };
}

/** Start a case from any request: the establishment and date the agent picks, plus treatment words in the text. */
export async function openFromAction({ issueKey, est, incidentDate, accountId }) {
  const key = String(issueKey || '').toUpperCase();
  if (await store.getCase(key)) return { ok: true, existed: true };
  if (est && !(await store.getEstablishment(est))) throw new UserError('Choose one of the establishments.');
  if (incidentDate && !isIsoDate(incidentDate)) throw new UserError('Pick the date of the injury or illness.');
  const portal = await portalOf(key).catch(() => null);
  let facts = null;
  if (!portal) {
    const i = await jira.issue(key, 'user', 'summary,description');
    facts = { ...detectFacts(`${i.summary}\n${jira.adfText(i.description)}`).facts, workRelated: 'unknown', prior: 'none' };
    if (est) facts.est = est;
    if (incidentDate) facts.incidentDate = incidentDate;
  }
  const r = await openCase({ issueKey: key, accountId, facts, source: portal ? 'portal' : 'action' });
  return { ok: true, existed: Boolean(r.existed), decision: r.evaluation?.decision || null };
}

/** The internal note Recordable posts on a request: the decision, its rules, the questions and the clocks. */
export function decisionNote(ev, c, { first = false } = {}) {
  const { r } = ev;
  const lines = [];
  for (const s of r.steps.filter((x) => ['yes', 'no', 'privacy'].includes(x.result))) lines.push(`${s.text} (${citeText(s.cite)})`);
  for (const q of r.questions) lines.push(`Question: ${q.text} (${citeText(q.cite)})`);
  if (r.report?.required && !c.report) lines.push(`Report to OSHA by ${fmtDateTime(r.report.due)} local time: ${r.report.events.map((e) => e.label.toLowerCase()).join(', ')} (29 CFR ${r.report.cite}). Call the OSHA Area Office or 1-800-321-OSHA (6742), or report at osha.gov/report.`);
  if (r.decision === 'recordable' && !c.log && r.recordBy) lines.push(`Enter it on the OSHA 300 log by ${fmt(r.recordBy)} (29 CFR 1904.29(b)(3)).`);
  const lead = r.decision === 'recordable' ? 'recordable.' : r.decision === 'not-recordable' ? 'not recordable.' : r.decision === 'existing-case' ? 'not a new case.' : 'needs answers before it can be decided.';
  return adf.note(`${first ? 'new injury or illness case: ' : ''}${lead}`, lines);
}

/** Edit facts (panel fields, question answers, Rovo). Re-evaluates and notes a changed decision on the request. */
export async function updateFacts({ issueKey, patch, question, answer, accountId, who = 'user', quiet = false }) {
  let c = await caseOrThrow(issueKey);
  if (c.status === 'closed' || c.status === 'merged') throw new UserError('This case is closed. Reopen it to change the facts.');
  let p = patch;
  if (question) {
    const ev0 = await evaluateCase(c);
    const q = ev0.r.questions.find((x) => x.id === question);
    if (!q) throw new UserError('That question is already answered. Refresh the panel.');
    p = answerPatch(q, answer);
    if (!p) return { ok: true, needsException: true };
  }
  if (p?.est !== undefined && !(await store.getEstablishment(p.est))) throw new UserError('Choose one of the establishments.');
  let next;
  try {
    next = applyPatch(c.facts, p);
  } catch (e) {
    throw new UserError(e.message);
  }
  if (!next.changed.length) return { ok: true, unchanged: true };
  if (c.log && next.changed.some((k) => ['est', 'incidentDate'].includes(k)) && (next.facts.est !== c.facts.est || yearOf(next.facts.incidentDate) !== c.log.year)) {
    throw new UserError(`${c.issueKey} is case ${c.log.caseNo} on the ${c.log.year} log of its establishment. Remove it from the log first to move it to another log.`);
  }
  const before = (await evaluateCase(c)).r;
  c = record({ ...c, facts: next.facts }, { what: 'facts', by: accountId, detail: next.changed.join(', ') });
  const ev = await commit(c, who);
  if (!quiet && (ev.r.decision !== before.decision || (ev.r.outcome && ev.r.outcome !== before.outcome) || (ev.r.report?.required && !before.report?.required))) {
    await comment(c.issueKey, decisionNote(ev, c), who);
  }
  // A logged case keeps its log entry in step (days, outcome, type) automatically: the log is computed from the facts.
  return { ok: true, decision: ev.r.decision, summary: ev.r.summary };
}

/** Case number "2026-007": the next free number on this establishment-year's log (claimed atomically). */
async function nextCaseNo(estId, year, cases) {
  let n = cases.filter((x) => x.log && x.log.est === estId && x.log.year === year).length + 1;
  for (let i = 0; i < 50; i++, n++) {
    if (await store.claim(`caseno:${estId}:${year}:${n}`)) return `${year}-${String(n).padStart(3, '0')}`;
  }
  throw new UserError('Could not allocate a case number. Try again.');
}

/** Enter a recordable case on its establishment's OSHA 300 log and attach the incident report (Form 301 equivalent). */
export async function logCase({ issueKey, accountId, who = 'user', day = null }) {
  let c = await caseOrThrow(issueKey);
  if (c.log) return { ok: true, caseNo: c.log.caseNo, existed: true };
  const ev = await evaluateCase(c);
  if (ev.r.decision !== 'recordable') throw new UserError(ev.r.decision === 'needs-info' ? `Answer the open question${ev.r.questions.length === 1 ? '' : 's'} first: ${ev.r.questions[0]?.text}` : 'Recordable found this case is not recordable, so it does not go on the 300 log.');
  if (!ev.est) throw new UserError('Choose the establishment first: each establishment keeps its own 300 log (29 CFR 1904.30).');
  const year = yearOf(c.facts.incidentDate);
  const caseNo = await nextCaseNo(ev.est.id, year, await store.listCases());
  const at = day || ev.today;
  c = { ...c, status: 'logged', log: { caseNo, year, est: ev.est.id, at, by: accountId, onTime: !ev.r.recordBy || at <= ev.r.recordBy } };
  c = record(c, { what: 'logged', by: accountId, detail: `Case ${caseNo} on the ${year} log of ${ev.est.name}${c.log.onTime ? '' : ` (late: due ${fmt(ev.r.recordBy)})`}` });
  await commit(c, who);
  const pdf = await attach301(c, ev, who).catch((e) => { console.error('Recordable: 301', e.message); return null; });
  if (pdf) {
    c = { ...(await store.getCase(c.issueKey)), form301: { id: pdf.id, name: pdf.filename, day: at } };
    await store.saveCase(c);
  }
  await comment(c.issueKey, adf.note(`entered on the OSHA 300 log of ${ev.est.name} as case ${caseNo}.`, [
    `${ev.r.outcomeLabel} · ${ev.r.typeLabel}${ev.r.days?.away ? ` · ${ev.r.days.away} days away` : ''}${ev.r.days?.restricted ? ` · ${ev.r.days.restricted} days restricted` : ''}`,
    ev.r.privacy.length ? 'Privacy case: the log shows "Privacy case" instead of the name (29 CFR 1904.29(b)(6)).' : null,
    pdf ? `Incident report (Form 301 equivalent) attached: ${pdf.filename}` : null,
    c.log.onTime ? null : `Entered after the 7-day deadline of ${fmt(ev.r.recordBy)} (29 CFR 1904.29(b)(3)).`,
  ]), who);
  return { ok: true, caseNo, form301: pdf?.filename || null };
}

async function attach301(c, ev, who) {
  const portal = (await portalOf(c.issueKey, who)) || {};
  const cfg = await store.getConfig();
  const blocks = form301Blocks({ c, r: ev.r, est: ev.est, portal, org: cfg.orgName || ev.est?.company || '' });
  const name = form301Name(c);
  const buf = renderPdf(blocks, { title: `Injury and Illness Incident Report ${c.log.caseNo}`, footer: `Recordable · ${c.issueKey} · case ${c.log.caseNo} · keep 5 years (29 CFR 1904.33)` });
  return jira.attachFile(c.issueKey, name, buf, 'application/pdf', who);
}

/** Take a case off the log (the line is struck: OSHA keeps the number; Recordable records why). */
export async function unlogCase({ issueKey, reason, accountId, who = 'user' }) {
  let c = await caseOrThrow(issueKey);
  if (!c.log) return { ok: true };
  if (!String(reason || '').trim()) throw new UserError('Say why the case comes off the log (for the audit trail).');
  c = record({ ...c, status: 'open', removedLog: [...(c.removedLog || []), { ...c.log, removedAt: todayIso(), reason: String(reason).slice(0, 200) }], log: null }, { what: 'unlogged', by: accountId, detail: String(reason).slice(0, 200) });
  await commit(c, who);
  await comment(c.issueKey, adf.note(`removed from the OSHA 300 log: ${String(reason).slice(0, 200)}`), who);
  return { ok: true };
}

/** Close a case Recordable decided is not recordable (or that is the same as an earlier case). */
export async function closeCase({ issueKey, accountId, who = 'user' }) {
  let c = await caseOrThrow(issueKey);
  const ev = await evaluateCase(c);
  if (!['not-recordable', 'existing-case'].includes(ev.r.decision)) throw new UserError(ev.r.decision === 'recordable' ? 'This case is recordable: enter it on the log instead.' : 'Answer the open questions first.');
  if (ev.r.report?.required && !c.report) throw new UserError('Report the event to OSHA first (29 CFR 1904.39): reporting applies even when a case is not recordable.');
  c = record({ ...c, status: ev.r.decision === 'existing-case' ? 'merged' : 'closed', closed: { at: ev.today, by: accountId, why: ev.r.summary } }, { what: 'closed', by: accountId, detail: ev.r.summary });
  await commit(c, who);
  await comment(c.issueKey, adf.note(`closed: ${ev.r.summary}`), who);
  return { ok: true };
}

export async function reopenCase({ issueKey, accountId, who = 'user' }) {
  let c = await caseOrThrow(issueKey);
  if (c.status !== 'closed' && c.status !== 'merged') return { ok: true };
  c = record({ ...c, status: 'open', closed: null }, { what: 'reopened', by: accountId });
  await commit(c, who);
  return { ok: true };
}

/** Record the report to OSHA (1904.39): when, how and the reference OSHA gave. */
export async function markReported({ issueKey, method, date, time, reference, checklist = [], accountId, who = 'user' }) {
  let c = await caseOrThrow(issueKey);
  const ev = await evaluateCase(c);
  if (!ev.r.report?.required) throw new UserError('Nothing on this case needs reporting to OSHA.');
  if (!REPORT_HOW.some((h) => h.code === method)) throw new UserError('Choose how you reported it.');
  const d = isIsoDate(date) ? date : ev.today;
  const t = /^\d{2}:\d{2}$/.test(time || '') ? time : new Date(ev.nowMs).toISOString().slice(11, 16);
  const at = Date.parse(`${d}T${t}:00Z`);
  if (at > ev.nowMs + 36e5) throw new UserError("The report time can't be in the future.");
  const onTime = at <= ev.r.report.due;
  c = record({ ...c, report: { at, method, reference: String(reference || '').slice(0, 60), checklist: checklist.filter((x) => REPORT_CHECKLIST.some((k) => k.code === x)), by: accountId, onTime, due: ev.r.report.due } }, { what: 'reported', by: accountId, detail: `${REPORT_HOW.find((h) => h.code === method).label} on ${fmtDateTime(at)}${reference ? `, reference ${reference}` : ''}${onTime ? '' : ' (late)'}` });
  await commit(c, who);
  await comment(c.issueKey, adf.note(`reported to OSHA ${onTime ? 'on time' : 'late'}: ${fmtDateTime(at)} local time, ${REPORT_HOW.find((h) => h.code === method).label.replace(/^By /, 'by ').replace(/^Online/, 'online')}${reference ? `, reference ${reference}` : ''}.`, [`Due ${fmtDateTime(ev.r.report.due)} (29 CFR ${ev.r.report.cite}).`]), who);
  return { ok: true, onTime };
}

// ---- Panel ---------------------------------------------------------------------------------------------
const option = (x) => ({ value: x.code, label: x.label });
export const optionLists = () => ({
  treatments: TREATMENTS.map((t) => ({ value: t.code, label: t.kind === 'first-aid' ? `${t.label} (first aid ${t.letter})` : t.kind === 'medical' ? `${t.label} (medical treatment)` : `${t.label} (not treatment)` })),
  exceptions: EXCEPTIONS.map((e) => ({ value: e.code, label: `${e.label} (${e.cite})` })),
  types: TYPES.map(option),
  bodyParts: BODY_PARTS.map(option),
  diagnoses: DIAGNOSES.map(option),
  meds: [...Object.entries(MEDS).map(([value, m]) => ({ value, label: m.label })), { value: 'other', label: 'Other non-prescription medicine' }],
  reportHow: REPORT_HOW.map(option),
  checklist: REPORT_CHECKLIST.map(option),
});

export async function getPanel(issueKey, { accountId } = {}) {
  const key = String(issueKey || '').toUpperCase();
  let c = await store.getCase(key);
  if (!c) {
    // The created event may not have arrived (or was missed): a request with portal answers opens on first view.
    const portal = await portalOf(key).catch(() => null);
    if (portal && Object.keys(portal).length) c = (await openCase({ issueKey: key, accountId, source: 'portal' })).case;
  }
  if (!c) return { none: true };
  const ev = await evaluateCase(c);
  const portal = (await portalOf(key).catch(() => null)) || {};
  const ests = await store.listEstablishments();
  const names = await jira.displayNames([...(c.history || []).map((h) => h.by), c.log?.by, c.report?.by]).catch(() => ({}));
  const f = c.facts || {};
  return {
    issueKey: key,
    status: c.status,
    statusLabel: statusLabel(c.status),
    sample: Boolean(c.sample),
    badge: ev.badge,
    today: ev.today,
    nowMs: ev.nowMs,
    est: ev.est ? { id: ev.est.id, name: ev.est.name, tz: tzOf(ev.est) } : null,
    establishments: ests.map((e) => ({ value: e.id, label: e.name })),
    // From the request in Jira, shown to agents who can see the request; never stored by Recordable.
    told: {
      employee: portal.employee || '', jobTitle: portal.jobTitle || '', where: portal.where || '', doing: portal.doing || '', happened: portal.happened || '',
      injury: portal.injury || '', object: portal.object || '', physician: portal.physician || '', facility: portal.facility || '',
    },
    facts: f,
    days: countDays(f, ev.today),
    awayStarts: f.away?.from && f.away.from > ev.today && !f.death ? f.away.from : null,
    decision: {
      code: ev.r.decision, summary: ev.r.summary, steps: ev.r.steps, questions: ev.r.questions,
      outcome: ev.r.outcome || null, outcomeLabel: ev.r.outcomeLabel || null, outcomeCol: ev.r.outcomeCol || null,
      type: ev.r.type, typeLabel: ev.r.typeLabel, typeCol: ev.r.typeCol, privacy: ev.r.privacy, recordBy: ev.r.recordBy || null,
      workRelated: ev.r.workRelated,
    },
    reportFacts: ev.r.report?.required ? {
      establishment: [ev.est?.name, [ev.est?.street, ev.est?.city, ev.est?.state].filter(Boolean).join(', ')].filter(Boolean).join(', '),
      location: portal.where || '',
      time: [f.incidentDate ? fmt(f.incidentDate) : '', f.incidentTime || ''].filter(Boolean).join(' '),
      event: ev.r.report.events.map((e) => e.label).join(', '),
      count: '1',
      names: portal.employee || '',
      contact: '',
      description: portal.happened || '',
    } : null,
    report: ev.r.report ? { ...ev.r.report, dueText: ev.r.report.due ? fmtDateTime(ev.r.report.due) : null, hoursLeft: ev.r.report.due ? Math.round(((ev.r.report.due - ev.nowMs) / 36e5) * 10) / 10 : null, done: c.report ? { ...c.report, atText: fmtDateTime(c.report.at), byName: names[c.report.by] || '' } : null } : null,
    log: c.log ? { ...c.log, byName: names[c.log.by] || '' } : null,
    form301: c.form301 ? { name: c.form301.name, url: `/secure/attachment/${c.form301.id}/${encodeURIComponent(c.form301.name)}` } : null,
    history: [...(c.history || [])].reverse().slice(0, 30).map((h) => ({ ...h, name: h.by ? names[h.by] || '' : 'Recordable' })),
    labels: {
      bodyPart: BODY_PART[f.bodyPart]?.label || '', type: TYPE[f.type]?.label || 'Injury',
      treatments: (f.treatments || []).map((t) => TREATMENT[t]?.label).filter(Boolean),
    },
    options: optionLists(),
  };
}

/** A request was deleted: forget its case (the log line goes with it; its case number is not reused). */
export async function forgetCase(issueKey) {
  const key = String(issueKey || '').toUpperCase();
  if (!(await store.getCase(key))) return { ok: true };
  await store.deleteCase(key);
  return { ok: true, removed: key };
}

/** Badge for the jira:issueContext glance. */
export async function issueBadge(issueKey) {
  const c = await store.getCase(issueKey);
  if (!c) return null;
  if (c.status === 'closed') return { label: 'Not recordable', type: 'default' };
  if (c.status === 'merged') return { label: 'Same as an earlier case', type: 'default' };
  return (await evaluateCase(c)).badge;
}

// ---- Board ---------------------------------------------------------------------------------------------
export async function getBoard({ light = false } = {}) {
  const cfg = await store.getConfig();
  const [cases, isAdmin] = await Promise.all([store.listCases(), jira.isJiraAdmin().catch(() => false)]);
  const ests = await estab.loadEstablishments(cfg, { who: 'user' }).catch(() => store.listEstablishments());
  const byId = Object.fromEntries(ests.map((e) => [e.id, e]));
  const rows = [];
  for (const c of cases) {
    const ev = await evaluateCase(c, { est: byId[c.facts?.est] || null });
    rows.push({
      issueKey: c.issueKey, status: c.status, statusLabel: statusLabel(c.status), est: byId[c.facts?.est]?.name || '', estId: c.facts?.est || null,
      incidentDate: c.facts?.incidentDate || null, bodyPart: BODY_PART[c.facts?.bodyPart]?.label || '', type: TYPE[ev.r.type]?.label || '',
      decision: ev.r.decision, summary: ev.r.summary, outcome: ev.r.outcomeLabel || '', outcomeCol: ev.r.outcomeCol || '', badge: ev.badge,
      caseNo: c.log?.caseNo || null, days: ev.r.days || countDays(c.facts || {}, ev.today), recordBy: ev.r.recordBy || null,
      report: ev.r.report?.required ? { due: ev.r.report.due, dueText: fmtDateTime(ev.r.report.due), hoursLeft: (ev.r.report.due - ev.nowMs) / 36e5, kinds: ev.r.report.events.map((x) => x.label), done: Boolean(c.report), tentative: ev.r.report.tentative } : null,
      questions: ev.r.questions.length, sample: Boolean(c.sample), year: c.facts?.incidentDate ? yearOf(c.facts.incidentDate) : null,
    });
  }
  const portal = await portalCheck(cfg);
  const rank = (r) => (r.report && !r.report.done ? 0 : r.decision === 'recordable' ? 1 : r.decision === 'needs-info' ? 2 : 3);
  const open = rows.filter((r) => r.status === 'open').sort((a, b) => rank(a) - rank(b) || (a.report && b.report ? a.report.due - b.report.due : 0) || String(a.recordBy || '').localeCompare(String(b.recordBy || '')));
  const alerts = rows.filter((r) => r.report && !r.report.done).sort((a, b) => a.report.due - b.report.due);
  return {
    isAdmin,
    today: todayIso(),
    setup: {
      done: Boolean(cfg.serviceDeskId && cfg.requestTypeId && portal.exists),
      hidden: portal.exists && portal.onPortal === false,
      settingsUrl: cfg.projectKey ? `/jira/servicedesk/projects/${encodeURIComponent(cfg.projectKey)}/settings/request-types` : null,
      project: cfg.projectName ? `${cfg.projectName} (${cfg.projectKey}) · ${cfg.requestTypeName}` : null,
      projectKey: cfg.projectKey || null,
      portalUrl: cfg.serviceDeskId && cfg.requestTypeId ? `/servicedesk/customer/portal/${cfg.serviceDeskId}/create/${cfg.requestTypeId}` : null,
      note: cfg.projectNote || cfg.assetsNote || null,
      where: estab.usesAssets(cfg) ? `the "${cfg.assets.schemaName}" schema in Assets` : cfg.registerOnly ? "Recordable's own register" : null,
    },
    establishments: ests.map((e) => ({ id: e.id, name: e.name, objectKey: e.objectKey || null, sample: Boolean(e.sample) })),
    counts: {
      open: open.length,
      alerts: alerts.length,
      questions: open.filter((r) => r.decision === 'needs-info').length,
      toLog: open.filter((r) => r.decision === 'recordable').length,
      logged: rows.filter((r) => r.status === 'logged').length,
    },
    open,
    alerts,
    logged: rows.filter((r) => r.status === 'logged'),
    closed: rows.filter((r) => r.status === 'closed' || r.status === 'merged'),
    ...(light ? {} : await boardExtras(cfg, cases, rows, ests, isAdmin)),
  };
}

const YEAR_END = (today) => {
  const y = Number(today.slice(0, 4));
  const out = [];
  if (today <= `${y}-04-30`) out.push({ what: `Post the ${y - 1} Form 300A summaries`, when: today < `${y}-02-01` ? `from Feb 1 to Apr 30, ${y}` : `until Apr 30, ${y}`, cite: '1904.32(b)(5)-(6)', due: `${y}-02-01` });
  if (today <= `${y}-03-02`) out.push({ what: `Submit ${y - 1} data to OSHA's Injury Tracking Application (where required)`, when: `by Mar 2, ${y}`, cite: '1904.41(c)', due: `${y}-03-02` });
  out.push({ what: `Review, certify and post the ${y} summaries`, when: `by Feb 1, ${y + 1}`, cite: '1904.32', due: `${y + 1}-02-01` });
  out.push({ what: `Submit ${y} data electronically (where required)`, when: `by Mar 2, ${y + 1}`, cite: '1904.41(c)', due: `${y + 1}-03-02` });
  return out;
};

async function boardExtras(cfg, cases, rows, ests, isAdmin) {
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const sample = await store.getSample();
  const job = await store.getJob('sample');
  const years = await establishmentYears(year, cases);
  const sk = sample.cases || {};
  const byKey = (k) => rows.find((r) => r.issueKey === sk[k]) || null;
  const amp = byKey('amputation');
  const tour = amp ? {
    reportable: amp.issueKey, reported: Boolean(amp.report?.done), ampLogged: Boolean(amp.caseNo),
    dose: byKey('question-dose')?.issueKey || null, doseOpen: byKey('question-dose')?.decision === 'needs-info',
    prior: byKey('question-prior')?.issueKey || null,
    sutures: byKey('sutures')?.issueKey || null, butterfly: byKey('butterfly')?.issueKey || null, needlestick: byKey('needlestick')?.issueKey || null,
    hearing: byKey('hearing')?.issueKey || null, commute: byKey('commute')?.issueKey || null, otc: byKey('otc-rx')?.issueKey || null, cap: byKey('cap')?.issueKey || null,
    plant2: years.find((e) => e.id === sample.estIds?.p2)?.name || null,
    plant2Id: sample.estIds?.p2 || null,
    summaryKey: years.find((e) => e.id === sample.estIds?.p2)?.summaryKey || null,
  } : null;
  return {
    year,
    years,
    deadlines: YEAR_END(today),
    hasSample: Boolean(sample.issues?.length || sample.establishments?.length),
    sampleJob: job ? { phase: job.phase, done: job.done?.length || 0 } : null,
    tour,
    progress: {
      setup: Boolean(cfg.serviceDeskId && cfg.requestTypeId),
      establishments: ests.length > 0,
      year: years.some((e) => e.hours && e.avgEmployees),
      cases: rows.length > 0,
      logged: rows.some((r) => r.caseNo),
      yearEnd: years.some((e) => e.summaryKey),
    },
    settings: isAdmin ? { orgName: cfg.orgName || '', registerOnly: Boolean(cfg.registerOnly), assetsSchema: cfg.assets ? `${cfg.assets.schemaName} (${cfg.assets.schemaKey})` : null } : null,
  };
}

export async function saveSettings({ orgName }) {
  await requireAdmin('change Recordable settings');
  const cfg = await store.getConfig();
  if (orgName !== undefined) cfg.orgName = String(orgName || '').trim().slice(0, 120);
  await store.saveConfig(cfg);
  return { ok: true };
}

// ---- Logs, summaries, rates, electronic submission ---------------------------------------------------------
/** Cases on one establishment-year's log, with evaluations and (optionally) the portal answers from Jira. */
async function logEntries(estId, year, { withPortal = true, cases = null, who = 'user' } = {}) {
  const est = await store.getEstablishment(estId);
  const list = (cases || (await store.listCases())).filter((c) => c.log && c.log.est === estId && c.log.year === Number(year));
  const out = [];
  for (const c of list) {
    const ev = await evaluateCase(c, { est });
    out.push({ c, r: ev.r, portal: withPortal ? (await portalOf(c.issueKey, who).catch(() => null)) || {} : {} });
  }
  return { est, entries: out };
}

/** Everything about one establishment-year: the 300 log rows, 300A totals, rates, checks and ITA requirement. */
export async function yearView(estId, year, opts = {}) {
  const y = Number(year);
  const { est, entries } = await logEntries(estId, y, opts);
  if (!est) throw new UserError('That establishment is no longer there. Refresh the page.');
  const rows = logRows(entries);
  const t = totals(rows);
  const yr = await store.getYear(estId, y);
  const prev = await store.getYear(estId, y - 1);
  return {
    est, year: y, rows, t, entries,
    hours: yr.hours ?? null, avgEmployees: yr.avgEmployees ?? null, peakEmployees: yr.peakEmployees ?? null,
    rates: rates(t, yr.hours),
    checks: summaryChecks(t, { avgEmployees: yr.avgEmployees, hours: yr.hours }),
    ita: requirement(est, { peak: yr.peakEmployees ?? yr.avgEmployees, year: y }),
    yearRec: yr,
    prevRates: prev.hours ? rates(totals(logRows((await logEntries(estId, y - 1, { withPortal: false })).entries)), prev.hours) : null,
  };
}

const slug = (s) => String(s || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/**
 * Prepare the year-end package for one establishment: a "Form 300A" work item in the service project (due Feb 1,
 * assigned to the safety lead) with the 300 log, the 300A summary and the ITA CSV files attached.
 */
export async function prepareSummary({ estId, year, accountId, who = 'user' }) {
  const cfg = await ensureProject(await store.getConfig(), { create: false });
  const v = await yearView(estId, year, { who });
  const { est } = v;
  const org = cfg.orgName || est.company || '';
  const today = wallToday(tzOf(est));
  const stamp = today.replace(/-/g, '');
  const base = `${v.year}-${slug(est.name)}`;
  const files = [];
  files.push({ name: `OSHA-300-log-${base}-${stamp}.pdf`, data: renderPdf(form300Blocks({ est, year: v.year, rows: v.rows, t: v.t, org }), { title: `OSHA 300 log ${v.year} ${est.name}`, footer: `Recordable · ${est.name} · ${v.year}`, landscape: true }), mime: 'application/pdf' });
  files.push({ name: `OSHA-300A-summary-${base}-${stamp}.pdf`, data: renderPdf(form300ABlocks({ est, year: v.year, t: v.t, avgEmployees: v.avgEmployees, hours: v.hours, org, rates: v.rates }), { title: `OSHA 300A ${v.year} ${est.name}`, footer: `Recordable · ${est.name} · ${v.year} · post Feb 1 - Apr 30, ${v.year + 1}` }), mime: 'application/pdf' });
  let problems = [];
  if (v.ita.submit300A || v.ita.unknown) {
    files.push({ name: `ITA-300A-${base}-${stamp}.csv`, data: csv300A([{ est: { ...est, company: org }, year: v.year, t: v.t, avgEmployees: v.avgEmployees, hours: v.hours, peak: v.peakEmployees ?? v.avgEmployees }]), mime: 'text/csv' });
  }
  if (v.ita.submitCases) {
    const items = v.rows.map((row) => {
      const e = v.entries.find((x) => x.c.issueKey === row.issueKey);
      return { est, year: v.year, row, c: e.c, r: e.r, portal: e.portal };
    });
    const out = csvCases(items);
    problems = out.problems;
    files.push({ name: `ITA-300-301-cases-${base}-${stamp}.csv`, data: out.text, mime: 'text/csv' });
  }
  const yr = await store.getYear(estId, v.year);
  let key = yr.summaryKey;
  if (key) {
    const exists = await jira.issue(key, who, 'summary').catch(() => null);
    if (!exists) key = null;
  }
  const steps = [
    `Review the ${v.year} OSHA 300 log of ${est.name} (${v.rows.length} case${v.rows.length === 1 ? '' : 's'}) and fix any entry (29 CFR 1904.32(a)(1)).`,
    `A company executive certifies the 300A summary attached here (29 CFR 1904.32(b)(3)-(4)).`,
    `Post the signed summary in a conspicuous place from February 1 to April 30, ${v.year + 1} (29 CFR 1904.32(b)(5)-(6)).`,
    v.ita.submit300A ? `Submit to OSHA's Injury Tracking Application by March 2, ${v.year + 1}: ${v.ita.submitCases ? 'the 300A file and the 300/301 case file' : 'the 300A file'} attached here (29 CFR 1904.41).` : v.ita.unknown ? 'Check whether this establishment must submit electronically (enter its NAICS code and peak employment in Recordable).' : 'No routine electronic submission for this establishment (29 CFR 1904.41).',
    'Keep the log, the summary and the incident reports for 5 years (29 CFR 1904.33).',
  ];
  const desc = adf.doc(
    adf.para(adf.strong('Recordable: '), `year-end recordkeeping for ${est.name}, ${v.year}.`),
    adf.bullets(steps),
    v.checks.length ? adf.para(adf.strong('Check before certifying: '), v.checks.join(' ')) : null,
    problems.length ? adf.para(adf.strong('Case file gaps: '), problems.slice(0, 8).join(' ')) : null,
  );
  if (!key) {
    if (!cfg.taskType) throw new UserError(`${cfg.projectName || 'The service project'} has no work type Recordable can use for the year-end task.`);
    const made = await jira.createIssue({ projectId: cfg.projectId, issueTypeId: cfg.taskType.id, summary: `OSHA 300A ${v.year} · ${est.name}: certify and post by Feb 1`, description: desc, assignee: est.leadAccountId || accountId || undefined, due: `${v.year + 1}-02-01`, labels: ['recordable', 'osha-300a'], who });
    key = made.key;
  } else {
    await jira.editFields(key, { description: desc }, who);
  }
  for (const f of files) await jira.attachFile(key, f.name, f.data, f.mime, who);
  await store.saveYear({ ...(await store.getYear(estId, v.year)), summaryKey: key, preparedAt: today, preparedBy: accountId || null, files: files.map((f) => f.name) });
  return { ok: true, key, files: files.map((f) => f.name), problems, checks: v.checks };
}

/** Record year-end steps: certified, posted, submitted to the ITA. */
export async function markYear({ estId, year, step, date, reference, accountId }) {
  await requireAdmin('record year-end steps');
  const y = await store.getYear(estId, year);
  const d = isIsoDate(date) ? date : todayIso();
  if (!['certified', 'posted', 'submitted'].includes(step)) throw new UserError('Choose certified, posted or submitted.');
  await store.saveYear({ ...y, estId, year: Number(year), [step]: { date: d, by: accountId || null, reference: String(reference || '').slice(0, 60) || null } });
  return { ok: true };
}

/** Rows for the board: per establishment, this year's log size, rates and year-end status. */
export async function establishmentYears(year, cases) {
  const out = [];
  for (const e of await store.listEstablishments()) {
    const { entries } = await logEntries(e.id, year, { withPortal: false, cases });
    const rows = logRows(entries);
    const t = totals(rows);
    const yr = await store.getYear(e.id, year);
    const ita = requirement(e, { peak: yr.peakEmployees ?? yr.avgEmployees, year });
    out.push({
      id: e.id, name: e.name, objectKey: e.objectKey || null, naics: e.naics || '', city: e.city || '', state: e.state || '', sample: Boolean(e.sample),
      year, cases: rows.length, t, rates: rates(t, yr.hours), hours: yr.hours ?? null, avgEmployees: yr.avgEmployees ?? null, peakEmployees: yr.peakEmployees ?? null,
      size: yr.peakEmployees ? sizeCode(yr.peakEmployees) : null,
      ita: { submit300A: Boolean(ita.submit300A), submitCases: Boolean(ita.submitCases), exempt: Boolean(ita.exempt), unknown: Boolean(ita.unknown), due: ita.due, reasons: ita.reasons },
      summaryKey: yr.summaryKey || null, preparedAt: yr.preparedAt || null, certified: yr.certified || null, posted: yr.posted || null, submitted: yr.submitted || null,
      checks: summaryChecks(t, { avgEmployees: yr.avgEmployees, hours: yr.hours }),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
