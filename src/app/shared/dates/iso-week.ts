/** ISO 8601 week number: weeks start on Monday, week 1 holds the year's first Thursday. */
export function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return Math.ceil(((day.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** A week as the timesheet addresses it: by the year and month of its Thursday and its ISO week. */
export interface WeekRef {
  /** The year of the week's Thursday, which is also its ISO week-numbering year. */
  year: number;
  /** The month of the week's Thursday, 1–12: the month the week belongs to. */
  month: number;
  /** The ISO week number, 1–53. */
  week: number;
  /** The Monday of the week, at local midnight. */
  monday: Date;
}

/** The week a date falls in. */
export function weekOf(date: Date): WeekRef {
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - ((date.getDay() + 6) % 7),
  );
  const thursday = addDays(monday, 3);
  return {
    year: thursday.getFullYear(),
    month: thursday.getMonth() + 1,
    week: isoWeek(thursday),
    monday,
  };
}

/** The Monday of an ISO week, or undefined when the year has no such week. */
export function mondayOfIsoWeek(year: number, week: number): Date | undefined {
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) return undefined;
  const january4 = new Date(year, 0, 4);
  const monday = addDays(january4, -((january4.getDay() + 6) % 7) + (week - 1) * 7);
  return weekOf(monday).year === year ? monday : undefined;
}

/** The first week of a month (1–12): the first one whose Thursday falls in the month. */
export function firstWeekOfMonth(year: number, month: number): WeekRef {
  const first = new Date(year, month - 1, 1);
  const firstThursday = addDays(first, (4 - first.getDay() + 7) % 7);
  return weekOf(firstThursday);
}

/** The date `days` after (or before) a date, at local midnight. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The ISO week as the settings keep it: `YYYY-Www`, e.g. 2026-W45. */
export function weekKey(ref: Pick<WeekRef, 'year' | 'week'>): string {
  return `${ref.year}-W${String(ref.week).padStart(2, '0')}`;
}
