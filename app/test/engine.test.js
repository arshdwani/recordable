// The recordability engine against the edge cases in docs/LAW.md: each test names the rule it pins down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, countDays, stretchDays, medication, reportability, clockBadge, privacyReasons } from '../src/core/engine.js';
import { atMs } from '../src/core/dates.js';

const TODAY = '2026-11-24';
const base = (over = {}) => ({ incidentDate: '2026-11-16', learnedDate: '2026-11-16', workRelated: 'yes', type: 'injury', bodyPart: 'hand', treatments: [], prior: 'none', away: { days: 0 }, restricted: { days: 0 }, ...over });
const run = (over, opts = {}) => evaluate(base(over), { today: TODAY, ...opts });
const cites = (r) => r.steps.map((s) => s.cite).join(' | ');

test('sutures are medical treatment: recordable, other recordable case', () => {
  const r = run({ treatments: ['clean', 'sutures'] });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.outcome, 'other');
  assert.equal(r.outcomeCol, 'J');
  assert.equal(r.typeCol, 'M1');
  assert.match(cites(r), /1904\.7\(b\)\(5\)\(ii\)\(D\)/);
  assert.equal(r.recordBy, '2026-11-23');
});

test('butterfly bandage and cleaning are first aid only: not recordable', () => {
  const r = run({ treatments: ['clean', 'butterfly'] });
  assert.equal(r.decision, 'not-recordable');
  assert.equal(r.firstAid.length, 2);
  assert.match(r.summary, /First aid only/);
  assert.match(cites(r), /1904\.7\(b\)\(5\)\(ii\)\(C\).*1904\.7\(b\)\(5\)\(ii\)\(D\).*1904\.7\(a\)/);
});

test('surgical glue counts as a wound-closing device', () => {
  assert.equal(run({ treatments: ['glue'] }).decision, 'recordable');
});

test('OTC medicine: prescription strength is more than the label single dose, and only counts when a physician recommends it', () => {
  assert.equal(medication({ drug: 'ibuprofen', doseMg: 800, by: 'physician' }).kind, 'medical');
  assert.equal(medication({ drug: 'ibuprofen', doseMg: 400, by: 'physician' }).kind, 'first-aid', '400 mg is the label single dose (2 x 200 mg)');
  assert.equal(medication({ drug: 'ibuprofen', doseMg: 600, by: 'physician' }).kind, 'medical');
  assert.match(medication({ drug: 'ibuprofen', doseMg: 600, by: 'physician' }).text, /cancelled 2004 guidance used more than 467 mg/);
  assert.equal(medication({ drug: 'ibuprofen', doseMg: 800, by: 'self' }).kind, 'first-aid');
  assert.equal(medication({ drug: 'naproxen', doseMg: 440, by: 'physician' }).kind, 'medical');
  assert.equal(medication({ drug: 'diphenhydramine', doseMg: 50, by: 'physician' }).kind, 'first-aid');
  assert.equal(medication({ drug: 'ketoprofen', doseMg: 50, by: 'physician' }).kind, 'medical');
  // A product label can override the default label dose.
  assert.equal(medication({ drug: 'other', doseMg: 1000, labelMg: 1000, by: 'physician' }).kind, 'first-aid');
  assert.equal(medication({ drug: 'other', doseMg: 1000, by: 'physician' }).question.id, 'med.labelMg');
  // Ambiguous facts become questions.
  assert.equal(medication({ drug: 'ibuprofen', by: 'physician' }).question.id, 'med.doseMg');
  assert.equal(medication({ drug: 'ibuprofen', doseMg: 800 }).question.id, 'med.by');
  const r = run({ treatments: ['hotcold'], med: { drug: 'ibuprofen', doseMg: 800, by: 'physician' } });
  assert.equal(r.decision, 'recordable');
  assert.match(r.steps.map((s) => s.source || '').join(' '), /FAQ 7-8/);
  const q = run({ treatments: ['hotcold'], med: { drug: 'ibuprofen', doseMg: 800 } });
  assert.equal(q.decision, 'needs-info');
  assert.equal(q.questions[0].id, 'med.by');
});

