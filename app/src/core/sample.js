// The sample: two establishments and twelve cases that walk through the edge cases of 29 CFR Part 1904, dated
// relative to the day it is loaded so the clocks are live. Names are invented.
import { addDays } from './dates.js';

export const SAMPLE_COMPANY = 'Ridgeway Fabrication Co.';

export const SAMPLE_ESTABLISHMENTS = [
  { key: 'p1', name: 'Plant 1, Dayton', street: '2400 Webster St', city: 'Dayton', state: 'OH', zip: '45404', naics: '332710', industry: 'Machine shop: precision metal parts', estType: '1', company: SAMPLE_COMPANY, ein: '123456789', tz: 'America/New_York', avg: 128, peak: 141 },
  { key: 'p2', name: 'Plant 2, Columbus DC', street: '1800 Alum Creek Dr', city: 'Columbus', state: 'OH', zip: '43207', naics: '493110', industry: 'General warehousing and distribution', estType: '1', company: SAMPLE_COMPANY, ein: '123456789', tz: 'America/New_York', avg: 74, peak: 86 },
];

/**
 * The cases. `ago` = days before load day; `then` = what the sample does after opening it (log, close, open).
 * `patch` = facts the safety coordinator adds in the panel after the report (audiogram values, return dates...).
 */
export const SAMPLE_CASES = [
  {
    key: 'sutures', est: 'p1', ago: 38, time: '10:15', start: '07:00', then: 'log',
    summary: 'Cut on the back of the hand at the press brake',
    portal: { employee: 'Marcus Bell', jobTitle: 'Press brake operator', where: 'Press brake cell 2', doing: 'Loading 14-gauge steel blanks into the press brake', happened: 'A blank slipped and its burred edge cut the back of my left hand', injury: '2 cm laceration', object: 'Steel blank edge', kind: 'injury', bodyPart: 'hand', treatments: ['clean', 'sutures'], care: 'clinic', physician: 'Dr. A. Shah', facility: 'Kettering Health Urgent Care, Dayton', missed: 'none', dob: '1988-04-12', hired: '2019-06-03' },
  },
  {
    key: 'butterfly', est: 'p1', ago: 21, time: '13:40', start: '07:00', then: 'close',
    summary: 'Cut finger closed with butterfly strips',
    portal: { employee: 'Priya Raman', jobTitle: 'Quality inspector', where: 'Inspection bench', doing: 'Measuring a machined bracket', happened: 'Cut my index finger on a sharp edge of the part', injury: 'Small cut', object: 'Machined bracket', kind: 'injury', bodyPart: 'finger', treatments: ['clean', 'butterfly'], care: 'onsite', missed: 'none', dob: '1993-09-30', hired: '2021-02-15' },
  },
  {
    key: 'otc-rx', est: 'p2', ago: 55, time: '09:05', start: '06:00', then: 'log',
    summary: 'Back strain lifting a tote; doctor said ibuprofen 800 mg',
    portal: { employee: 'Luis Ortega', jobTitle: 'Order selector', where: 'Aisle 14, pick module', doing: 'Lifting a 40 lb tote from the bottom shelf', happened: 'Felt a sharp pull in my lower back while lifting', injury: 'Lower back strain', object: 'Tote of canned goods', kind: 'injury', bodyPart: 'back', treatments: ['hotcold'], medicine: 'otc', drug: 'ibuprofen', doseMg: '800', medBy: 'physician', care: 'clinic', physician: 'Dr. M. Ellis', facility: 'OhioHealth Urgent Care, Columbus', missed: 'none', dob: '1985-01-22', hired: '2017-08-14' },
  },
  {
    key: 'restricted', est: 'p2', ago: 30, time: '15:20', start: '14:00', then: 'log',
    summary: 'Sprained wrist; moved to returns scanning',
    portal: { employee: 'Hannah Cole', jobTitle: 'Material handler', where: 'Dock door 6', doing: 'Breaking down a pallet wrap', happened: 'Slipped on stretch film and landed on my right wrist', injury: 'Wrist sprain', object: 'Concrete dock floor', kind: 'injury', bodyPart: 'wrist', treatments: ['wrap', 'hotcold'], care: 'clinic', physician: 'Dr. M. Ellis', facility: 'OhioHealth Urgent Care, Columbus', missed: 'restricted', dob: '1996-11-05', hired: '2023-04-10' },
    patch: (t) => ({ 'restricted.from': addDays(t, -29), 'restricted.to': addDays(t, -17), 'restricted.transfer': true }),
  },
  {
    key: 'needlestick', est: 'p1', ago: 12, time: '11:30', start: '06:30', then: 'log',
    summary: 'Needlestick from a used lancet in the first-aid room',
    portal: { employee: 'Ana Souza', jobTitle: 'Occupational health nurse', where: 'Plant first-aid room', doing: 'Discarding a used lancet after a glucose check', happened: 'The used lancet punctured my thumb through the glove', injury: 'Puncture wound', object: 'Used lancet', kind: 'injury', bodyPart: 'finger', treatments: ['clean', 'bandage'], care: 'onsite', missed: 'none', sharp: 'blood', dob: '1979-03-18', hired: '2014-10-01' },
  },
  {
    key: 'hearing', est: 'p1', ago: 9, time: '08:30', start: '07:00', then: 'log',
    summary: 'Annual audiogram shows a standard threshold shift',
    portal: { employee: 'Tom Becker', jobTitle: 'Machinist', where: 'CNC bay (85-90 dBA area)', doing: 'Annual hearing test under the hearing conservation program', happened: 'The annual audiogram showed a shift in the left ear compared with the baseline', injury: 'Hearing loss, left ear', object: 'Machine noise', kind: 'hearing', bodyPart: 'ear', treatments: ['observation'], care: 'onsite', missed: 'none', dob: '1971-07-07', hired: '2008-03-24' },
    patch: () => ({ special: 'hearing', 'hearing.shiftDb': 12, 'hearing.totalDb': 31, 'hearing.ageAdjusted': true, 'hearing.retest': 'confirmed' }),
  },
  {
    key: 'commute', est: 'p2', ago: 16, time: '05:52', start: '06:00', then: 'close',
    summary: 'Car hit while parking before shift',
    portal: { employee: 'Grace Lin', jobTitle: 'Inventory clerk', where: 'Employee parking lot, Plant 2', doing: 'Parking my car before the start of my shift', happened: 'Another car backed into mine in the company lot', injury: 'Neck strain (whiplash)', object: 'Car', kind: 'injury', bodyPart: 'neck', treatments: ['rx'], care: 'er', physician: 'ED physician', facility: 'Grant Medical Center, Columbus', missed: 'away', activity: 'commute', dob: '1990-12-02', hired: '2020-01-06' },
    patch: (t) => ({ 'away.from': addDays(t, -15), 'away.to': addDays(t, -13) }),
  },
  {
    key: 'amputation', est: 'p1', ago: 0, hoursAgo: 1.5, then: 'open', start: '06:00',
    summary: 'Fingertip caught in the punch press',
    portal: { employee: 'Omar Haddad', jobTitle: 'Punch press operator', where: 'Punch press line 1', doing: 'Clearing a jammed part from the die', happened: 'The ram cycled while my hand was in the die area and caught my right index fingertip', injury: 'Amputation of the right index fingertip', object: 'Punch press ram', kind: 'injury', bodyPart: 'finger', treatments: ['clean', 'surgery'], care: 'er', physician: 'Dr. R. Okafor', facility: 'Miami Valley Hospital, Dayton', missed: 'away', severe: ['amputation'], dob: '1999-05-27', hired: '2024-09-09' },
  },
  {
    key: 'fracture', est: 'p2', ago: 70, time: '10:50', start: '06:00', then: 'log',
    summary: 'Broken foot: forklift ran over it',
    portal: { employee: 'Darnell Price', jobTitle: 'Forklift operator', where: 'Cross-dock lane B', doing: 'Guiding a co-worker\'s forklift into a trailer', happened: 'The forklift wheel rolled over my left foot', injury: 'Fractured metatarsal', object: 'Forklift', kind: 'injury', bodyPart: 'foot', treatments: ['rigid'], care: 'er', physician: 'Dr. J. Park', facility: 'Grant Medical Center, Columbus', missed: 'away', dob: '1982-08-19', hired: '2012-05-21' },
    patch: (t) => ({ diagnoses: ['fracture'], 'away.from': addDays(t, -69), 'away.to': addDays(t, -48) }),
  },
  {
    key: 'cap', est: 'p2', ago: 240, time: '14:10', start: '14:00', then: 'log',
    summary: 'Torn rotator cuff; surgery, still off work',
    portal: { employee: 'Beth Ryan', jobTitle: 'Picker', where: 'Mezzanine, zone 3', doing: 'Reaching overhead for a carton', happened: 'The carton slipped and I wrenched my shoulder catching it', injury: 'Torn rotator cuff', object: 'Carton of motor oil', kind: 'injury', bodyPart: 'shoulder', treatments: ['surgery', 'pt'], care: 'clinic', physician: 'Dr. S. Grant', facility: 'Columbus Orthopaedic Clinic', missed: 'away', dob: '1975-02-11', hired: '2010-07-12' },
    patch: (t) => ({ 'away.from': addDays(t, -239) }),
  },
  {
    key: 'question-dose', est: 'p2', ago: 2, time: '16:05', start: '14:00', then: 'open',
    summary: 'Strained shoulder; clinic suggested ibuprofen',
    portal: { employee: 'Kim Nguyen', jobTitle: 'Packer', where: 'Pack-out line 2', doing: 'Lifting cases onto the conveyor', happened: 'Felt my right shoulder pull while lifting a case', injury: 'Shoulder strain', object: 'Case of bottled water', kind: 'injury', bodyPart: 'shoulder', treatments: ['hotcold'], medicine: 'otc', drug: 'ibuprofen', medBy: 'physician', care: 'clinic', physician: 'Nurse practitioner', facility: 'OhioHealth Urgent Care, Columbus', missed: 'none', dob: '2001-06-14', hired: '2025-03-03' },
  },
  {
    key: 'question-prior', est: 'p1', ago: 3, time: '09:45', start: '07:00', then: 'open',
    summary: 'Lower back pain again after lifting a die',
    portal: { employee: 'Raj Patel', jobTitle: 'Die setter', where: 'Die storage rack', doing: 'Lifting a 30 lb die insert onto the cart', happened: 'My lower back seized up again, like it did in the spring', injury: 'Lower back strain', object: 'Die insert', kind: 'injury', bodyPart: 'back', treatments: ['pt'], care: 'clinic', physician: 'Dr. A. Shah', facility: 'Kettering Health Urgent Care, Dayton', missed: 'none', dob: '1987-10-09', hired: '2016-11-28' },
    patch: () => ({ prior: 'unknown' }),
  },
];

