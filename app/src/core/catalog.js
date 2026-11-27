// The closed lists the engine works from: treatments (first aid vs medical treatment), work-relatedness exceptions,
// body parts, case types, diagnoses and the medications OSHA gives prescription-strength thresholds for.
// Every entry carries the 29 CFR Part 1904 paragraph it comes from (details and sources: docs/LAW.md).

export const CFR = (p) => `29 CFR ${p}`;

// ---- Treatments ------------------------------------------------------------------------------------------------
// kind: 'first-aid' (one of the 14 items in 1904.7(b)(5)(ii), which is a closed list), 'medical' (beyond first aid),
// 'none' (not treatment at all: 1904.7(b)(5)(i)(A)-(C)). `portal` is the plain wording the injured employee sees.
export const TREATMENTS = [
  { code: 'otc', kind: 'first-aid', letter: 'A', label: 'Non-prescription medicine at non-prescription strength', portal: 'Over-the-counter pain relief or cream', cite: '1904.7(b)(5)(ii)(A)' },
  { code: 'tetanus', kind: 'first-aid', letter: 'B', label: 'Tetanus immunization', portal: 'Tetanus shot', cite: '1904.7(b)(5)(ii)(B)' },
  { code: 'clean', kind: 'first-aid', letter: 'C', label: 'Cleaning, flushing or soaking a surface wound', portal: 'Cleaned or rinsed the wound', cite: '1904.7(b)(5)(ii)(C)' },
  { code: 'bandage', kind: 'first-aid', letter: 'D', label: 'Wound covering (bandage, Band-Aid, gauze pad)', portal: 'Bandage or plaster', cite: '1904.7(b)(5)(ii)(D)' },
  { code: 'butterfly', kind: 'first-aid', letter: 'D', label: 'Butterfly bandage or Steri-Strips', portal: 'Butterfly strips or Steri-Strips', cite: '1904.7(b)(5)(ii)(D)' },
  { code: 'hotcold', kind: 'first-aid', letter: 'E', label: 'Hot or cold therapy', portal: 'Ice pack or heat', cite: '1904.7(b)(5)(ii)(E)' },
  { code: 'wrap', kind: 'first-aid', letter: 'F', label: 'Non-rigid support (elastic bandage, wrap, non-rigid back belt)', portal: 'Elastic wrap or soft brace', cite: '1904.7(b)(5)(ii)(F)' },
  { code: 'transport', kind: 'first-aid', letter: 'G', label: 'Temporary immobilization for transport (splint, sling, neck collar, back board)', portal: 'Splint or sling only to get to care', cite: '1904.7(b)(5)(ii)(G)' },
  { code: 'blister', kind: 'first-aid', letter: 'H', label: 'Drilling a nail or draining a blister', portal: 'Drained a blister or relieved nail pressure', cite: '1904.7(b)(5)(ii)(H)' },
  { code: 'eyepatch', kind: 'first-aid', letter: 'I', label: 'Eye patch', portal: 'Eye patch', cite: '1904.7(b)(5)(ii)(I)' },
  { code: 'eyeflush', kind: 'first-aid', letter: 'J', label: 'Foreign body removed from the eye by irrigation or a cotton swab only', portal: 'Rinsed something out of the eye', cite: '1904.7(b)(5)(ii)(J)' },
  { code: 'splinter', kind: 'first-aid', letter: 'K', label: 'Splinter or foreign material removed (not from the eye) by irrigation, tweezers, cotton swab or other simple means', portal: 'Removed a splinter with tweezers', cite: '1904.7(b)(5)(ii)(K)' },
  { code: 'fingerguard', kind: 'first-aid', letter: 'L', label: 'Finger guard (rigid or not)', portal: 'Finger guard', cite: '1904.7(b)(5)(ii)(L)' },
  { code: 'massage', kind: 'first-aid', letter: 'M', label: 'Massage', portal: 'Massage', cite: '1904.7(b)(5)(ii)(M)' },
  { code: 'fluids', kind: 'first-aid', letter: 'N', label: 'Drinking fluids for relief of heat stress', portal: 'Water or fluids to drink for heat', cite: '1904.7(b)(5)(ii)(N)' },
  { code: 'ivfluids', kind: 'medical', label: 'IV fluids', portal: 'IV drip (fluids through a needle)', cite: 'OSHA FAQ 7-6', why: 'Only drinking fluids for heat stress is first aid; IV fluids are medical treatment.' },

  { code: 'sutures', kind: 'medical', label: 'Sutures or staples', portal: 'Stitches or staples', cite: '1904.7(b)(5)(ii)(D)', why: 'Wound-closing devices other than butterfly bandages and Steri-Strips are medical treatment.' },
  { code: 'glue', kind: 'medical', label: 'Surgical glue (tissue adhesive)', portal: 'Skin glue', cite: 'OSHA FAQ 7-5', why: 'Surgical glue is a wound-closing device, like sutures and staples, so it is medical treatment.' },
  { code: 'rx', kind: 'medical', label: 'Prescription medication issued', portal: 'Prescription medicine', cite: 'OSHA FAQ 7-10a', why: 'Prescription medication is not on the first-aid list, and it counts once the prescription is issued, filled or not.' },
  { code: 'otherimm', kind: 'medical', label: 'Immunization other than tetanus (e.g. hepatitis B, rabies)', portal: 'Other vaccine (e.g. hepatitis B, rabies)', cite: '1904.7(b)(5)(ii)(B)', why: 'Only tetanus immunizations are first aid.' },
  { code: 'rigid', kind: 'medical', label: 'Rigid support or immobilization (cast, rigid splint, rigid stays)', portal: 'Cast, rigid splint or brace', cite: '1904.7(b)(5)(ii)(F)', why: 'Only non-rigid means of support are first aid; devices with rigid stays or other rigid immobilization are medical treatment.' },
  { code: 'eyeremoval', kind: 'medical', label: 'Foreign body removed from the eye by other means (needle, burr, instrument)', portal: 'Doctor removed something from the eye with an instrument', cite: '1904.7(b)(5)(ii)(J)', why: 'Only removal from the eye by irrigation or a cotton swab is first aid.' },
  { code: 'embedded', kind: 'medical', label: 'Foreign body removed by complex means (incision, embedded object)', portal: 'Cut out or removed an embedded object', cite: '1904.7(b)(5)(ii)(K)', why: 'Only removal by simple means is first aid.' },
  { code: 'pt', kind: 'medical', label: 'Physical therapy or chiropractic treatment', portal: 'Physical therapy or chiropractor', cite: '1904.7(b)(5)(ii)(M)', why: 'Massage is first aid; physical therapy and chiropractic treatment are medical treatment.' },
  { code: 'surgery', kind: 'medical', label: 'Surgery or other procedure', portal: 'Surgery', cite: '1904.7(b)(5)(iii)', why: 'The first-aid list is complete, and surgery is not on it.' },
  { code: 'oxygen', kind: 'medical', label: 'Oxygen given for symptoms', portal: 'Given oxygen for symptoms', cite: 'OSHA FAQ 7-15', why: 'Oxygen given for symptoms is medical treatment.' },
  { code: 'o2precaution', kind: 'none', label: 'Oxygen as a precaution only, no symptoms', portal: 'Given oxygen just in case, no symptoms', cite: 'OSHA FAQ 7-15' },

  { code: 'observation', kind: 'none', label: 'Visit to a doctor or clinic for observation or counseling only', portal: 'Seen by a doctor or nurse, no treatment', cite: '1904.7(b)(5)(i)(A)' },
  { code: 'diagnostic', kind: 'none', label: 'Diagnostic procedures only (X-rays, blood tests, pupil-dilating eye drops)', portal: 'X-ray or tests only', cite: '1904.7(b)(5)(i)(B)' },
];
export const TREATMENT = Object.fromEntries(TREATMENTS.map((t) => [t.code, t]));