test('a medicine question is moot once another criterion is met', () => {
  const r = run({ treatments: ['sutures'], med: { drug: 'ibuprofen' } });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.questions.length, 0);
});

test('prescription medication recommended counts even if never filled', () => {
  const r = run({ treatments: ['rx'] });
  assert.equal(r.decision, 'recordable');
  assert.match(r.summary, /prescription medication/i);
});

test('observation and diagnostics are not treatment', () => {
  const r = run({ treatments: ['observation', 'diagnostic'] });
  assert.equal(r.decision, 'not-recordable');
});

test('days away: calendar days, not the day of injury, weekends included, ongoing counts to today', () => {
  // Injured Mon Nov 16, away from Nov 16 (same day is skipped), back Mon Nov 23: Nov 17..22 = 6 days.
  assert.equal(stretchDays({ from: '2026-11-16', to: '2026-11-23' }, '2026-11-16', TODAY).days, 6);
  // Still away: Nov 17..24 = 8 days so far.
  const s = stretchDays({ from: '2026-11-17' }, '2026-11-16', TODAY);
  assert.equal(s.days, 8);
  assert.equal(s.ongoing, true);
  const r = run({ treatments: ['bandage'], away: { from: '2026-11-17', to: '2026-11-20' } });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.outcome, 'away');
  assert.equal(r.days.away, 3);
});

test('180-day cap on days away and restricted together', () => {
  const d = countDays({ incidentDate: '2026-01-05', away: { days: 150 }, restricted: { days: 60 } }, TODAY);
  assert.equal(d.away, 150);
  assert.equal(d.restricted, 30);
  assert.equal(d.capped, true);
  const long = countDays({ incidentDate: '2026-03-02', away: { from: '2026-03-03' } }, TODAY);
  assert.equal(long.away, 180);
});

test('restricted work: recordable and classified as job transfer or restriction; day-of-injury only is not', () => {
  const r = run({ treatments: ['wrap'], restricted: { from: '2026-11-17', to: '2026-11-24', transfer: true } });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.outcome, 'restricted');
  assert.equal(r.outcomeCol, 'I');
  assert.equal(r.days.restricted, 7);
  const only = run({ treatments: ['wrap'], restricted: { injuryDayOnly: true } });
  assert.equal(only.decision, 'not-recordable');
  assert.match(cites(only), /1904\.7\(b\)\(4\)/);
});

test('days away outrank restricted work for the outcome column', () => {
  const r = run({ treatments: ['sutures'], away: { days: 2 }, restricted: { days: 5 } });
  assert.equal(r.outcome, 'away');
  assert.equal(r.days.restricted, 5);
});

test('a death has no day counts and checks column G', () => {
  const r = run({ death: true, deathDate: '2026-11-18', away: { days: 2 } });
  assert.equal(r.outcome, 'death');
  assert.equal(r.outcomeCol, 'G');
  assert.equal(r.days.away, 0);
  assert.match(cites(r), /1904\.7\(b\)\(2\)/);
});

test('oxygen: for symptoms is medical treatment, as a precaution is not; IV fluids are medical treatment', () => {
  assert.equal(run({ treatments: ['oxygen'] }).decision, 'recordable');
  assert.equal(run({ treatments: ['o2precaution'] }).decision, 'not-recordable');
  assert.equal(run({ treatments: ['fluids'] }).decision, 'not-recordable');
  assert.equal(run({ treatments: ['ivfluids'] }).decision, 'recordable');
});

test('medical removal goes in the poisoning column', () => {
  const r = run({ special: 'removal', removal: { standard: 'lead' }, away: { days: 10 } });
  assert.equal(r.typeCol, 'M4');
  assert.equal(r.outcome, 'away');
  assert.equal(run({ special: 'removal', removal: { voluntary: true }, restricted: { days: 10 }, treatments: [] }).outcome, 'restricted', 'voluntary removal is judged on the general criteria');
});

