import { MonthKey } from '../../core/data/model';

/** A date as ISO date `YYYY-MM-DD`, in local time. */
export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Reads an ISO date `YYYY-MM-DD` as local midnight. */
export function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Whether a value is a real ISO date `YYYY-MM-DD` (no February 30). */
export function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return isoDate(parseIsoDate(value)) === value;
}

/** The month of a year as `YYYY-MM`; `month` counts from 0 (January). */
export function monthKey(year: number, month: number): MonthKey {
  return `${year}-${pad(month + 1)}`;
}

/** The month a date falls in, as `YYYY-MM`. */
export function monthOf(date: Date | string): MonthKey {
  return typeof date === 'string'
    ? date.slice(0, 7)
    : monthKey(date.getFullYear(), date.getMonth());
}

/** Whether a month is a real `YYYY-MM`. */
export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** The twelve months of a year as `YYYY-MM`. */
export function monthsOfYear(year: number): MonthKey[] {
  return Array.from({ length: 12 }, (_, month) => monthKey(year, month));
}

/** How much of the range `start`–`end` (ISO dates, both included) has passed by `today`, 0–100. */
export function elapsedPercent(start: string, end: string, today: Date): number {
  const from = parseIsoDate(start).getTime();
  const to = parseIsoDate(end).getTime() + DAY;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() + DAY;
  if (now <= from) return 0;
  if (now >= to) return 100;
  return Math.round(((now - from) / (to - from)) * 100);
}

const DAY = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