// Non-prescription medicines: OSHA's current test is the label. A single dose a physician or other licensed health care
// professional recommends that is greater than the single dose on the OTC label is prescription strength, so medical
// treatment (OSHA FAQ 7-8, current under CPL 02-00-172). `labelMg` is the largest single dose on the standard US Drug
// Facts label (a case can carry its own product's label dose). `legacyMg` are the fixed thresholds in the cancelled
// directive CPL 02-00-135, shown as a hint only.
export const MEDS = {
  ibuprofen: { label: 'Ibuprofen (Advil, Motrin)', labelMg: 400, legacyMg: 467 },
  naproxen: { label: 'Naproxen sodium (Aleve)', labelMg: 220, legacyMg: 220 },
  diphenhydramine: { label: 'Diphenhydramine (Benadryl)', labelMg: 50, legacyMg: 50 },
  ketoprofen: { label: 'Ketoprofen (Orudis KT)', labelMg: 25, legacyMg: 25 },
};
export const MED_SOURCE = 'OSHA FAQ 7-8: more than the single dose on the OTC label is prescription strength';

// ---- Work-relatedness exceptions: 1904.5(b)(2)(i)-(ix) ------------------------------------------------------
export const EXCEPTIONS = [
  { code: 'public', label: 'Present as a member of the general public, not as an employee', cite: '1904.5(b)(2)(i)' },
  { code: 'nonwork', label: 'Symptoms surfaced at work but came solely from a non-work event or exposure', cite: '1904.5(b)(2)(ii)' },
  { code: 'voluntary', label: 'Voluntary wellness, medical, fitness or recreational activity (flu shot, exercise class, company ball game)', cite: '1904.5(b)(2)(iii)' },
  { code: 'eating', label: 'Harm solely from eating, drinking or preparing food or drink for personal consumption (including cafeteria food the employee bought)', cite: '1904.5(b)(2)(iv)', note: 'Not an exception if the food was contaminated by a workplace contaminant or supplied by the employer, or if a lunchroom trip or fall hazard caused it.' },
  { code: 'personal', label: 'Personal tasks outside assigned working hours', cite: '1904.5(b)(2)(v)' },
  { code: 'grooming', label: 'Personal grooming, self-medication for a non-work condition, or intentionally self-inflicted', cite: '1904.5(b)(2)(vi)' },
  { code: 'commute', label: 'Motor vehicle accident in a company parking lot or company access road while commuting', cite: '1904.5(b)(2)(vii)' },
  { code: 'coldflu', label: 'Common cold or flu', cite: '1904.5(b)(2)(viii)' },
  { code: 'mental', label: 'Mental illness, with no voluntary opinion from a physician or other licensed health care professional that it is work-related', cite: '1904.5(b)(2)(ix)' },
];
export const EXCEPTION = Object.fromEntries(EXCEPTIONS.map((e) => [e.code, e]));

