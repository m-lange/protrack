import type { Bundesland } from '../types/bundesland';
import { dateKey, getHolidayMap } from './holidays';

/** Arbeitstage = Kalendertage minus Wochenende minus gesetzliche Feiertage. */
export function countWorkingDaysInMonth(year: number, monthIndex: number, bundesland: Bundesland): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const holidayMap = getHolidayMap(year, bundesland);

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const weekday = date.getDay();
    if (weekday === 0 || weekday === 6) continue;
    if (holidayMap.has(dateKey(date))) continue;
    count++;
  }
  return count;
}

/** Arbeitstage pro Monat für ein ganzes Jahr, 12 Einträge (Index 0 = Januar). */
export function workingDaysByMonth(year: number, bundesland: Bundesland): number[] {
  return Array.from({ length: 12 }, (_, monthIndex) => countWorkingDaysInMonth(year, monthIndex, bundesland));
}