test('TB: a positive test at a pre-employment physical is not recordable', () => {
  assert.equal(run({ special: 'tb', tb: { infection: 'yes', exception: 'preemployment' } }).decision, 'not-recordable');
});

test('loss of consciousness and significant diagnoses are recordable on their own', () => {
  assert.equal(run({ loc: true }).decision, 'recordable');
  const fx = run({ treatments: ['transport'], diagnoses: ['fracture'] });
  assert.equal(fx.decision, 'recordable');
  assert.match(cites(fx), /1904\.7\(b\)\(7\)/);
});

test('commuting accident in the company lot is not work-related', () => {
  const r = run({ exception: 'commute', treatments: ['sutures'], away: { days: 3 } });
  assert.equal(r.decision, 'not-recordable');
  assert.match(cites(r), /1904\.5\(b\)\(2\)\(vii\)/);
  assert.equal(r.report, null);
});

test('eating exception, unless the employer supplied the food', () => {
  assert.equal(run({ exception: 'eating', type: 'poisoning', treatments: ['rx'] }).decision, 'not-recordable');
  const r = run({ exception: 'eating', foodSource: 'employer', type: 'poisoning', treatments: ['rx'] });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.typeCol, 'M4');
});

test('unknown work-relatedness is a question, never a guess', () => {
  const r = run({ workRelated: 'unknown', treatments: ['sutures'] });
  assert.equal(r.decision, 'needs-info');
  assert.equal(r.questions[0].id, 'workRelated');
});

test('new case: not recovered from an earlier case is the same case; unknown is a question', () => {
  assert.equal(run({ prior: 'not-recovered', priorKey: 'HR-3', treatments: ['pt'] }).decision, 'existing-case');
  const q = run({ prior: 'unknown', treatments: ['pt'] });
  assert.equal(q.decision, 'needs-info');
  assert.equal(q.questions[0].id, 'prior');
  assert.equal(run({ prior: 'recovered', treatments: ['pt'] }).decision, 'recordable');
});

test('needlestick: contaminated is recordable and a privacy case; clean falls to the general criteria', () => {
  const r = run({ special: 'needlestick', sharps: { contaminated: 'yes' }, treatments: ['clean', 'bandage'] });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.privacy[0].code, 'sharps');
  assert.equal(r.typeCol, 'M1');
  const clean = run({ special: 'needlestick', sharps: { contaminated: 'no' }, treatments: ['bandage'] });
  assert.equal(clean.decision, 'not-recordable');
  const q = run({ special: 'needlestick', sharps: {}, treatments: ['bandage'] });
  assert.equal(q.decision, 'needs-info');
  assert.equal(q.questions[0].id, 'sharps.contaminated');
});

test('hearing loss: both the 10 dB shift and the 25 dB level are needed', () => {
  const r = run({ special: 'hearing', type: 'hearing', bodyPart: 'ear', hearing: { shiftDb: 12, totalDb: 31 } });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.typeCol, 'M5');
  assert.equal(r.outcome, 'other');
  assert.equal(run({ special: 'hearing', hearing: { shiftDb: 12, totalDb: 22 } }).decision, 'not-recordable');
  assert.equal(run({ special: 'hearing', hearing: { shiftDb: 8, totalDb: 40, ageAdjusted: true } }).decision, 'not-recordable');
  assert.equal(run({ special: 'hearing', hearing: { shiftDb: 12, totalDb: 31, retest: 'not-confirmed' } }).decision, 'not-recordable');
  assert.equal(run({ special: 'hearing', hearing: { shiftDb: 12 } }).decision, 'needs-info');
});

test('tuberculosis: infection after workplace exposure is recordable, a privacy case; household exposure is not', () => {
  const r = run({ special: 'tb', type: 'respiratory', bodyPart: 'lungs', tb: { infection: 'yes' } });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.privacy[0].code, 'infection');
  assert.equal(run({ special: 'tb', tb: { infection: 'yes', exception: 'household' } }).decision, 'not-recordable');
});

