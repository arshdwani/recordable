// The recordability engine for 29 CFR Part 1904. Pure and deterministic: the same facts always give the same decision,
// every step cites the paragraph it applies, and a fact the rules need but the case doesn't have becomes a question,
// never a guess. Details and sources: docs/LAW.md.
import {
  TREATMENT, MEDS, MED_SOURCE, EXCEPTION, TYPE, OUTCOMES, DIAGNOSIS, PRIVACY_REASONS, SEVERE, BODY_PART,
} from './catalog.js';
import { addDays, daysBetween, isIsoDate, atMs, addHours, hoursBetween, today as todayIso, fmt } from './dates.js';

export const DAY_CAP = 180;
const BLOCKING = ['incidentDate', 'workRelated', 'prior'];
export const RECORD_WITHIN_DAYS = 7;

const yes = (v) => v === true || v === 'yes';
const no = (v) => v === false || v === 'no';
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

// ---- Days away and restricted ------------------------------------------------------------------------------
/**
 * Calendar days in a stretch that starts after the day of injury. `from` is the first day away (or restricted), `to`
 * the day the employee came back (not counted), or null while it continues (counted through `today`).
 * A count entered directly wins over dates.
 */
export function stretchDays(s, incidentDate, today) {
  if (!s) return { days: 0, ongoing: false };
  const n = num(s.days);
  if (n !== null && !s.from) return { days: Math.max(0, Math.round(n)), ongoing: false, entered: true };
  if (!isIsoDate(s.from)) return { days: 0, ongoing: false };
  const start = isIsoDate(incidentDate) && s.from <= incidentDate ? addDays(incidentDate, 1) : s.from; // 1904.7(b)(3)(i)
  const end = isIsoDate(s.to) ? addDays(s.to, -1) : today;
  const days = end < start ? 0 : daysBetween(start, end) + 1;
  return { days, ongoing: !isIsoDate(s.to), from: start, to: s.to || null };
}

/** Days away (column K) and restricted or transferred (column L), with the 180-day cap on their total. */
export function countDays(f, today = todayIso()) {
  const away = stretchDays(f.away, f.incidentDate, today);
  const restr = f.restricted?.injuryDayOnly ? { days: 0, ongoing: false } : stretchDays(f.restricted, f.incidentDate, today);
  const awayDays = Math.min(away.days, DAY_CAP);
  const restrictedDays = Math.min(restr.days, DAY_CAP - awayDays);
  return {
    away: awayDays,
    restricted: restrictedDays,
    capped: away.days + restr.days > DAY_CAP,
    rawAway: away.days,
    rawRestricted: restr.days,
    awayOngoing: away.ongoing && awayDays > 0,
    restrictedOngoing: restr.ongoing && restrictedDays > 0,
  };
}

// ---- Medication: 1904.7(b)(5)(ii)(A) -----------------------------------------------------------------------
/**
 * A non-prescription medicine: first aid, unless a physician or other licensed health care professional recommended a
 * single dose greater than the single dose on the OTC label (prescription strength; OSHA FAQ 7-8).
 */
