// The OSHA 300 log and 300A summary for one establishment and year, computed from the cases (never stored, so a
// changed fact or day count shows up on the log at once), plus incidence rates and the ITA cross-field checks.
import { BODY_PART, TYPE, TYPES } from './catalog.js';
import { isIsoDate } from './dates.js';

const md = (iso) => (isIsoDate(iso) ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}` : '');

/**
 * One Form 300 row per case. `entries` = [{ c, r, portal }]: the case, its evaluation, and the portal answers read
 * from Jira for this document only (names are never stored by Recordable).
 */
export function logRows(entries) {
  return entries
    .filter((e) => e.c.log)
    .sort((a, b) => String(a.c.log.caseNo).localeCompare(String(b.c.log.caseNo)))
    .map(({ c, r, portal = {} }) => {
      const privacy = (r.privacy || []).length > 0;
      const intimate = (r.privacy || []).some((p) => ['intimate', 'assault', 'mental'].includes(p.code));
      const part = BODY_PART[c.facts?.bodyPart]?.label || '';
      const lower = (x) => (x && !/^[A-Z]{2}/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x);
      const what = [portal.injury, part && !intimate ? part.toLowerCase() : '', portal.object ? `from ${lower(portal.object)}` : ''].filter(Boolean).join(', ');
      return {
        caseNo: c.log.caseNo,
        issueKey: c.issueKey,
        name: privacy ? 'Privacy case' : portal.employee || '(name on the request)',
        jobTitle: portal.jobTitle || '',
        date: md(c.facts?.incidentDate),
        incidentDate: c.facts?.incidentDate || null,
        where: portal.where || '',
        // Privacy cases are described with discretion (29 CFR 1904.29(b)(9)).
        describe: intimate ? `${TYPE[r.type]?.label || 'Injury'} (privacy case)` : what || `${TYPE[r.type]?.label || 'Injury'}${part ? `, ${part.toLowerCase()}` : ''}`,
        outcome: r.outcome,
        outcomeCol: r.outcomeCol,
        away: r.outcome === 'death' ? 0 : r.days?.away || 0,
        restricted: r.outcome === 'death' ? 0 : r.days?.restricted || 0,
        ongoing: Boolean(r.days?.awayOngoing || r.days?.restrictedOngoing),
        capped: Boolean(r.days?.capped),
        type: r.type,
        typeCol: TYPE[r.type]?.col,
        privacy,
      };
    });
}

/** Form 300A totals from the log rows. */
export function totals(rows) {
  const t = { G: 0, H: 0, I: 0, J: 0, K: 0, L: 0, M1: 0, M2: 0, M3: 0, M4: 0, M5: 0, M6: 0, cases: rows.length };
  for (const r of rows) {
    t[r.outcomeCol] = (t[r.outcomeCol] || 0) + 1;
    t.K += r.away;
    t.L += r.restricted;
    t[r.typeCol] = (t[r.typeCol] || 0) + 1;
  }
  return t;
}

const round2 = (x) => Math.round(x * 100) / 100;
/**
 * Incidence rates per 100 full-time workers (200,000 hours = 100 employees x 40 hours x 50 weeks).
 * Total recordable case rate uses H + I + J (deaths, G, are excluded: OSHA forms package, BLS); DART uses H + I.
 */
export function rates(t, hours) {
  if (!hours || hours <= 0) return { trc: null, dart: null, hours: hours || 0 };
  return { trc: round2(((t.H + t.I + t.J) * 200000) / hours), dart: round2(((t.H + t.I) * 200000) / hours), hours };
}

/** The ITA's cross-field checks on a 300A (docs/LAW.md Appendix A.1), as sentences. */
export function summaryChecks(t, { avgEmployees, hours } = {}) {
  const out = [];
  const cases = t.G + t.H + t.I + t.J;
  const types = t.M1 + t.M2 + t.M3 + t.M4 + t.M5 + t.M6;
  if (cases !== types) out.push(`Cases by outcome (${cases}) and by type (${types}) must match.`);
  if (!avgEmployees) out.push('Enter the annual average number of employees.');
  if (!hours) out.push('Enter the total hours worked by all employees.');
  if (avgEmployees && hours && hours / avgEmployees >= 8760) out.push('Hours divided by average employees must be under 8,760.');
  if (avgEmployees && hours && hours / avgEmployees <= 500) out.push('Hours divided by average employees should be over 500: check both numbers.');
  if (avgEmployees && avgEmployees <= cases) out.push('Average employees should be more than the number of cases.');
  if (t.H > 0 && t.K === 0) out.push('Cases with days away (H) need days away (K).');
  if (t.K > 0 && t.H === 0) out.push('Days away (K) need a days-away case (H).');
  if (t.K < t.H) out.push('Days away (K) must be at least the number of days-away cases (H).');
  if (t.I > 0 && t.L === 0) out.push('Job transfer or restriction cases (I) need days (L).');
  if (t.L > 0 && t.H + t.I === 0) out.push('Days of transfer or restriction (L) need an H or I case.');
  return out;
}

export const TYPE_COLS = TYPES.map((x) => x.col);
