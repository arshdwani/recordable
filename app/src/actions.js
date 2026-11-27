// Rovo agent actions. Every result carries an explicit `source`, so the agent never invents provenance. Reads are GET
// actions; changes (logging a case, recording days) are UPDATE actions, which Rovo asks the user to confirm first.
import * as svc from './service.js';
import * as store from './store.js';
import { evaluate } from './core/engine.js';
import { detectFacts } from './core/intake.js';
import { citeText } from './core/catalog.js';
import { today as todayIso, fmt, yearOf, isIsoDate, addDays } from './core/dates.js';
import { friendly } from './errors.js';

const RULES_SOURCE = { title: 'Recordable rules engine: 29 CFR Part 1904 (eCFR), OSHA recordkeeping FAQs', url: 'https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1904' };
const CASES_SOURCE = (keys = []) => ({ title: `Recordable cases in Jira Service Management${keys.length ? ` (${keys.slice(0, 10).join(', ')})` : ''}`, url: keys.length === 1 ? `/browse/${keys[0]}` : null });
const fail = (e) => ({ error: friendly(e), source: null });
const keyOf = (v) => String(v || '').trim().toUpperCase();
const who = (ctx) => ctx?.principal?.accountId || null;
const steps = (r) => r.steps.filter((s) => ['yes', 'no', 'first-aid', 'privacy', 'note'].includes(s.result)).map((s) => `${s.text} [${citeText(s.cite)}]`);

const decisionOut = (r) => ({
  decision: { recordable: 'Recordable', 'not-recordable': 'Not recordable', 'needs-info': 'Cannot decide yet: questions below', 'existing-case': 'Not a new case: update the earlier case' }[r.decision],
  summary: r.summary,
  outcome: r.outcomeLabel ? `${r.outcomeLabel} (Form 300 column ${r.outcomeCol})` : null,
  type: r.decision === 'recordable' ? `${r.typeLabel} (column ${r.typeCol})` : null,
  reasons: steps(r),
  questions: r.questions.map((q) => `${q.text} [${citeText(q.cite)}]`),
  privacyCase: r.privacy?.length ? r.privacy.map((p) => `${p.label} [${citeText(p.cite)}]`) : null,
  reportToOsha: r.report?.required ? `${r.report.events.map((e) => e.label).join(' and ')}: report within ${r.report.hours} hours [${citeText(r.report.cite)}]` : null,
});

/** "Is this recordable?" From a request key, or from a description of what happened. */
export async function checkRecordable(payload) {
  try {
    const key = keyOf(payload?.issueKey);
    if (key) {
      const c = await store.getCase(key);
      if (!c) return { error: `${key} isn't a Recordable case. Ask about what happened instead, or open the request and use "Treat as an injury or illness".`, source: null };
      const ev = await svc.evaluateCase(c);
      return { request: key, ...decisionOut(ev.r), recordBy: ev.r.recordBy ? fmt(ev.r.recordBy) : null, onLog: c.log?.caseNo || null, source: { ...RULES_SOURCE, case: CASES_SOURCE([key]) } };
    }
    const text = String(payload?.description || '').trim();
    if (!text) return { error: 'Describe what happened: the injury, the treatment given, and any days away or restricted work.', source: null };
    const { facts, matched } = detectFacts(text);
    const assumptions = [];
    const wr = String(payload?.workRelated || '').toLowerCase();
    if (/^(no|false)$/.test(wr)) facts.workRelated = 'no';
    else if (!facts.exception) {
      facts.workRelated = 'yes';
      assumptions.push('It happened in the work environment, so it is presumed work-related [29 CFR 1904.5(a)]. Say so if it did not.');
    }
    facts.prior = 'none';
    facts.incidentDate = todayIso();
    facts.type = facts.type || 'injury';
    const r = evaluate(facts, { today: todayIso() });
    return { ...decisionOut(r), recognized: matched, assumptions, source: RULES_SOURCE };
  } catch (e) {
    return fail(e);
  }
}

