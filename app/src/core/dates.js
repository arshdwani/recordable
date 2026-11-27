// Calendar arithmetic on ISO dates ('YYYY-MM-DD'), in UTC so results never shift with the server's time zone.
// Pure functions; every recordkeeping clock in Recordable is built from these.

const DAY = 864e5;
const RE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (s) => RE.test(String(s || '')) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const toMs = (iso) => Date.parse(`${iso}T00:00:00Z`);
export const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
export const today = (now = Date.now()) => isoDate(now);

export const addDays = (iso, n) => isoDate(toMs(iso) + n * DAY);
/** Whole days from a to b (b - a). */
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY);

export const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); // m is 0-based

/**
 * The corresponding calendar date `n` months later. When that month is shorter, the last day of the month
 * (EDPB Guidelines 01/2022, Example 33: received 31 August -> due 30 September).
 */
export function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const total = (m - 1) + n;
  const ty = y + Math.floor(total / 12);
  const tm = ((total % 12) + 12) % 12;
  const day = Math.min(d, daysInMonth(ty, tm));
  return isoDate(Date.UTC(ty, tm, day));
}

export const weekday = (iso) => new Date(toMs(iso)).getUTCDay(); // 0 Sunday .. 6 Saturday
export const isWeekend = (iso) => [0, 6].includes(weekday(iso));
export const isWorkingDay = (iso, holidays = []) => !isWeekend(iso) && !holidays.includes(iso);

/** Move forward to the next working day when `iso` falls on a weekend or a listed public holiday. */
export function nextWorkingDay(iso, holidays = []) {
  let d = iso;
  for (let i = 0; i < 30 && !isWorkingDay(d, holidays); i++) d = addDays(d, 1);
  return d;
}

/** The date `n` working days after `iso` (the day itself is not counted). */
export function addBusinessDays(iso, n, holidays = []) {
  let d = iso;
  let left = n;
  for (let i = 0; i < 400 && left > 0; i++) {
    d = addDays(d, 1);
    if (isWorkingDay(d, holidays)) left--;
  }
  return d;
}

/** Working days from a (exclusive) to b (inclusive); negative when b is before a. */
export function businessDaysBetween(a, b, holidays = []) {
  if (b === a) return 0;
  const sign = b > a ? 1 : -1;
  let n = 0;
  let d = a;
  for (let i = 0; i < 2000 && d !== b; i++) {
    d = addDays(d, sign);
    if (isWorkingDay(d, holidays)) n += sign;
  }
  return n;
}

export const maxDate = (...ds) => ds.filter(Boolean).sort().pop() || null;
export const minDate = (...ds) => ds.filter(Boolean).sort()[0] || null;

/** Human formats: "Dec 5, 2026" and "Fri Dec 5". */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function fmt(iso) {
  if (!isIsoDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
export function fmtShort(iso) {
  if (!isIsoDate(iso)) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${DAYS[weekday(iso)]} ${MONTHS[m - 1]} ${d}`;
}

// ---- Date-times (OSHA's 8- and 24-hour reporting clocks) -----------------------------------------------------
const HOUR = 36e5;
/** 'YYYY-MM-DD' + 'HH:MM' -> ms (UTC wall clock: the app keeps establishment-local times as entered). */
export const atMs = (iso, hhmm = '00:00') => Date.parse(`${iso}T${/^\d{2}:\d{2}$/.test(hhmm || '') ? hhmm : '00:00'}:00Z`);
export const isoDateTime = (ms) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
export const hoursBetween = (a, b) => (b - a) / HOUR;
export const addHours = (ms, h) => ms + h * HOUR;
export const yearOf = (iso) => Number(String(iso).slice(0, 4));
export const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));
/** "Dec 5, 2026 2:30 PM" for a wall-clock ms value. */
export function fmtDateTime(ms) {
  if (!Number.isFinite(ms)) return '';
  const iso = new Date(ms).toISOString();
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  return `${fmt(iso.slice(0, 10))} ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