export function medication(med) {
  if (!med || !med.drug) return null;
  const m = MEDS[med.drug];
  const name = m ? m.label.replace(/ \(.*\)$/, '').toLowerCase() : 'the medicine';
  const dose = num(med.doseMg);
  const labelMg = num(med.labelMg) ?? m?.labelMg ?? null;
  const by = med.by || 'unknown';
  const CITE = '1904.7(b)(5)(ii)(A)';
  if (by === 'self' || by === 'other') {
    return { kind: 'first-aid', text: `Non-prescription ${name}${dose ? ` (${dose} mg)` : ''} without a recommendation from a physician or other licensed health care professional is first aid.`, cite: CITE };
  }
  if (med.rxStrength === 'yes' && by === 'physician') return { kind: 'medical', text: `A physician or other licensed health care professional recommended ${name} at prescription strength: medical treatment.`, cite: CITE, source: MED_SOURCE };
  if (med.rxStrength === 'no' && by === 'physician') return { kind: 'first-aid', text: `A physician or other licensed health care professional recommended ${name} at the label's strength: first aid.`, cite: CITE, source: MED_SOURCE };
  if (dose === null) {
    return { question: { id: 'med.doseMg', field: 'med.doseMg', input: 'number', text: `What single dose of ${name} was recommended (mg)?${labelMg ? ` More than ${labelMg} mg, the single dose on the OTC label, is prescription strength.` : ''}`, cite: CITE, source: MED_SOURCE } };
  }
  if (labelMg === null) {
    return { question: { id: 'med.labelMg', field: 'med.labelMg', input: 'number', text: `What single dose does the ${name} label give (mg)? A recommended dose above it is prescription strength.`, cite: CITE, source: MED_SOURCE } };
  }
  const strong = dose > labelMg;
  const legacy = m?.legacyMg && m.legacyMg !== labelMg ? ` (The cancelled 2004 guidance used more than ${m.legacyMg} mg.)` : '';
  if (!strong) return { kind: 'first-aid', text: `${cap(name)} ${dose} mg is not more than the ${labelMg} mg single dose on the OTC label: non-prescription strength, first aid.${legacy}`, cite: CITE, source: MED_SOURCE };
  if (by === 'physician') return { kind: 'medical', text: `${cap(name)} ${dose} mg is more than the ${labelMg} mg single dose on the OTC label (prescription strength), and a physician or other licensed health care professional recommended it: medical treatment.${legacy}`, cite: CITE, source: MED_SOURCE };
  return { question: { id: 'med.by', field: 'med.by', text: `${cap(name)} ${dose} mg is more than the ${labelMg} mg single dose on the OTC label. Did a physician or other licensed health care professional recommend it?`, cite: CITE, options: BY_OPTIONS, source: MED_SOURCE } };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
export const BY_OPTIONS = [
  { value: 'physician', label: 'A physician or other licensed health care professional' },
  { value: 'self', label: 'The employee, on their own' },
  { value: 'other', label: 'A supervisor or first-aider' },
];

// ---- Privacy concern cases: 1904.29(b)(7) --------------------------------------------------------------------
export function privacyReasons(f, type) {
  const out = [];
  if (f.bodyPart === 'intimate') out.push('intimate');
  if (yes(f.assault)) out.push('assault');
  if (f.bodyPart === 'mind') out.push('mental');
  if (f.special === 'tb' || ['hiv', 'hepatitis'].includes(f.infection)) out.push('infection');
  if (f.special === 'needlestick' && yes(f.sharps?.contaminated)) out.push('sharps');
  if (type !== 'injury' && yes(f.privacyRequested)) out.push('request');
  return out.map((code) => ({ code, ...PRIVACY_REASONS[code] }));
}

// ---- Reporting to OSHA: 1904.39 -----------------------------------------------------------------------------
/**
 * The severe events that must be reported, the earliest deadline and the exceptions that apply. Times are
 * establishment wall-clock ms (see dates.atMs). `workRelated` false means nothing to report.
 */
export function reportability(f, { workRelated = 'yes' } = {}) {
  if (workRelated === 'no') return null;
  const incidentAt = atMs(f.incidentDate, f.incidentTime);
  const learnedAt = isIsoDate(f.learnedDate) ? atMs(f.learnedDate, f.learnedTime) : incidentAt;
  const events = [];
  const notes = [];
  const add = (kind, at, extra = {}) => {
    const s = SEVERE[kind];
    const at0 = Number.isFinite(at) ? at : incidentAt;
    const within = hoursBetween(incidentAt, at0) <= s.windowHours;
    if (!within) {
      notes.push({ text: `${s.label} more than ${s.windowHours === 24 ? '24 hours' : '30 days'} after the incident: not reportable (it is still recorded if recordable).`, cite: s.windowCite });
      return;
    }
    const start = Math.max(at0, learnedAt);
    events.push({ kind, label: s.label, hours: s.hours, due: addHours(start, s.hours), cite: s.cite, ...extra });
  };
  if (yes(f.death)) add('fatality', isIsoDate(f.deathDate) ? atMs(f.deathDate, f.deathTime) : incidentAt);
  if (f.hospital === 'inpatient') add('inpatient', isIsoDate(f.hospitalDate) ? atMs(f.hospitalDate, f.hospitalTime) : incidentAt);
  if (f.hospital === 'observation') notes.push({ text: 'Admitted only for observation or diagnostic testing: not reportable.', cite: '1904.39(b)(10)' });
  if (f.hospital === 'er') notes.push({ text: 'Treated in the emergency room without a formal admission: not an in-patient hospitalization.', cite: '1904.39(b)(9)' });
  if (yes(f.amputation)) add('amputation', incidentAt);
  if (yes(f.eyeLoss)) add('eye', incidentAt);
  if (!events.length) return notes.length ? { required: false, events: [], notes } : null;
  if (f.vehicle === 'public-road') return { required: false, events, notes: [...notes, { text: 'Motor vehicle accident on a public street or highway (outside a construction work zone): not reportable to OSHA. Record it if it is recordable.', cite: '1904.39(b)(3)' }] };
  if (f.vehicle === 'public-transport') return { required: false, events, notes: [...notes, { text: 'Accident on commercial or public transportation (airplane, train, subway, bus): not reportable to OSHA. Record it if it is recordable.', cite: '1904.39(b)(4)' }] };
  events.sort((a, b) => a.due - b.due);
  return { required: true, events, due: events[0].due, hours: events[0].hours, kind: events[0].kind, cite: events[0].cite, notes, tentative: workRelated !== 'yes' };
}

// ---- The decision --------------------------------------------------------------------------------------------
/**
 * Decide whether a case is recordable.
 * Returns { decision: 'recordable' | 'not-recordable' | 'existing-case' | 'needs-info', steps: [{ text, cite, result }],
 *   questions: [{ id, field, text, cite, options?, input? }], outcome, type, days, privacy, report, recordBy }.
 */
export function evaluate(f = {}, { today = todayIso() } = {}) {
  const steps = [];
  const questions = [];
  const step = (result, text, cite, extra = {}) => steps.push({ result, text, cite, ...extra });
  const ask = (q) => { if (!questions.some((x) => x.id === q.id)) questions.push(q); };
  const type = TYPE[f.type] ? f.type : 'injury';
  const out = { steps, questions, type, typeLabel: TYPE[type].label, typeCol: TYPE[type].col };

  // Basic facts.
  if (!isIsoDate(f.incidentDate)) ask({ id: 'incidentDate', field: 'incidentDate', input: 'date', text: 'On what date did the injury happen or the illness begin?', cite: '1904.29(b)' });

  // 1. Work-relatedness (1904.5).
  let workRelated = 'unknown';
  const ex = f.exception && EXCEPTION[f.exception];
  if (ex) {
    if (f.exception === 'eating' && ['contaminated', 'employer'].includes(f.foodSource)) {
      workRelated = 'yes';
      step('yes', f.foodSource === 'contaminated' ? 'Eating or drinking, but the food was contaminated by workplace contaminants: work-related.' : 'Eating or drinking, but the employer supplied the food that caused the illness: work-related.', '1904.5(b)(2)(iv)');
    } else if (f.exception === 'mental' && yes(f.mentalOpinion)) {
      workRelated = 'yes';
      step('yes', 'Mental illness, and the employee voluntarily provided an opinion from a physician or other licensed health care professional that it is work-related.', '1904.5(b)(2)(ix)');
    } else {
      workRelated = 'no';
      step('no', `Not work-related: ${ex.label.charAt(0).toLowerCase()}${ex.label.slice(1)}.`, ex.cite);
    }
  } else if (yes(f.workRelated)) {
    workRelated = 'yes';
    step('yes', f.aggravation ? 'Work-related: a work event or exposure significantly aggravated a pre-existing condition.' : 'Work-related: an event or exposure in the work environment caused or contributed to it (presumed for the work environment).', f.aggravation ? '1904.5(a), 1904.5(b)(4)' : '1904.5(a)');
  } else if (no(f.workRelated)) {
    workRelated = 'no';
    step('no', 'Not work-related: no event or exposure in the work environment caused, contributed to or significantly aggravated it.', '1904.5(a)');
  } else {
    ask({ id: 'workRelated', field: 'workRelated', text: 'Did an event or exposure in the work environment cause or contribute to it, or significantly aggravate a pre-existing condition?', cite: '1904.5(a)', options: [...YES_NO, { value: 'exception', label: 'One of the exceptions applies' }] });
  }
  out.workRelated = workRelated;
  out.report = reportability(f, { workRelated });
  if (isIsoDate(f.learnedDate) || isIsoDate(f.incidentDate)) {
    out.recordBy = addDays(f.learnedDate || f.incidentDate, RECORD_WITHIN_DAYS);
    out.recordCite = '1904.29(b)(3)';
  }
  if (workRelated === 'no') return finish(out, 'not-recordable', f, today);

  // 2. New case (1904.6).
  if (f.prior === 'not-recovered') {
    step('no', `Not a new case: the employee had not fully recovered from the earlier case${f.priorKey ? ` ${f.priorKey}` : ''} of the same type to the same body part. Update that case instead (and its outcome, if it got worse).`, '1904.6(a), 1904.33(b)(1)');
    return finish(out, 'existing-case', f, today);
  }
  if (f.prior === 'unknown') {
    ask({ id: 'prior', field: 'prior', text: `Had the employee fully recovered (no signs or symptoms) from the earlier recorded case${f.priorKey ? ` ${f.priorKey}` : ''} of the same type to the same body part?`, cite: '1904.6(a)', options: [{ value: 'recovered', label: 'Yes, fully recovered: this is a new case' }, { value: 'not-recovered', label: 'No: it is the same case' }] });
  } else if (f.prior === 'recovered') {
    step('yes', 'New case: the employee had fully recovered from the earlier case, and a new event or exposure brought the signs or symptoms back.', '1904.6(a)(2)');
  }

  // 3. Specific recording criteria (1904.8-1904.11). They decide on their own when they apply.
  const met = [];
  const firstAid = [];
  if (f.special === 'needlestick') {
    const c = f.sharps?.contaminated;
    if (yes(c)) {
      met.push({ key: 'needlestick', short: 'contaminated needlestick or sharps injury', text: "Needlestick or cut from a sharp object contaminated with another person's blood or other potentially infectious material.", cite: '1904.8(a)' });
      if (yes(f.sharps?.seroconverted)) out.type = 'other';
    } else if (no(c)) step('n/a', 'The sharp was not contaminated with blood or other potentially infectious material: the general criteria decide.', '1904.8(b)(2)');
    else ask({ id: 'sharps.contaminated', field: 'sharps.contaminated', text: "Was the needle or sharp object contaminated with another person's blood or other potentially infectious material?", cite: '1904.8(a)', options: [...YES_NO] });
  }
  if (f.special === 'removal') {
    if (f.removal?.chemical !== false) out.type = 'poisoning';
    if (yes(f.removal?.voluntary)) step('n/a', "Voluntary removal before the standard's medical removal levels are reached: not recordable on that basis.", '1904.9(b)(3)');
    else met.push({ key: 'removal', short: 'medical removal under an OSHA standard', text: `Medical removal under the medical surveillance requirements of an OSHA standard${f.removal?.standard ? ` (${f.removal.standard})` : ''}: record it as days away or restricted work, in the poisoning column when a chemical caused it.`, cite: '1904.9(a), 1904.9(b)(1)' });
  }
  if (f.special === 'hearing') {
    out.type = 'hearing';
    const shift = num(f.hearing?.shiftDb);
    const total = num(f.hearing?.totalDb);
    if (shift === null) ask({ id: 'hearing.shiftDb', field: 'hearing.shiftDb', input: 'number', text: 'Average shift from the baseline audiogram at 2000, 3000 and 4000 Hz in the affected ear (dB)?', cite: '1904.10(b)(1)' });
    if (total === null) ask({ id: 'hearing.totalDb', field: 'hearing.totalDb', input: 'number', text: 'Average hearing level at 2000, 3000 and 4000 Hz in the same ear, above audiometric zero (dB)?', cite: '1904.10(a)' });
    if (shift !== null && total !== null) {
      const adj = f.hearing?.ageAdjusted ? ' (age-adjusted; the 25 dB test never is)' : '';
      if (f.hearing?.retest === 'not-confirmed') step('no', 'A retest within 30 days did not confirm the shift: not recordable.', '1904.10(b)(4)');
      else if (shift >= 10 && total >= 25) met.push({ key: 'hearing', short: `standard threshold shift of ${shift} dB`, text: `Standard threshold shift of ${shift} dB${adj} and a hearing level of ${total} dB above audiometric zero (both thresholds met: 10 dB and 25 dB).`, cite: '1904.10(a)' });
      else step('no', shift < 10 ? `Shift of ${shift} dB${adj} is below the 10 dB standard threshold shift: not recordable.` : `Shift of ${shift} dB${adj}, but the hearing level of ${total} dB is below 25 dB above audiometric zero: not recordable.`, '1904.10(a)');
    }
  }
  if (f.special === 'tb') {
    out.type = 'respiratory';
    const tbEx = f.tb?.exception;
    if (tbEx) step('no', { household: 'The employee lives with a person diagnosed with active TB', 'public-health': 'The public health department identified the employee as a contact of a case outside work', investigation: 'A medical investigation shows the infection came from outside work', preemployment: 'Positive skin test at a pre-employment physical' }[tbEx] + ': not recordable.', tbEx === 'preemployment' ? '1904.11(b)(1)' : '1904.11(b)(2)');
    else if (yes(f.tb?.infection)) met.push({ key: 'tb', short: 'TB infection after workplace exposure', text: 'Exposed at work to someone with active tuberculosis and later developed a TB infection (positive skin test or diagnosis).', cite: '1904.11(a)' });
    else if (no(f.tb?.infection)) step('no', 'Exposure without infection (negative skin test): not recordable.', '1904.11(a)');
    else ask({ id: 'tb.infection', field: 'tb.infection', text: 'Did the employee develop a TB infection (a positive skin test or a diagnosis by a physician or other licensed health care professional)?', cite: '1904.11(a)', options: [...YES_NO] });
    if (tbEx) return finish(out, 'not-recordable', f, today);
  }

  // 4. General recording criteria (1904.7).
  const days = countDays(f, today);
  out.days = days;
  if (f.special !== 'hearing') {
    if (yes(f.death)) met.push({ key: 'death', short: 'death', text: 'Death.', cite: '1904.7(b)(2)' });
    if (days.away > 0) met.push({ key: 'away', short: `${days.away} day${days.away === 1 ? '' : 's'} away`, text: `${days.away} day${days.away === 1 ? '' : 's'} away from work${days.awayOngoing ? ' so far' : ''} (calendar days, not counting the day of injury).`, cite: '1904.7(b)(3)' });
    if (days.restricted > 0) met.push({ key: 'restricted', short: `${days.restricted} day${days.restricted === 1 ? '' : 's'} ${f.restricted?.transfer ? 'transferred' : 'restricted'}`, text: `${days.restricted} day${days.restricted === 1 ? '' : 's'} of ${f.restricted?.transfer ? 'job transfer' : 'restricted work'}${days.restrictedOngoing ? ' so far' : ''}.`, cite: '1904.7(b)(4)' });
    if (f.restricted?.injuryDayOnly) step('n/a', 'Restricted only on the day of injury: that alone does not make the case recordable.', '1904.7(b)(4)(iii)');
    if (yes(f.away?.recommended) || yes(f.restricted?.recommended)) step('note', 'A physician or other licensed health care professional recommended the days; they count even though the employee came to work.', yes(f.away?.recommended) ? '1904.7(b)(3)(ii)' : '1904.7(b)(4)(viii)');
    if (yes(f.refused)) step('note', 'The employee did not follow recommended medical treatment: the case is recorded anyway.', '1904.7(b)(5)(v)');
    const med = medication(f.med);
    if (med?.question) ask(med.question);
    for (const code of f.treatments || []) {
      const t = TREATMENT[code];
      if (!t) continue;
      if (t.kind === 'medical') met.push({ key: `mt:${code}`, short: `${t.label.toLowerCase()} (medical treatment)`, text: `Medical treatment beyond first aid: ${t.label.toLowerCase()}. ${t.why}`, cite: t.cite });
      else if (t.kind === 'first-aid') firstAid.push({ code, text: `${t.label} is first aid (item ${t.letter}).`, cite: t.cite });
      else step('none', `${t.label}: not medical treatment.`, t.cite);
    }
    if (med?.kind === 'medical') met.push({ key: 'mt:med', short: 'prescription-strength dose recommended (medical treatment)', text: med.text, cite: med.cite, source: med.source });
    else if (med?.kind === 'first-aid') firstAid.push({ code: 'med', text: med.text, cite: med.cite, source: med.source });
    if (yes(f.loc)) met.push({ key: 'loc', short: 'loss of consciousness', text: 'Loss of consciousness.', cite: '1904.7(b)(6)' });
    for (const d of f.diagnoses || []) if (DIAGNOSIS[d]) met.push({ key: `dx:${d}`, short: `${DIAGNOSIS[d].label.toLowerCase()} diagnosed`, text: `Significant injury or illness diagnosed by a physician or other licensed health care professional: ${DIAGNOSIS[d].label.toLowerCase()}. Recordable at diagnosis even without treatment or time off.`, cite: '1904.7(b)(7)' });
  }
  out.met = met;
  out.firstAid = firstAid;
  for (const fa of firstAid) step('first-aid', fa.text, fa.cite, fa.source ? { source: fa.source } : {});
  for (const m of met) step('yes', m.text, m.cite, m.source ? { source: m.source } : {});

  if (met.length) {
    // A criterion is met, so open questions about treatment or medicine no longer matter; whether the case is
    // work-related, new, and when it happened still do.
    const blocking = questions.filter((q) => BLOCKING.includes(q.id));
    out.questions = blocking;
    if (workRelated !== 'yes' || blocking.length) return finish(out, 'needs-info', f, today);
    return finish(out, 'recordable', f, today);
  }
  // Nothing met. Without the facts the general criteria need, ask; with them, it is first aid only.
  const treatmentKnown = Array.isArray(f.treatments) && (f.treatments.length > 0 || f.noTreatment) || f.med;
  const special = ['needlestick', 'hearing', 'tb'].includes(f.special) && !(f.special === 'needlestick' && no(f.sharps?.contaminated));
  if (!treatmentKnown && !special) ask({ id: 'treatments', field: 'treatments', input: 'treatments', text: 'What treatment did the employee get, from anyone (first-aider, nurse, clinic, doctor)?', cite: '1904.7(b)(5)' });
  if (f.away === undefined && f.restricted === undefined && !special) ask({ id: 'days', field: 'days', input: 'days', text: 'Did the employee miss work or work restricted after the day of injury (or did a doctor recommend it)?', cite: '1904.7(b)(3), 1904.7(b)(4)' });
  if (questions.length) return finish(out, 'needs-info', f, today);
  if (!special) step('no', firstAid.length ? 'First aid only, and no death, days away, restricted work, loss of consciousness or significant diagnosis: not recordable.' : 'No general recording criterion is met: not recordable.', '1904.7(a)');
  return finish(out, 'not-recordable', f, today);
}

function finish(out, decision, f, today) {
  out.decision = decision;
  if (decision === 'recordable') {
    const d = out.days || countDays(f, today);
    if (yes(f.death)) out.days = { ...d, away: 0, restricted: 0, capped: false, awayOngoing: false, restrictedOngoing: false, deathNote: true };
    out.outcome = yes(f.death) ? 'death' : d.away > 0 ? 'away' : d.restricted > 0 || out.met?.some((m) => m.key === 'removal') ? 'restricted' : 'other';
    if (out.met?.some((m) => m.key === 'removal') && !d.away && !d.restricted) {
      out.questions.push({ id: 'days', field: 'days', input: 'days', text: 'Medical removal is recorded as days away or restricted work: enter the days.', cite: '1904.9(a)' });
    }
    out.steps.push({ result: 'note', text: `Outcome column ${OUTCOMES[out.outcome].col} (${OUTCOMES[out.outcome].label.toLowerCase()}): the most serious outcome of the case${yes(f.death) ? '; no day counts are entered for a death' : ''}.`, cite: 'Form 300 instructions, OSHA FAQ 7-18' });
    out.outcomeLabel = OUTCOMES[out.outcome].label;
    out.outcomeCol = OUTCOMES[out.outcome].col;
    out.typeLabel = TYPE[out.type].label;
    out.typeCol = TYPE[out.type].col;
    out.privacy = privacyReasons(f, out.type);
    if (out.privacy.length) out.steps.push({ result: 'privacy', text: `Privacy case: enter "privacy case" instead of the name on the 300 log and keep the name on a separate, confidential list (${out.privacy.map((p) => p.label.toLowerCase()).join('; ')}).`, cite: out.privacy.map((p) => p.cite).join(', ') });
  } else {
    out.privacy = [];
  }
  out.summary = summarize(out);
  return out;
}

/** One line for comments, badges and Rovo. */
export function summarize(r) {
  const cites = (list) => [...new Set(list.map((m) => m.cite))].join(', ');
  if (r.decision === 'recordable') return `Recordable (${r.outcomeLabel.toLowerCase()}, ${r.typeLabel.toLowerCase()}): ${r.met.map((m) => m.short).join('; ')}. ${cites(r.met)}.`;
  if (r.decision === 'not-recordable') {
    const last = r.steps[r.steps.length - 1];
    return `Not recordable: ${last ? last.text.replace(/^Not work-related: /, 'not work-related, ').replace(/: not recordable\.?$/, '') : 'no criterion met'}. ${last?.cite || ''}`.trim();
  }
  if (r.decision === 'existing-case') return `Not a new case: update the earlier case. 29 CFR 1904.6(a)(1).`;
  return `${r.questions.length} question${r.questions.length === 1 ? '' : 's'} before deciding: ${r.questions[0]?.text || ''}`;
}

/** Badge text for the issue sidebar and the board. */
export function clockBadge(r, f, { nowMs, today = todayIso(), logged = null, reportedAt = null } = {}) {
  if (r.report?.required && !reportedAt) {
    const left = hoursBetween(nowMs, r.report.due);
    if (left < 0) return { label: `OSHA report overdue ${Math.ceil(-left)}h`, type: 'removed' };
    return { label: `Report to OSHA in ${left < 1 ? `${Math.max(1, Math.round(left * 60))}m` : `${Math.floor(left)}h`}`, type: 'removed' };
  }
  if (logged) return { label: `On the log · ${logged}`, type: 'success' };
  if (r.decision === 'not-recordable') return { label: 'Not recordable', type: 'default' };
  if (r.decision === 'existing-case') return { label: 'Same as an earlier case', type: 'default' };
  if (r.decision === 'needs-info') return { label: `${r.questions.length} question${r.questions.length === 1 ? '' : 's'}`, type: 'new' };
  if (r.recordBy) {
    const d = daysBetween(today, r.recordBy);
    if (d < 0) return { label: `Log overdue ${-d}d`, type: 'removed' };
    return { label: d === 0 ? 'Log today' : `Log by ${fmt(r.recordBy).replace(/, \d{4}$/, '')}`, type: d <= 2 ? 'moved' : 'inprogress' };
  }
  return { label: 'Recordable', type: 'inprogress' };
}

export const bodyPartLabel = (c) => BODY_PART[c]?.label || '';
