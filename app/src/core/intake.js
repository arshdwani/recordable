// From what people say to coded facts. Two inputs: the portal form (structured, saved by the JSM create property
// panel as an issue property in Jira) and free text (a Rovo question such as "she got three stitches").
// Only codes, dates and numbers come out; names and narrative stay where they were written.
import { TREATMENT, MEDS } from './catalog.js';
import { isIsoDate, isTime, addDays } from './dates.js';

export const PORTAL_VERSION = 1;

// The portal property may arrive as { key: value } or as [{ key, value }] (the create panel's submit shape).
export function portalValues(prop) {
  if (!prop) return null;
  if (Array.isArray(prop)) return Object.fromEntries(prop.map((f) => [f.key, f.value]));
  if (Array.isArray(prop.fields)) return Object.fromEntries(prop.fields.map((f) => [f.key, f.value]));
  return typeof prop === 'object' ? prop : null;
}

const list = (v) => (Array.isArray(v) ? v : v ? String(v).split(',') : []).map((x) => String(x).trim()).filter(Boolean);

/** Portal answers -> engine facts. `received` = { date, time } the request was raised (when the employer learned). */
export function factsFromPortal(v = {}, received = {}) {
  const f = {};
  if (v.est) f.est = String(v.est);
  if (isIsoDate(v.date)) f.incidentDate = v.date;
  if (isTime(v.time)) f.incidentTime = v.time;
  if (isTime(v.startTime)) f.startTime = v.startTime;
  if (isIsoDate(received.date)) f.learnedDate = received.date;
  if (isTime(received.time)) f.learnedTime = received.time;
  if (v.kind) f.type = String(v.kind);
  if (v.bodyPart) f.bodyPart = String(v.bodyPart);
  // 1904.5: the employee's own account. Working -> presumed work-related; a vehicle accident in the company lot or
  // access road on the way in or out is the commuting exception; anything else is a question for the safety team.
  if (v.activity === 'working') f.workRelated = 'yes';
  else if (v.activity === 'commute') f.exception = 'commute';
  else f.workRelated = 'unknown';
  const t = list(v.treatments);
  f.treatments = t.filter((c) => TREATMENT[c]);
  if (t.includes('none')) f.noTreatment = true;
  if (v.medicine === 'rx' && !f.treatments.includes('rx')) f.treatments.push('rx');
  if (v.medicine === 'otc') {
    f.med = { drug: MEDS[v.drug] ? v.drug : 'other', doseMg: Number(v.doseMg) > 0 ? Number(v.doseMg) : null, by: ['physician', 'self', 'other'].includes(v.medBy) ? v.medBy : 'unknown' };
    if (!f.treatments.includes('otc')) f.treatments.push('otc');
  }
  if (v.care === 'inpatient') f.hospital = 'inpatient';
  else if (v.care === 'er') f.hospital = 'er';
  const sev = list(v.severe);
  if (sev.includes('loc')) f.loc = true;
  if (sev.includes('amputation')) f.amputation = true;
  if (sev.includes('eye')) f.eyeLoss = true;
  if (v.sharp) {
    f.special = 'needlestick';
    f.sharps = { contaminated: v.sharp === 'blood' ? 'yes' : 'unknown' };
  }
  const from = isIsoDate(v.missedFrom) ? v.missedFrom : isIsoDate(v.date) ? addDays(v.date, 1) : null;
  if (v.missed === 'none') { f.away = { days: 0 }; f.restricted = { days: 0 }; }
  if (v.missed === 'away') { f.away = from ? { from } : { days: null }; f.restricted = { days: 0 }; }
  if (v.missed === 'restricted') { f.restricted = from ? { from } : { days: null }; f.away = { days: 0 }; }
  if (v.keepNameOff) f.privacyRequested = 'yes';
  return f;
}

