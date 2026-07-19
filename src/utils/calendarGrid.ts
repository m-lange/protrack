export interface DayCell {
  date: Date;
}

/** Formats a local date as `YYYY-MM-DD`, matching the DayAssignment/ContingentEntry date format. */
export function toIsoDate(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface WeekRow {
  weekNumber: number;
  days: (DayCell | null)[];
}

/** ISO-8601 Kalenderwoche (Montag als erster Wochentag, Woche mit erstem Donnerstag = KW1). */
export function getISOWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);

  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/** Baut das Wochenraster (Mo-So) für einen Monat inkl. ISO-Kalenderwoche je Zeile. */
export function buildMonthGrid(year: number, month: number): WeekRow[] {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: WeekRow[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const weekCells = cells.slice(i, i + 7);
    const firstRealDay = weekCells.find((cell): cell is DayCell => cell !== null);
    weeks.push({
      weekNumber: firstRealDay ? getISOWeekNumber(firstRealDay.date) : 0,
      days: weekCells,
    });
  }
  return weeks;
}

export const WEEKDAY_LETTERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'] as const;

export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;

export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;