test('medical removal is recorded as days away or restricted', () => {
  const r = run({ special: 'removal', removal: { standard: 'lead' }, restricted: { days: 30, transfer: true } });
  assert.equal(r.decision, 'recordable');
  assert.equal(r.outcome, 'restricted');
});

test('privacy cases: intimate body parts, mental illness, and other illnesses on request only', () => {
  assert.equal(privacyReasons({ bodyPart: 'intimate' }, 'injury')[0].code, 'intimate');
  assert.equal(privacyReasons({ privacyRequested: 'yes' }, 'injury').length, 0, 'injuries are not privacy cases on request');
  assert.equal(privacyReasons({ privacyRequested: 'yes' }, 'skin')[0].code, 'request');
  assert.equal(privacyReasons({ bodyPart: 'back' }, 'injury').length, 0, 'a back strain is not a privacy case');
});

test('reporting: amputation within 24 hours; fatality within 8; the clock starts when you learn of it', () => {
  const amp = run({ incidentTime: '09:30', amputation: true, treatments: ['surgery'] });
  assert.equal(amp.report.required, true);
  assert.equal(amp.report.hours, 24);
  assert.equal(amp.report.due, atMs('2026-11-17', '09:30'));
  const late = run({ incidentTime: '09:30', learnedDate: '2026-11-17', learnedTime: '08:00', death: true, deathDate: '2026-11-17', deathTime: '06:00' });
  assert.equal(late.report.kind, 'fatality');
  assert.equal(late.report.due, atMs('2026-11-17', '16:00'));
});

test('reporting exceptions: observation-only admissions, deaths after 30 days, public roads', () => {
  const obs = run({ hospital: 'observation', treatments: ['observation'] });
  assert.equal(obs.report.required, false);
  assert.match(obs.report.notes[0].cite, /1904\.39\(b\)\(10\)/);
  const after = run({ death: true, deathDate: '2026-12-17' });
  assert.equal(after.report.required, false);
  assert.match(after.report.notes[0].cite, /1904\.39\(b\)\(6\)/);
  assert.equal(after.decision, 'recordable', 'still recorded');
  const road = run({ vehicle: 'public-road', hospital: 'inpatient', treatments: ['surgery'] });
  assert.equal(road.report.required, false);
  assert.equal(road.decision, 'recordable');
  const admitLater = run({ incidentTime: '08:00', hospital: 'inpatient', hospitalDate: '2026-11-18', hospitalTime: '09:00', treatments: ['surgery'] });
  assert.equal(admitLater.report.required, false, 'admitted more than 24 hours after the incident');
});

test('a possibly reportable event is flagged even before work-relatedness is settled', () => {
  const r = run({ workRelated: 'unknown', amputation: true, incidentTime: '10:00' });
  assert.equal(r.report.required, true);
  assert.equal(r.report.tentative, true);
});

test('badges: the OSHA report clock beats everything; then the 7-day log clock', () => {
  const amp = run({ incidentDate: TODAY, learnedDate: TODAY, incidentTime: '09:00', amputation: true, treatments: ['surgery'] });
  assert.equal(clockBadge(amp, {}, { nowMs: atMs(TODAY, '11:00'), today: TODAY }).label, 'Report to OSHA in 22h');
  assert.equal(clockBadge(amp, {}, { nowMs: atMs('2026-11-25', '10:00'), today: TODAY }).label, 'OSHA report overdue 1h');
  const s = run({ incidentDate: '2026-11-20', learnedDate: '2026-11-20', treatments: ['sutures'] });
  assert.equal(clockBadge(s, {}, { nowMs: 0, today: TODAY }).label, 'Log by Nov 27');
  assert.equal(clockBadge(s, {}, { nowMs: 0, today: TODAY, logged: '2026-004' }).label, 'On the log · 2026-004');
});
