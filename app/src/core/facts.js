// Edits to a case's coded facts from the request panel, the question answers and Rovo. Every field is checked against
// its closed list or type; anything else is refused with a sentence people can act on.
import { TREATMENT, EXCEPTION, TYPE, BODY_PART, DIAGNOSIS, MEDS } from './catalog.js';
import { isIsoDate, isTime } from './dates.js';

const TRI = ['yes', 'no', 'unknown'];
const oneOf = (vals) => (v) => (vals.includes(v) ? v : bad);
const bad = Symbol('bad');
const date = (v) => (v === null || v === '' ? null : isIsoDate(v) ? v : bad);
const time = (v) => (v === null || v === '' ? null : isTime(v) ? v : bad);
const bool = (v) => (v === true || v === 'yes' || v === 'true' ? true : v === false || v === 'no' || v === 'false' || v === null ? false : bad);
const count = (v) => (v === null || v === '' ? null : Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 999 ? Number(v) : bad);
const db = (v) => (v === null || v === '' ? null : Number.isFinite(Number(v)) && Number(v) >= -20 && Number(v) <= 130 ? Number(v) : bad);
const codes = (table) => (v) => {
  const l = (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
  return l.every((c) => table[c]) ? [...new Set(l)] : bad;
};

// field path -> [checker, message when refused]
export const FIELDS = {
  incidentDate: [date, 'Pick the date of the injury or illness.'],
  incidentTime: [time, 'Time as HH:MM, e.g. 14:30.'],
  learnedDate: [date, 'Pick the date you learned of it.'],
  learnedTime: [time, 'Time as HH:MM, e.g. 14:30.'],
  est: [(v) => (v ? String(v) : bad), 'Choose the establishment.'],
  type: [oneOf(Object.keys(TYPE)), 'Choose injury or one of the illness types.'],
  bodyPart: [oneOf(Object.keys(BODY_PART)), 'Choose the body part.'],
  workRelated: [oneOf(TRI), 'Work-related: yes, no or unknown.'],
  exception: [(v) => (v === null || v === '' ? null : EXCEPTION[v] ? v : bad), 'Choose one of the 1904.5(b)(2) exceptions.'],
  foodSource: [(v) => (v === null || v === '' ? null : ['contaminated', 'employer', 'own'].includes(v) ? v : bad), 'Food source: contaminated, employer or own.'],
  mentalOpinion: [bool, 'Yes or no.'],
  aggravation: [bool, 'Yes or no.'],
  prior: [oneOf(['none', 'recovered', 'not-recovered', 'unknown']), 'Earlier case: none, recovered, not recovered or unknown.'],
  priorKey: [(v) => (v === null || v === '' ? null : /^[A-Z][A-Z0-9_]*-\d+$/.test(String(v).toUpperCase()) ? String(v).toUpperCase() : bad), 'Earlier case: a work item key like HR-12.'],
  death: [bool, 'Yes or no.'],
  deathDate: [date, 'Pick the date of death.'],
  deathTime: [time, 'Time as HH:MM.'],
  'away.days': [count, 'Days away: a whole number from 0.'],
  'away.from': [date, 'Pick the first day away.'],
  'away.to': [date, 'Pick the day the employee came back.'],
  'away.recommended': [bool, 'Yes or no.'],
  'restricted.days': [count, 'Restricted days: a whole number from 0.'],
  'restricted.from': [date, 'Pick the first restricted day.'],
  'restricted.to': [date, 'Pick the day full duty resumed.'],
  'restricted.transfer': [bool, 'Yes or no.'],
  'restricted.recommended': [bool, 'Yes or no.'],
  'restricted.injuryDayOnly': [bool, 'Yes or no.'],
  treatments: [codes(TREATMENT), 'Choose treatments from the list.'],
  noTreatment: [bool, 'Yes or no.'],
  'med.drug': [(v) => (v === null || v === '' ? null : MEDS[v] || v === 'other' ? v : bad), 'Medicine: ibuprofen, naproxen, diphenhydramine, ketoprofen or other.'],
  'med.doseMg': [(v) => (v === null || v === '' ? null : Number(v) > 0 && Number(v) < 5000 ? Number(v) : bad), 'Dose in mg, e.g. 800.'],
  'med.by': [oneOf(['physician', 'self', 'other', 'unknown']), 'Who recommended it: physician, self or other.'],
  'med.rxStrength': [oneOf(TRI), 'Yes or no.'],
  'med.labelMg': [(v) => (v === null || v === '' ? null : Number(v) > 0 && Number(v) < 5000 ? Number(v) : bad), 'Label single dose in mg, e.g. 200.'],
  refused: [bool, 'Yes or no.'],
  'removal.chemical': [bool, 'Yes or no.'],
  loc: [bool, 'Yes or no.'],
  diagnoses: [codes(DIAGNOSIS), 'Choose diagnoses from the list.'],
  special: [(v) => (v === null || v === '' ? null : ['needlestick', 'removal', 'hearing', 'tb'].includes(v) ? v : bad), 'Specific case: needlestick, removal, hearing or tb.'],
  'sharps.contaminated': [oneOf(TRI), 'Yes, no or unknown.'],
  'sharps.seroconverted': [bool, 'Yes or no.'],
  'removal.voluntary': [bool, 'Yes or no.'],
  'removal.standard': [(v) => String(v || '').slice(0, 40), ''],
  'hearing.shiftDb': [db, 'Shift in dB, e.g. 12.'],
  'hearing.totalDb': [db, 'Hearing level in dB, e.g. 31.'],
  'hearing.ageAdjusted': [bool, 'Yes or no.'],
  'hearing.retest': [(v) => (v === null || v === '' ? null : ['pending', 'confirmed', 'not-confirmed'].includes(v) ? v : bad), 'Retest: pending, confirmed or not-confirmed.'],
  'tb.infection': [oneOf(TRI), 'Yes, no or unknown.'],
  'tb.exception': [(v) => (v === null || v === '' ? null : ['household', 'public-health', 'investigation', 'preemployment'].includes(v) ? v : bad), 'TB exception: household, public-health, investigation or preemployment.'],
  assault: [bool, 'Yes or no.'],
  privacyRequested: [bool, 'Yes or no.'],
  hospital: [oneOf(['none', 'er', 'inpatient', 'observation']), 'Hospital: none, er, inpatient or observation.'],
  hospitalDate: [date, 'Pick the admission date.'],
  hospitalTime: [time, 'Time as HH:MM.'],
  amputation: [bool, 'Yes or no.'],
  eyeLoss: [bool, 'Yes or no.'],
  vehicle: [oneOf(['none', 'public-road', 'work-zone', 'public-transport']), 'Vehicle: none, public-road, work-zone or public-transport.'],
};

/** Apply { 'path': value } edits. Returns { facts, changed: [paths] } or throws Error(message) on a refused value. */
export function applyPatch(facts = {}, patch = {}) {
  const next = JSON.parse(JSON.stringify(facts || {}));
  const changed = [];
  for (const [path, raw] of Object.entries(patch || {})) {
    const spec = FIELDS[path];
    if (!spec) throw new Error(`Recordable doesn't know the field "${path}".`);
    let v = spec[0](raw);
    if (v === bad) throw new Error(spec[1] || `That value doesn't fit ${path}.`);
    const parts = path.split('.');
    let o = next;
    for (const p of parts.slice(0, -1)) o = o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {};
    const k = parts[parts.length - 1];
    if (JSON.stringify(o[k]) !== JSON.stringify(v)) changed.push(path);
    if (v === null || v === undefined) delete o[k];
    else o[k] = v;
  }
  // Coherence: an exception means the work-relatedness question is answered; dates override counts.
  if (patch.exception) next.workRelated = 'no';
  if (patch.workRelated === 'yes' || patch.workRelated === 'unknown') delete next.exception;
  for (const s of ['away', 'restricted']) if (next[s]?.from && patch[`${s}.from`]) delete next[s].days;
  if (patch['away.days'] !== undefined && next.away) { delete next.away.from; delete next.away.to; }
  if (patch['restricted.days'] !== undefined && next.restricted) { delete next.restricted.from; delete next.restricted.to; }
  if (patch.treatments && next.treatments?.length) delete next.noTreatment;
  return { facts: next, changed };
}

/** An answer to an engine question -> a patch. `answer` is the chosen option or the typed value. */
export function answerPatch(q, answer) {
  if (q.field === 'workRelated' && answer === 'exception') return null; // the panel opens the exception picker instead
  if (q.field === 'days') {
    const a = answer || {};
    return { 'away.days': a.away ?? 0, 'restricted.days': a.restricted ?? 0 };
  }
  if (q.field === 'treatments') return { treatments: answer, ...(Array.isArray(answer) && !answer.length ? { noTreatment: true } : {}) };
  return { [q.field]: answer };
}
