/** Date helpers. All menu dates are America/New_York (Huntington, WV). */
import { HarlessValidationError } from './errors.js';

export const TIME_ZONE = 'America/New_York';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatInTimeZone(d: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function assertRealDate(year: number, month: number, day: number, input: string): void {
  // Round-trip through UTC to reject e.g. 2026-02-30.
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    throw new HarlessValidationError(
      `Invalid date "${input}". Expected a real calendar date as "YYYY-MM-DD".`,
    );
  }
}

/**
 * Normalize user input to "YYYY-MM-DD".
 * Accepts a Date, "YYYY-MM-DD", "today", "tomorrow", or undefined (= today).
 */
export function toDateString(input?: Date | string): string {
  if (input === undefined || input === null) return formatInTimeZone(new Date(), TIME_ZONE);
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) throw new HarlessValidationError('Invalid Date object.');
    return formatInTimeZone(input, TIME_ZONE);
  }
  const s = input.trim();
  if (s.toLowerCase() === 'today') return formatInTimeZone(new Date(), TIME_ZONE);
  if (s.toLowerCase() === 'tomorrow') return addDays(formatInTimeZone(new Date(), TIME_ZONE), 1);
  const m = DATE_RE.exec(s);
  if (!m) {
    throw new HarlessValidationError(
      `Invalid date "${input}". Use "YYYY-MM-DD", "today", "tomorrow", or a Date.`,
    );
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new HarlessValidationError(`Invalid date "${input}". Use a real "YYYY-MM-DD" date.`);
  }
  assertRealDate(year, month, day, s);
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Add (or subtract) days to a "YYYY-MM-DD" string. */
export function addDays(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y as number, (mo as number) - 1, d as number));
  dt.setUTCDate(dt.getUTCDate() + days);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Monday-first week containing dateStr: 7 "YYYY-MM-DD" strings. */
export function weekOf(dateStr: string): string[] {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y as number, (mo as number) - 1, d as number));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(dateStr, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
