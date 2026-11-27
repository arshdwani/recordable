// Electronic submission to OSHA's Injury Tracking Application (29 CFR 1904.41): who must submit what by March 2,
// and the two CSV files in OSHA's exact formats (docs/LAW.md Appendix A).
import { PARTIALLY_EXEMPT, SUBPART_E_A, SUBPART_E_B, match } from './naics.js';
import { isIsoDate } from './dates.js';
import { estTypeCode } from './establishments.js';
import { BODY_PART } from './catalog.js';

export const HEADERS_300A = ['establishment_name', 'ein', 'company_name', 'street_address', 'city', 'state', 'zip', 'naics_code', 'industry_description', 'size', 'establishment_type', 'year_filing_for', 'annual_average_employees', 'total_hours_worked', 'no_injuries_illnesses', 'total_deaths', 'total_dafw_cases', 'total_djtr_cases', 'total_other_cases', 'total_dafw_days', 'total_djtr_days', 'total_injuries', 'total_skin_disorders', 'total_respiratory_conditions', 'total_poisonings', 'total_hearing_loss', 'total_other_illnesses', 'change_reason'];
export const HEADERS_CASES = ['establishment_name', 'year_of_filing', 'case_number', 'job_title', 'date_of_incident', 'incident_location', 'incident_description', 'incident_outcome', 'dafw_num_away', 'djtr_num_tr', 'type_of_incident', 'date_of_birth', 'date_of_hire', 'sex', 'treatment_facility_type', 'treatment_in_patient', 'time_started_work', 'time_of_incident', 'time_unknown', 'nar_before_incident', 'nar_what_happened', 'nar_injury_illness', 'nar_object_substance', 'date_of_death'];

/** ITA size code from the most employees at any one time in the year: 1 (<20), 21 (20-99), 22 (100-249), 3 (250+). */
export const sizeCode = (peak) => (peak >= 250 ? '3' : peak >= 100 ? '22' : peak >= 20 ? '21' : '1');

/**
 * What an establishment must submit for `year`, due March 2 of the next year.
 * Returns { exempt, submit300A, submitCases, due, reasons: [{ text, cite }] }.
 */
export function requirement(est = {}, { peak, year }) {
  const due = `${Number(year) + 1}-03-02`;
  const reasons = [];
  const exempt = match(PARTIALLY_EXEMPT, est.naics);
  if (!est.naics) return { unknown: true, due, reasons: [{ text: 'Add the 6-digit NAICS code to see what this establishment must submit.', cite: '1904.41' }] };
  if (exempt) {
    return { exempt: true, submit300A: false, submitCases: false, due, reasons: [{ text: `NAICS ${est.naics} falls under ${exempt.code} ${exempt.name}, a partially exempt industry: no routine OSHA log or electronic submission (severe injuries must still be reported under 1904.39).`, cite: '1904.2(a)(1), 1904.41(b)(6)' }] };
  }
  if (!Number.isFinite(Number(peak)) || peak === null || peak === undefined) return { unknown: true, due, reasons: [{ text: `Enter the most employees at any one time in ${year} (count every person: full-time, part-time, seasonal, temporary).`, cite: '1904.41(b)(2)' }] };
  const a = match(SUBPART_E_A, est.naics);
  const b = match(SUBPART_E_B, est.naics);
  let submit300A = false;
  let submitCases = false;
  if (peak >= 250) {
    submit300A = true;
    reasons.push({ text: `${peak} employees at peak (250 or more) in an industry that keeps records: submit the Form 300A data.`, cite: '1904.41(a)(1)(ii)' });
  } else if (peak >= 20 && a) {
    submit300A = true;
    reasons.push({ text: `${peak} employees at peak (20 to 249) and NAICS ${est.naics} is in Appendix A to Subpart E (${a.code} ${a.name}): submit the Form 300A data.`, cite: '1904.41(a)(1)(i)' });
  }
  if (peak >= 100 && b) {
    submitCases = true;
    submit300A = true;
    reasons.push({ text: `${peak} employees at peak (100 or more) and NAICS ${est.naics} is in Appendix B to Subpart E (${b.code} ${b.name}): also submit the Form 300 and 301 case data.`, cite: '1904.41(a)(2)' });
  }
  if (!submit300A) reasons.push({ text: peak < 20 ? `${peak} employees at peak (under 20): no routine electronic submission. Keep the log and post the 300A.` : `NAICS ${est.naics} isn't in Appendix A to Subpart E and the peak is under 250: no routine electronic submission. Keep the log and post the 300A.`, cite: '1904.41(a)(1)' });
  return { exempt: false, submit300A, submitCases, due, reasons };
}