// ---- Injury or illness type: the Form 300 column M boxes -----------------------------------------------------
export const TYPES = [
  { code: 'injury', label: 'Injury', col: 'M1' },
  { code: 'skin', label: 'Skin disorder', col: 'M2' },
  { code: 'respiratory', label: 'Respiratory condition', col: 'M3' },
  { code: 'poisoning', label: 'Poisoning', col: 'M4' },
  { code: 'hearing', label: 'Hearing loss', col: 'M5' },
  { code: 'other', label: 'All other illnesses', col: 'M6' },
];
export const TYPE = Object.fromEntries(TYPES.map((t) => [t.code, t]));

// Outcome columns G-J (the most serious outcome is checked).
export const OUTCOMES = {
  death: { label: 'Death', col: 'G' },
  away: { label: 'Days away from work', col: 'H' },
  restricted: { label: 'Job transfer or restriction', col: 'I' },
  other: { label: 'Other recordable case', col: 'J' },
};

// ---- Body parts (the Form 300 "describe injury" column names the part; intimate parts make a privacy case) ----
export const BODY_PARTS = [
  ['head', 'Head'], ['eye', 'Eye'], ['ear', 'Ear'], ['face', 'Face'], ['neck', 'Neck'], ['shoulder', 'Shoulder'],
  ['arm', 'Arm'], ['elbow', 'Elbow'], ['wrist', 'Wrist'], ['hand', 'Hand'], ['finger', 'Finger or thumb'],
  ['chest', 'Chest'], ['back', 'Back'], ['abdomen', 'Abdomen'], ['hip', 'Hip'], ['leg', 'Leg'], ['knee', 'Knee'],
  ['ankle', 'Ankle'], ['foot', 'Foot'], ['toe', 'Toe'], ['intimate', 'Intimate body part or reproductive system'],
  ['lungs', 'Lungs or breathing'], ['skin', 'Skin'], ['body', 'Whole body or several parts'], ['mind', 'Mental health'],
].map(([code, label]) => ({ code, label }));
export const BODY_PART = Object.fromEntries(BODY_PARTS.map((b) => [b.code, b]));

