import type { Bundesland } from '../types/bundesland';
import { dateKey, getHolidayMap } from './holidays';

function isWorkingDay(date: Date, holidayMap: Map<string, string>): boolean {
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return false;
  return !holidayMap.has(dateKey(date));
}

/** Arbeitstage = Kalendertage minus Wochenende minus gesetzliche Feiertage. */
export function countWorkingDaysInMonth(year: number, monthIndex: number, bundesland: Bundesland): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const holidayMap = getHolidayMap(year, bundesland);

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    if (isWorkingDay(new Date(year, monthIndex, day), holidayMap)) count++;
  }
  return count;
}

/** Arbeitstage pro Monat für ein ganzes Jahr, 12 Einträge (Index 0 = Januar). */
export function workingDaysByMonth(year: number, bundesland: Bundesland): number[] {
  return Array.from({ length: 12 }, (_, monthIndex) => countWorkingDaysInMonth(year, monthIndex, bundesland));
}

const SPECIAL_DAY_HOURS = 4;

/**
 * Heiligabend (24.12.) und Silvester (31.12.) sind in keinem Bundesland ein gesetzlicher Feiertag
 * (siehe holidays.ts), gelten praxisüblich aber als halbe Arbeitstage. Liefert die Summe der dafür
 * abzuziehenden Stunden (0/4/8) für Dezember des gegebenen Jahres - je Tag nur, wenn er überhaupt
 * auf einen Werktag fällt (sonst ist er ohnehin schon nicht in den Arbeitstagen enthalten).
 */
export function decemberSpecialDayDeductionHours(year: number, bundesland: Bundesland): number {
  const holidayMap = getHolidayMap(year, bundesland);
  let deduction = 0;
  if (isWorkingDay(new Date(year, 11, 24), holidayMap)) deduction += SPECIAL_DAY_HOURS;
  if (isWorkingDay(new Date(year, 11, 31), holidayMap)) deduction += SPECIAL_DAY_HOURS;
  return deduction;
}