const q = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (headers, rows) => [headers.join(','), ...rows.map((r) => headers.map((h) => q(r[h])).join(','))].join('\r\n') + '\r\n';
const mdy = (iso) => (isIsoDate(iso) ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : '');
const digits = (s) => String(s || '').replace(/\D/g, '');

/** The Form 300A (establishment and summary) CSV, one row per establishment. */
export function csv300A(items) {
  return csv(HEADERS_300A, items.map(({ est, year, t, avgEmployees, hours, peak }) => ({
    establishment_name: est.name,
    ein: digits(est.ein).padStart(9, '0').slice(-9),
    company_name: est.company || '',
    street_address: est.street || '',
    city: est.city || '',
    state: est.state || '',
    zip: digits(est.zip),
    naics_code: digits(est.naics),
    industry_description: est.industry || '',
    size: sizeCode(Number(peak) || 0),
    establishment_type: estTypeCode(est.estType),
    year_filing_for: year,
    annual_average_employees: avgEmployees ?? '',
    total_hours_worked: hours ?? '',
    no_injuries_illnesses: t.G + t.H + t.I + t.J > 0 ? 1 : 2,
    total_deaths: t.G, total_dafw_cases: t.H, total_djtr_cases: t.I, total_other_cases: t.J,
    total_dafw_days: t.K, total_djtr_days: t.L,
    total_injuries: t.M1, total_skin_disorders: t.M2, total_respiratory_conditions: t.M3, total_poisonings: t.M4, total_hearing_loss: t.M5, total_other_illnesses: t.M6,
    change_reason: '',
  })));
}

const OUTCOME_CODE = { death: 1, away: 2, restricted: 3, other: 4 };
const TYPE_CODE = { injury: 1, skin: 2, respiratory: 3, poisoning: 4, hearing: 5, other: 6 };

/** Remove what must never be submitted from free text: the employee's name, emails, phone numbers, SSNs (1904.41(b)(9)). */
export function scrub(text, names = []) {
  let s = String(text || '');
  for (const n of names.filter((x) => x && x.trim().length > 1)) {
    for (const part of [n.trim(), ...n.trim().split(/\s+/).filter((p) => p.length > 2)]) s = s.replace(new RegExp(`\\b${part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), 'the employee');
  }
  return s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email removed]').replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[removed]').replace(/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g, '[phone removed]').replace(/(the employee)( the employee)+/g, '$1');
}

/**
 * The Form 300/301 case CSV. `rows` are log rows (core/log.js) with their case and portal answers:
 * [{ est, year, row, c, r, portal }]. Returns { text, problems: [sentence] } (missing required values).
 */
export function csvCases(items) {
  const problems = [];
  const rows = items.map(({ est, year, row, c, r, portal = {} }) => {
    const f = c.facts || {};
    const names = [portal.employee];
    const need = (v, what) => { if (!v) problems.push(`${row.caseNo} (${c.issueKey}): ${what} is missing. Add it on the request's form answers, then generate again.`); return v || ''; };
    return {
      establishment_name: est.name,
      year_of_filing: year,
      case_number: row.caseNo,
      job_title: need(portal.jobTitle, 'job title'),
      date_of_incident: mdy(f.incidentDate),
      incident_location: need(scrub(portal.where, names), 'where the event occurred'),
      incident_description: scrub(row.describe, names).slice(0, 255),
      incident_outcome: OUTCOME_CODE[r.outcome],
      dafw_num_away: r.outcome === 'away' ? row.away : 0,
      djtr_num_tr: ['away', 'restricted'].includes(r.outcome) ? row.restricted : 0,
      type_of_incident: TYPE_CODE[r.type],
      date_of_birth: need(mdy(portal.dob), 'date of birth'),
      date_of_hire: need(mdy(portal.hired), 'date hired'),
      sex: '',
      treatment_facility_type: f.hospital === 'er' || f.hospital === 'inpatient' ? 1 : 0,
      treatment_in_patient: f.hospital === 'inpatient' ? 1 : 0,
      time_started_work: f.startTime || '',
      time_of_incident: f.incidentTime || '',
      time_unknown: f.incidentTime ? '' : 1,
      nar_before_incident: need(scrub(portal.doing, names), 'what the employee was doing'),
      nar_what_happened: need(scrub(portal.happened, names), 'what happened'),
      nar_injury_illness: scrub([portal.injury, BODY(f.bodyPart)].filter(Boolean).join(', '), names) || need('', 'the injury and body part'),
      nar_object_substance: scrub(portal.object, names),
      date_of_death: r.outcome === 'death' ? mdy(f.deathDate) : '',
    };
  });
  return { text: csv(HEADERS_CASES, rows), problems };
}
const BODY = (code) => BODY_PART[code]?.label?.toLowerCase() || '';