// ---- Significant diagnosed injuries and illnesses: 1904.7(b)(7) -------------------------------------------------
export const DIAGNOSES = [
  { code: 'fracture', label: 'Fractured or cracked bone (or tooth)', cite: '1904.7(b)(7)' },
  { code: 'eardrum', label: 'Punctured eardrum', cite: '1904.7(b)(7)' },
  { code: 'cancer', label: 'Cancer', cite: '1904.7(b)(7)' },
  { code: 'chronic', label: 'Chronic irreversible disease', cite: '1904.7(b)(7)' },
];
export const DIAGNOSIS = Object.fromEntries(DIAGNOSES.map((d) => [d.code, d]));

// ---- Specific cases (1904.8-1904.11) -------------------------------------------------------------------------
export const SPECIALS = [
  { code: 'needlestick', label: 'Needlestick or cut from a sharp object', cite: '1904.8' },
  { code: 'removal', label: 'Medical removal under an OSHA standard (lead, cadmium, benzene...)', cite: '1904.9' },
  { code: 'hearing', label: 'Hearing test (standard threshold shift)', cite: '1904.10' },
  { code: 'tb', label: 'Tuberculosis exposure or infection', cite: '1904.11' },
];

// ---- Privacy concern cases: 1904.29(b)(7) ----------------------------------------------------------------------
export const PRIVACY_REASONS = {
  intimate: { label: 'Injury or illness to an intimate body part or the reproductive system', cite: '1904.29(b)(7)(i)' },
  assault: { label: 'Injury or illness resulting from a sexual assault', cite: '1904.29(b)(7)(ii)' },
  mental: { label: 'Mental illness', cite: '1904.29(b)(7)(iii)' },
  infection: { label: 'HIV infection, hepatitis or tuberculosis', cite: '1904.29(b)(7)(iv)' },
  sharps: { label: "Needlestick or sharps injury contaminated with another person's blood or other potentially infectious material", cite: '1904.29(b)(7)(v)' },
  request: { label: 'Other illness: the employee asked that their name not be entered', cite: '1904.29(b)(7)(vi)' },
};

// ---- Reportable severe events: 1904.39 ------------------------------------------------------------------------
export const SEVERE = {
  fatality: { label: 'Fatality', hours: 8, windowHours: 30 * 24, cite: '1904.39(a)(1)', windowCite: '1904.39(b)(6)' },
  inpatient: { label: 'In-patient hospitalization', hours: 24, windowHours: 24, cite: '1904.39(a)(2)', windowCite: '1904.39(b)(6)' },
  amputation: { label: 'Amputation', hours: 24, windowHours: 24, cite: '1904.39(a)(2)', windowCite: '1904.39(b)(6)' },
  eye: { label: 'Loss of an eye', hours: 24, windowHours: 24, cite: '1904.39(a)(2)', windowCite: '1904.39(b)(6)' },
};

// What OSHA asks for when you report (1904.39(b)(2)).
export const REPORT_CHECKLIST = [
  { code: 'establishment', label: 'Establishment name' },
  { code: 'location', label: 'Location of the work-related incident' },
  { code: 'time', label: 'Time of the work-related incident' },
  { code: 'event', label: 'Type of reportable event (fatality, in-patient hospitalization, amputation or loss of an eye)' },
  { code: 'count', label: 'Number of employees who suffered the event' },
  { code: 'names', label: 'Names of the employees who suffered the event' },
  { code: 'contact', label: 'Your contact person and their phone number' },
  { code: 'description', label: 'Brief description of the work-related incident' },
];
export const REPORT_HOW = [
  { code: 'phone', label: 'By phone to the nearest OSHA Area Office (business hours)' },
  { code: 'hotline', label: 'By phone to the OSHA 24-hour line, 1-800-321-OSHA (6742)' },
  { code: 'online', label: 'Online at osha.gov/report' },
];

/** A citation as people read it: "29 CFR 1904.7(b)(5)" for the rule, as is for OSHA FAQs and directives. */
export const citeText = (c) => (!c ? '' : /^\d/.test(String(c)) ? `29 CFR ${c}` : String(c));

export const label = (list, code) => (list.find ? list.find((x) => x.code === code)?.label : list[code]?.label) || code;
