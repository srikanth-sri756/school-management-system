// Calendar-day helpers for important dates. A day picked in a form ("2026-10-05") is
// stored as midnight UTC, so it is read back with UTC getters and shows the same day
// whatever the server's time zone.

const DAY_MS = 24 * 60 * 60 * 1000;

// Today (in the server's local calendar) as midnight UTC, comparable with stored days
const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

// "2026-10-05" → Date at midnight UTC; anything else → null
const parseDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCDate() === Number(match[3]) ? date : null;
};

// Date → "2026-10-05" (for <input type="date">)
const dayValue = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

const format = (date, options) => new Date(date).toLocaleDateString('en-IN', { timeZone: 'UTC', ...options });
const FULL = { day: 'numeric', month: 'short', year: 'numeric' };
const SHORT = { day: 'numeric', month: 'short' };

// When an item runs: { start, end } (end equals start for a single day)
const span = (item) => {
  const start = new Date(item.date);
  const end = item.endDate ? new Date(item.endDate) : start;
  return { start, end, multiDay: end.getTime() > start.getTime() };
};

// "5 Oct 2026", "15 – 28 Feb 2026", "28 Feb – 3 Mar 2026", "30 Dec 2026 – 2 Jan 2027"
function dateRange(item) {
  const { start, end, multiDay } = span(item);
  if (!multiDay) return format(start, FULL);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${format(start, FULL)} – ${format(end, FULL)}`;
  if (start.getUTCMonth() !== end.getUTCMonth()) return `${format(start, SHORT)} – ${format(end, FULL)}`;
  return `${start.getUTCDate()} – ${format(end, FULL)}`;
}

// Pieces for a calendar badge / the website: { day: '5', month: 'Oct', short: '15–28 Feb', year: '2026' }
function dateParts(item) {
  const { start, end, multiDay } = span(item);
  const month = format(start, { month: 'short' });
  let short = `${start.getUTCDate()} ${month}`;
  if (multiDay) {
    short = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()
      ? `${start.getUTCDate()}–${end.getUTCDate()} ${month}`
      : `${short} – ${format(end, SHORT)}`;
  }
  const year = start.getUTCFullYear() === end.getUTCFullYear()
    ? String(start.getUTCFullYear())
    : `${start.getUTCFullYear()}–${String(end.getUTCFullYear()).slice(-2)}`;
  return { day: String(start.getUTCDate()), month, short, year };
}

// "Today", "Tomorrow", "In 5 days", "Happening now" — or '' when more than a month away or past
function whenLabel(item) {
  const today = startOfToday();
  const { start, end } = span(item);
  const days = Math.round((start - today) / DAY_MS);
  if (days < 0) return end >= today ? 'Happening now' : '';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return days <= 30 ? `In ${days} days` : '';
}

// Attendance days are stored as "YYYY-MM-DD" text in the server's local calendar.
const pad = (n) => String(n).padStart(2, '0');
const localDayKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// The value if it is a real "YYYY-MM-DD" day, otherwise null
const dayKey = (value) => (parseDay(value) ? String(value).trim() : null);
// "Wednesday, 30 September 2026" for a "YYYY-MM-DD" day
const longDay = (key) => format(parseDay(key), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

module.exports = { startOfToday, parseDay, dayValue, dateRange, dateParts, whenLabel, localDayKey, dayKey, longDay };