// ---- Free text (Rovo) ---------------------------------------------------------------------------------------
const WORDS = [
  ['sutures', /\b(stitch(es|ed)?|sutur(e|es|ed)|staple[sd]?)\b/],
  ['glue', /\b(skin |surgical |tissue )?glue|dermabond\b/],
  ['butterfly', /\bbutterfly|steri-?strips?\b/],
  ['bandage', /\b(band-?aids?|bandage[sd]?|gauze|plaster)\b/],
  ['clean', /\b(clean(ed)?|rins(e|ed)|flush(ed)?|wash(ed)?|soak(ed)?)\b/],
  ['hotcold', /\b(ice( pack)?|cold pack|heat pack|hot pack|cold compress)\b/],
  ['wrap', /\b(ace bandage|elastic (bandage|wrap)|wrapped|wrap|soft brace|back belt)\b/],
  ['rigid', /\b(cast|rigid (splint|brace)|boot)\b/],
  ['transport', /\b(splint|sling|neck collar|back ?board)\b.*\b(transport|ambulance|to the (er|hospital|clinic))\b/],
  ['tetanus', /\btetanus\b/],
  ['eyeflush', /\b(eye wash|eyewash|flush(ed)? (the |his |her |their )?eye|irrigat)/],
  ['eyeremoval', /\b(removed|took) .{0,30}(from|out of) (the |his |her |their )?eye .{0,20}(needle|instrument|burr|magnet)/],
  ['splinter', /\b(splinter|tweezers)\b/],
  ['massage', /\bmassage\b/],
  ['pt', /\b(physical therapy|physiotherapy|chiropract)/],
  ['fluids', /\b(water|fluids|electrolyte)\b.*\bheat\b|\bheat\b.*\b(water|fluids)\b/],
  ['rx', /\b(prescri(bed|ption)|antibiotic|muscle relaxant|rx)\b/],
  ['surgery', /\b(surgery|operat(ed|ion))\b/],
  ['observation', /\b(observation|checked out|looked at)\b/],
  ['diagnostic', /\b(x-?rays?|mri|ct scan|blood test)\b/],
];

const MED_WORDS = [['ibuprofen', /\b(ibuprofen|advil|motrin)\b/], ['naproxen', /\b(naproxen|aleve)\b/], ['diphenhydramine', /\b(diphenhydramine|benadryl)\b/], ['ketoprofen', /\bketoprofen|orudis\b/]];
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, twenty: 20, thirty: 30 };

