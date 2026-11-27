// Establishments: who keeps a log, who must submit electronically, and the fields the 300A and ITA files need.
// The NAICS appendix tables are in core/naics.js (29 CFR 1904 Subpart B Appendix A; Subpart E Appendices A and B).

// ITA establishment_type codes.
export const EST_TYPES = [
  { code: '1', label: 'Private industry' },
  { code: '2', label: 'State government' },
  { code: '3', label: 'Local government' },
];
export const estTypeCode = (v) => EST_TYPES.find((t) => t.code === String(v) || t.label.toLowerCase() === String(v || '').toLowerCase())?.code || '1';
export const estTypeLabel = (v) => EST_TYPES.find((t) => t.code === estTypeCode(v))?.label;

export const FIELDS = ['name', 'street', 'city', 'state', 'zip', 'naics', 'industry', 'estType', 'company', 'ein', 'tz', 'leadAccountId'];

/** Clean and check an establishment from a form (throws { userMessage }). */
export function cleanEstablishment(input = {}, fail = (m) => { throw new Error(m); }) {
  const e = {};
  for (const f of FIELDS) if (input[f] !== undefined) e[f] = String(input[f] ?? '').trim().slice(0, 200);
  if (e.name !== undefined && !e.name) fail('Give the establishment a name, e.g. "Plant 2, Columbus".');
  if (e.naics && !/^\d{6}$/.test(e.naics)) fail('NAICS code: 6 digits, e.g. 332710.');
  if (e.state && !/^[A-Za-z]{2}$/.test(e.state)) fail('State: the two-letter code, e.g. OH.');
  if (e.state) e.state = e.state.toUpperCase();
  if (e.zip && !/^\d{5}(-\d{4})?$/.test(e.zip)) fail('ZIP: 5 digits (or ZIP+4).');
  if (e.ein && !/^\d{2}-?\d{7}$/.test(e.ein)) fail('EIN: 9 digits, e.g. 12-3456789.');
  if (e.ein) e.ein = e.ein.replace('-', '');
  if (e.tz && !validTz(e.tz)) fail('Time zone: an IANA name such as America/Chicago.');
  if (e.estType !== undefined) e.estType = estTypeCode(e.estType);
  return e;
}

export function validTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (_) {
    return false;
  }
}

/** The establishment's wall-clock time as ms (to compare with incident times entered in local time). */
export function wallNow(tz = 'America/New_York', now = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: validTz(tz) ? tz : 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
}
export const wallToday = (tz, now = Date.now()) => new Date(wallNow(tz, now)).toISOString().slice(0, 10);
