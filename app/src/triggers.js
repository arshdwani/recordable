// Triggers: new "Injury or illness" requests, hourly clock alerts, personal data reporting, and the sidebar badge.
// Scheduled and event triggers run as the app (no user), so they use Jira and Recordable's own storage only.
import { privacy } from '@forge/api';
import * as store from './store.js';
import * as jira from './jira.js';
import * as svc from './service.js';
import { hoursBetween, fmt, fmtDateTime, daysBetween } from './core/dates.js';
import * as adf from './core/adf.js';
import { citeText } from './core/catalog.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** A new request on the "Injury or illness" request type becomes a case, from the portal form's answers. */
export async function onIssueCreated(event) {
  if (event?.eventType === 'avi:jira:deleted:issue') {
    const r = await svc.forgetCase(event?.issue?.key).catch((e) => console.error('Recordable: forget', e.message));
    if (r?.removed) console.log('Recordable: request deleted, case removed', r.removed);
    return;
  }
  try {
    const issue = event?.issue;
    const key = issue?.key;
    if (!key) return;
    const cfg = await store.getConfig();
    if (!cfg.requestTypeId || !cfg.projectId) return;
    if (issue.fields?.project?.id && String(issue.fields.project.id) !== String(cfg.projectId)) return;
    if (issue.fields?.issuetype?.subtask) return;
    const rt = await jira.requestTypeOf(key, 'app');
    if (rt !== String(cfg.requestTypeId)) return;
    // The portal panel's answers are saved as an issue property with the request; give it a moment to land.
    let portal = null;
    for (let i = 0; i < 5 && !portal; i++) {
      portal = await svc.portalOf(key, 'app');
      if (!portal) await sleep(1500);
    }
    if (portal?.sample) return; // the sample opens its own cases
    // Fallback setup (an existing request type stands in for "Injury or illness"): only reports made with the
    // injury form become cases, so ordinary requests of that type are left alone.
    if (cfg.projectNote && !portal) return;
    const r = await svc.openCase({ issueKey: key, who: 'app', source: 'portal' });
    console.log('Recordable: opened', key, r.existed ? '(existed)' : r.evaluation?.decision, portal ? 'with portal answers' : 'without portal answers');
  } catch (e) {
    console.error('Recordable: issue-created failed', e.message);
  }
}

/**
 * Hourly: the OSHA report clock (8 or 24 hours, 1904.39), the 7-day recording clock (1904.29(b)(3)) and the running
 * day counts. One comment per case per step, claimed atomically.
 */
export async function runAlerts({ now = Date.now() } = {}) {
  const out = { checked: 0, posted: 0 };
  for (const c0 of await store.listCases()) {
    let c = c0;
    if (c.status === 'closed' || c.status === 'merged') continue;
    out.checked++;
    const ev = await svc.evaluateCase(c, { now });
    const prop = { level: ev.badge?.label || '', decision: ev.r.decision, days: (ev.r.days?.away || 0) + (ev.r.days?.restricted || 0) };
    if (JSON.stringify(c.lastProp) !== JSON.stringify(prop)) {
      await jira.setProperty(c.issueKey, 'recordable', { type: 'case', status: c.status, decision: ev.r.decision, est: c.facts?.est || null, recordBy: ev.r.recordBy || null, reportable: Boolean(ev.r.report?.required && !c.report), caseNo: c.log?.caseNo || null }, 'app').catch(() => null);
      c = { ...c, lastProp: prop };
      await store.saveCase(c);
    }
    const post = async (step, body) => {
      if (!(await store.claim(`alert:${c.issueKey}:${step}`))) return;
      await jira.addComment(c.issueKey, body, { who: 'app', internal: true }).catch((e) => console.error('Recordable: alert', c.issueKey, e.message));
      c = svc.record(c, { what: 'alert', detail: step });
      await store.saveCase(c);
      out.posted++;
    };
    const rep = ev.r.report;
    if (rep?.required && !c.report) {
      const left = hoursBetween(ev.nowMs, rep.due);
      const what = rep.events.map((e) => e.label.toLowerCase()).join(' and ');
      if (left < 0) await post('report-overdue', adf.note(`the OSHA report for this ${what} is overdue (it was due ${fmtDateTime(rep.due)} local time, 29 CFR ${rep.cite}).`, ['Report now: the OSHA Area Office, 1-800-321-OSHA (6742), or osha.gov/report. Then record it in the Recordable panel.']));
      else if (left <= 3) await post('report-3h', adf.note(`${Math.max(1, Math.floor(left))} hour${Math.floor(left) === 1 ? '' : 's'} left to report this ${what} to OSHA (due ${fmtDateTime(rep.due)} local time, 29 CFR ${rep.cite}).`));
    }
    if (ev.r.decision === 'recordable' && !c.log && ev.r.recordBy) {
      const d = daysBetween(ev.today, ev.r.recordBy);
      if (d < 0) await post('log-overdue', adf.note(`this recordable case is past the 7-day deadline to enter it on the OSHA 300 log (due ${fmt(ev.r.recordBy)}, 29 CFR 1904.29(b)(3)). Use "Enter on the 300 log" in the Recordable panel.`));
      else if (d <= 2) await post('log-2d', adf.note(`${d === 0 ? 'today is' : `${plural(d, 'day')} left until`} the deadline to enter this recordable case on the OSHA 300 log (${fmt(ev.r.recordBy)}, 29 CFR 1904.29(b)(3)).`));
    }
    if (ev.r.decision === 'needs-info' && ev.r.questions.length && daysBetween(c.facts?.learnedDate || ev.today, ev.today) >= 3) {
      await post('questions-3d', adf.note(`${plural(ev.r.questions.length, 'question')} still open, and the 7-day recording clock is running (decide by ${fmt(ev.r.recordBy)}):`, ev.r.questions.map((q) => `${q.text} (${citeText(q.cite)})`)));
    }
  }
  return out;
}