/** Facts from a sentence. Returns { facts, matched: [words] }. Unknown stays unknown. */
export function detectFacts(text = '') {
  const s = ` ${String(text).toLowerCase()} `;
  const f = { treatments: [] };
  const matched = [];
  for (const [code, re] of WORDS) {
    const m = s.match(re);
    if (m) { f.treatments.push(code); matched.push(m[0].trim()); }
  }
  // A butterfly bandage is not a plain bandage too.
  if (f.treatments.includes('butterfly')) f.treatments = f.treatments.filter((c) => c !== 'bandage');
  if (f.treatments.includes('rigid') || f.treatments.includes('transport')) f.treatments = f.treatments.filter((c) => c !== 'wrap');
  for (const [drug, re] of MED_WORDS) {
    if (!re.test(s)) continue;
    const dose = s.match(/(\d{2,4})\s?mg/);
    const by = /\b(doctor|physician|nurse practitioner|np|pa|clinic|er|urgent care) (recommended|told|said|prescribed|gave)|(recommended|prescribed) by (a |the )?(doctor|physician|clinic)/.test(s) ? 'physician' : /\b(took|taking) (some|his own|her own|their own)|on (his|her|their) own|self/.test(s) ? 'self' : /\b(supervisor|first[- ]aider|foreman|manager) gave\b/.test(s) ? 'other' : 'unknown';
    f.med = { drug, doseMg: dose ? Number(dose[1]) : null, by };
    matched.push(drug);
    f.treatments = f.treatments.filter((c) => c !== 'rx' || /prescri/.test(s));
  }
  const n = (w) => (/^\d+$/.test(w) ? Number(w) : NUM[w]);
  const away = s.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|twenty|thirty) (calendar )?days? (off|away|out|at home)/) || s.match(/(off|out|away)( of)?( work)? (for )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|twenty|thirty) days?/);
  if (away) { f.away = { days: n(away[1]) ?? n(away[5]) }; matched.push(away[0].trim()); }
  const restr = s.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|twenty|thirty) days? (of )?(light|restricted|modified) (duty|work)/) || s.match(/(light|restricted|modified) (duty|work) (for )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|twenty|thirty) days?/);
  if (restr) { f.restricted = { days: n(restr[1]) ?? n(restr[4]) }; matched.push(restr[0].trim()); }
  if (/\b(light|restricted|modified) duty\b/.test(s) && !f.restricted) { f.restricted = { days: null }; matched.push('restricted duty'); }
  if (/\b(no time off|didn'?t miss|back to work (the )?same day|returned to work (the )?same day|finished (his|her|their) shift)\b/.test(s)) {
    f.away = f.away || { days: 0 };
    f.restricted = f.restricted || { days: 0 };
    matched.push('no time off');
  }
  if (/\b(passed out|lost consciousness|unconscious|fainted|blacked out)\b/.test(s)) { f.loc = true; matched.push('lost consciousness'); }
  if (/\b(fracture[d]?|broke(n)? (a |his |her |their )?\w*\s?bone|broken (finger|wrist|arm|leg|toe|foot|rib|hand|ankle)|cracked (bone|rib))\b/.test(s)) { f.diagnoses = ['fracture']; matched.push('fracture'); }
  if (/\b(punctured|perforated) ear ?drum\b/.test(s)) { f.diagnoses = [...(f.diagnoses || []), 'eardrum']; matched.push('punctured eardrum'); }
  if (/\b(amputat|lost (the )?(tip of )?(a |his |her |their )?(finger|toe|thumb)|fingertip)/.test(s)) { f.amputation = true; matched.push('amputation'); }
  if (/\b(admitted|in-?patient|overnight in (the )?hospital|hospitali[sz]ed)\b/.test(s)) { f.hospital = /observation/.test(s) ? 'observation' : 'inpatient'; matched.push('hospitalized'); }
  if (/\b(died|death|fatal|killed)\b/.test(s)) { f.death = true; matched.push('death'); }
  if (/\b(needle ?stick|sharps?|lancet|syringe)\b/.test(s)) {
    f.special = 'needlestick';
    f.sharps = { contaminated: /\b(used|contaminated|blood|bloody|another person|patient'?s)\b/.test(s) ? 'yes' : /\b(new|unused|clean|sterile)\b/.test(s) ? 'no' : 'unknown' };
    matched.push('needlestick');
  }
  const sts = s.match(/(\d{1,2})\s?db (shift|sts|standard threshold shift)/) || s.match(/(shift|sts) of (\d{1,2})\s?db/);
  if (sts || /\b(hearing|audiogram|sts)\b/.test(s)) {
    f.special = f.special || 'hearing';
    f.type = 'hearing';
    const total = s.match(/(\d{1,3})\s?db (above audiometric zero|hearing level|total|threshold)/) || s.match(/hearing level (of )?(\d{1,3})/);
    f.hearing = { shiftDb: sts ? Number(sts[1] || sts[2]) : null, totalDb: total ? Number(total[1] && /\d/.test(total[1]) ? total[1] : total[2]) : null, ageAdjusted: /age[- ](adjust|correct)/.test(s) };
    matched.push('hearing test');
  }
  if (/\b(tb|tuberculosis)\b/.test(s)) { f.special = 'tb'; f.type = 'respiratory'; f.tb = { infection: /\b(positive|infect|diagnos)/.test(s) ? 'yes' : /\bnegative\b/.test(s) ? 'no' : 'unknown' }; matched.push('tuberculosis'); }
  if (/\b(parking lot|access road)\b/.test(s) && /\b(car|vehicle|truck|drove|driving|crash|collision|accident)\b/.test(s) && /\b(commut|arriv|leav|coming|going home|on (his|her|their) way)\b/.test(s)) { f.exception = 'commute'; matched.push('commuting in the company lot'); }
  if (/\b(public road|highway|interstate)\b/.test(s) && /\b(car|vehicle|truck|crash|collision|accident)\b/.test(s)) { f.vehicle = 'public-road'; matched.push('public road'); }
  if (/\b(cold|flu|influenza)\b/.test(s) && !/\b(cold (pack|compress|storage|room)|cold therapy)\b/.test(s)) { f.exception = 'coldflu'; matched.push('cold or flu'); }
  if (/\bflu shot|exercise class|company (softball|baseball|ball) game|wellness\b/.test(s)) { f.exception = 'voluntary'; matched.push('voluntary wellness or recreation'); }
  if (/\b(no treatment|nothing else|only (first aid|a band-?aid))\b/.test(s)) f.noTreatment = true;
  return { facts: f, matched: [...new Set(matched)] };
}