/** Total recordable case rate and DART rate per establishment (or one establishment). */
export async function getRates(payload) {
  try {
    const year = Number(payload?.year) || yearOf(todayIso());
    const q = String(payload?.establishment || '').trim().toLowerCase();
    const cases = await store.listCases();
    let rows = await svc.establishmentYears(year, cases);
    if (q) {
      const words = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
      const hit = rows.filter((e) => words.every((w) => `${e.name} ${e.objectKey || ''} ${e.city}`.toLowerCase().includes(w)));
      rows = hit.length ? hit : rows.filter((e) => words.some((w) => w.length > 1 && /\d/.test(w) && e.name.toLowerCase().includes(w)));
      if (!rows.length) return { error: `No establishment matches "${payload.establishment}". Establishments: ${(await svc.establishmentYears(year, cases)).map((e) => e.name).join(', ')}.`, source: null };
    }
    return {
      year,
      formula: 'Total recordable case rate = (H + I + J) x 200,000 / hours worked; DART = (H + I) x 200,000 / hours worked. 200,000 = 100 full-time workers x 40 hours x 50 weeks. Deaths (G) are not in the total recordable case rate.',
      establishments: rows.map((e) => ({
        establishment: e.name,
        totalRecordableCaseRate: e.rates.trc,
        dartRate: e.rates.dart,
        cases: { daysAway: e.t.H, restrictedOrTransfer: e.t.I, other: e.t.J, deaths: e.t.G },
        hoursWorked: e.hours,
        note: e.hours ? (year === yearOf(todayIso()) ? `Year to date, on the hours entered so far for ${year}.` : null) : `No hours worked entered for ${year}, so no rate.`,
      })),
      source: { title: `Recordable OSHA 300 logs for ${year} (computed from the logged cases and the hours entered in Recordable)`, url: null },
    };
  } catch (e) {
    return fail(e);
  }
}

/** Open cases: OSHA reports due, cases to log, open questions, running day counts. */
export async function getOpenCases(payload) {
  try {
    const b = await svc.getBoard({ light: true });
    const q = String(payload?.establishment || '').trim().toLowerCase();
    const pick = (list) => list.filter((r) => !q || r.est.toLowerCase().includes(q));
    const line = (r) => ({ request: r.issueKey, establishment: r.est, date: r.incidentDate, decision: r.decision, status: r.badge?.label, summary: r.summary, recordBy: r.recordBy, caseNumber: r.caseNo });
    const alerts = pick(b.alerts);
    const open = pick(b.open);
    return {
      today: b.today,
      reportToOsha: alerts.map((r) => ({ request: r.issueKey, establishment: r.est, events: r.report.kinds, dueLocalTime: r.report.dueText, hoursLeft: Math.round(r.report.hoursLeft * 10) / 10, citation: '29 CFR 1904.39' })),
      toEnterOnLog: open.filter((r) => r.decision === 'recordable').map(line),
      needAnswers: open.filter((r) => r.decision === 'needs-info').map(line),
      stillAway: pick(b.logged).filter((r) => r.days?.awayOngoing || r.days?.restrictedOngoing).map((r) => ({ request: r.issueKey, caseNumber: r.caseNo, daysAway: r.days.away, daysRestricted: r.days.restricted, capped: r.days.capped })),
      source: CASES_SOURCE([...alerts, ...open].map((r) => r.issueKey)),
    };
  } catch (e) {
    return fail(e);
  }
}

/** Enter a recordable case on its establishment's 300 log (attaches the Form 301 equivalent). */
export async function logCaseAction(payload, context) {
  try {
    const r = await svc.logCase({ issueKey: keyOf(payload?.issueKey), accountId: who(context) });
    return { ...r, request: keyOf(payload?.issueKey), source: CASES_SOURCE([keyOf(payload?.issueKey)]) };
  } catch (e) {
    return fail(e);
  }
}

/** Record days away or restricted: a count, or the date the employee came back or went back to full duty. */
export async function recordDays(payload, context) {
  try {
    const key = keyOf(payload?.issueKey);
    const patch = {};
    const n = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
    if (n(payload?.daysAway) !== undefined) patch['away.days'] = n(payload.daysAway);
    if (n(payload?.daysRestricted) !== undefined) patch['restricted.days'] = n(payload.daysRestricted);
    if (isIsoDate(payload?.backAtWorkOn)) patch['away.to'] = payload.backAtWorkOn;
    if (isIsoDate(payload?.fullDutyOn)) patch['restricted.to'] = payload.fullDutyOn;
    if (!Object.keys(patch).length) return { error: 'Give a number of days away or restricted, or the date the employee came back (YYYY-MM-DD).', source: null };
    const c = await store.getCase(key);
    const dayAfter = c?.facts?.incidentDate ? addDays(c.facts.incidentDate, 1) : null;
    if (patch['away.to'] && !c?.facts?.away?.from && dayAfter) patch['away.from'] = dayAfter;
    if (patch['restricted.to'] && !c?.facts?.restricted?.from && dayAfter) patch['restricted.from'] = dayAfter;
    const r = await svc.updateFacts({ issueKey: key, patch, accountId: who(context) });
    const ev = await svc.evaluateCase(await store.getCase(key));
    return { ...r, request: key, daysAway: ev.r.days?.away ?? 0, daysRestricted: ev.r.days?.restricted ?? 0, outcome: ev.r.outcomeLabel || null, note: ev.r.days?.capped ? 'Counting stops at 180 days in total [29 CFR 1904.7(b)(3)(vii)].' : null, source: CASES_SOURCE([key]) };
  } catch (e) {
    return fail(e);
  }
}

