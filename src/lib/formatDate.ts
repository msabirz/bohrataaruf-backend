/**
 * One place for how dates are shown across the website, admin panel and emails: dd/mm/yyyy.
 * Do not call toLocaleDateString() for display: it follows each viewer's device settings and
 * gives mm/dd/yyyy to some people and dd/mm/yyyy to others.
 */

type DateInput = string | number | Date | null | undefined;

const pad = (n: number) => String(n).padStart(2, '0');

/** A plain calendar date such as "2026-12-14" (a database `date` column). */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 14/12/2026. Returns `fallback` for an empty or unreadable value (never "Invalid Date"). */
export function formatDate(value: DateInput, fallback = ''): string {
  if (typeof value === 'string') {
    // Read a plain date straight from its text, so a time zone can never move it a day.
    const m = DATE_ONLY.exec(value.trim());
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = toDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : fallback;
}

/** 14/12 (no year), for ranges where the year is shown once. */
export function formatDayMonth(value: DateInput, fallback = ''): string {
  const full = formatDate(value, '');
  return full ? full.slice(0, 5) : fallback;
}

/** 14/12/2026, 3:45 pm */
export function formatDateTime(value: DateInput, fallback = ''): string {
  const d = toDate(value);
  if (!d) return fallback;
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${formatDate(d)}, ${hour12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}

/** 14/12/2026 – 16/12/2026 for an event; a single date when there is no separate end day. */
export function formatDateRange(start: DateInput, end?: DateInput): string {
  const s = formatDate(start);
  if (!end || formatDate(end) === s) return s;
  return `${s} – ${formatDate(end)}`;
}