export async function onSchedule() {
  try {
    console.log('Recordable: alerts', JSON.stringify(await runAlerts()));
  } catch (e) {
    console.error('Recordable: alerts failed', e.message);
  }
}

/** Account IDs Recordable stores: who acted on a case (audit trail) and establishment safety leads. */
export function accountsIn(c) {
  const out = [];
  for (const h of c.history || []) if (h.by) out.push([h.by, h.at]);
  for (const x of [c.log, c.report, c.closed]) if (x?.by) out.push([x.by, c.updatedAt]);
  return out;
}

/** Replace a closed account's ID with null everywhere Recordable keeps it (Forge personal data reporting). */
export function scrubCase(c, closed) {
  let n = 0;
  const strip = (o) => (o?.by && closed.has(o.by) ? (n++, { ...o, by: null, byRemoved: true }) : o);
  const next = { ...c, history: (c.history || []).map(strip), log: strip(c.log), report: strip(c.report), closed: strip(c.closed) };
  return n ? next : null;
}

// Weekly: report stored account IDs and erase the ones Atlassian says are closed.
export async function runPrivacyReport() {
  const [cases, ests] = await Promise.all([store.listCases(), store.listEstablishments()]);
  const latest = new Map();
  const add = (id, at) => {
    if (!id) return;
    const iso = new Date(Number.isFinite(at) ? at : Date.now()).toISOString();
    if (!latest.has(id) || latest.get(id) < iso) latest.set(id, iso);
  };
  for (const c of cases) for (const [id, at] of accountsIn(c)) add(id, at);
  for (const e of ests) add(e.leadAccountId, Date.now());
  const accounts = [...latest.entries()].map(([accountId, updatedAt]) => ({ accountId, updatedAt }));
  if (!accounts.length) return { reported: 0, closed: 0, scrubbed: 0 };
  const closed = new Set();
  for (let i = 0; i < accounts.length; i += 90) {
    const updates = await privacy.reportPersonalData(accounts.slice(i, i + 90));
    for (const u of updates || []) if (u.status === 'closed') closed.add(u.accountId);
  }
  let scrubbed = 0;
  if (closed.size) {
    for (const c of cases) {
      const n = scrubCase(c, closed);
      if (n) { await store.saveCase(n); scrubbed++; }
    }
    for (const e of ests) {
      if (e.leadAccountId && closed.has(e.leadAccountId)) { await store.saveEstablishment({ ...e, leadAccountId: null }); scrubbed++; }
    }
  }
  return { reported: accounts.length, closed: closed.size, scrubbed };
}

export async function onPrivacy() {
  try {
    console.log('Recordable: personal data report', JSON.stringify(await runPrivacyReport()));
  } catch (e) {
    console.error('Recordable: personal data report failed', e.message);
  }
}

// jira:issueContext dynamic properties: the badge on the collapsed "Recordable" section.
export async function contextStatus(payload) {
  const key = payload?.extension?.issue?.key;
  if (!key) return {};
  try {
    const b = await svc.issueBadge(key);
    return b ? { status: { type: 'lozenge', value: b } } : {};
  } catch (e) {
    console.error('Recordable: badge failed', key, e.message);
    return {};
  }
}