/** The incident date for a sample case: `ago` days before `today`, but never before January 2 of the same year. */
export function sampleDate(today, ago) {
  const d = addDays(today, -ago);
  const jan2 = `${today.slice(0, 4)}-01-02`;
  return d < jan2 && today >= jan2 ? jan2 : d;
}

/** Hours worked so far this year for a sample establishment: average employees x 2,000 hours x share of the year. */
export function sampleHours(avg, today) {
  const start = Date.parse(`${today.slice(0, 4)}-01-01T00:00:00Z`);
  const share = Math.max(0.02, Math.min(1, (Date.parse(`${today}T00:00:00Z`) - start) / (365 * 864e5)));
  return Math.round(avg * 2000 * share);
}

/** The portal answers to store on the request (as the portal form would), with the sample marker. */
export function samplePortal(s, { estId, date, time }) {
  const p = { v: '1', sample: 'yes', who: 'self', activity: 'working', medicine: 'none', ...s.portal, est: estId, date, time: time || '', startTime: s.start || '' };
  if (p.missed === 'away' || p.missed === 'restricted') p.missedFrom = addDays(date, 1);
  return Object.entries(p).filter(([, v]) => v !== undefined && v !== '').map(([key, v]) => ({ key, value: Array.isArray(v) ? v.join(',') : String(v) }));
}
