import { RegionCode } from '../../core/data/model';
import { isoDate, parseIsoDate } from './months';

/** The public holidays ProTrack knows. Their names are in the strings file (`holidays`). */
export type HolidayId =
  | 'newYear'
  | 'epiphany'
  | 'womensDay'
  | 'goodFriday'
  | 'easterMonday'
  | 'labourDay'
  | 'ascension'
  | 'whitMonday'
  | 'corpusChristi'
  | 'assumption'
  | 'childrensDay'
  | 'unityDay'
  | 'reformation'
  | 'allSaints'
  | 'repentance'
  | 'christmas'
  | 'boxingDay';

/**
 * Days off by ISO date: a set of whole days, or a map to the share of each day that is off
 * (1 for a whole day, 0.5 for half a day).
 */
export type DaysOff = ReadonlySet<string> | ReadonlyMap<string, number>;

/** The public holidays of a year as ISO dates. See `holidaysOfYear` for which ones count. */
export function publicHolidays(year: number, region: RegionCode | null): Set<string> {
  return new Set(holidaysOfYear(year, region).keys());
}

/**
 * Christmas Eve and New Year's Eve of a year as ISO dates: no public holidays, but the company
 * gives them off in part (Settings, `yearEndDaysOff`).
 */
export function yearEndDays(year: number): string[] {
  return [isoDate(new Date(year, 11, 24)), isoDate(new Date(year, 11, 31))];
}

/**
 * The days off of a year: the public holidays whole, and December 24 and 31 at `yearEndPercent`
 * (Settings, user 2026-11-10: the company gives them off in part).
 */
export function daysOff(
  year: number,
  region: RegionCode | null,
  yearEndPercent: number,
): Map<string, number> {
  const off = new Map([...holidaysOfYear(year, region).keys()].map((date) => [date, 1]));
  if (yearEndPercent > 0) {
    for (const date of yearEndDays(year)) {
      if (!off.has(date)) off.set(date, yearEndPercent / 100);
    }
  }
  return off;
}

/** The share of a day that is off, 0 to 1. */
function offShare(off: DaysOff, date: string): number {
  return 'get' in off ? (off.get(date) ?? 0) : off.has(date) ? 1 : 0;
}

/**
 * The public holidays of a year by ISO date: the nationwide ones and, with a federal state, its
 * own. Holidays that only some towns of a state keep (Assumption Day in Bavaria, Corpus Christi
 * in parts of Saxony and Thuringia) are left out. Without a state, only nationwide holidays count.
 */
export function holidaysOfYear(year: number, region: RegionCode | null): Map<string, HolidayId> {
  const easter = easterSunday(year);
  const fromEaster = (days: number) =>
    new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + days);
  const day = (month: number, date: number) => new Date(year, month - 1, date);
  const isIn = (...regions: RegionCode[]) => region !== null && regions.includes(region);

  const holidays: [Date, HolidayId][] = [
    [day(1, 1), 'newYear'],
    [fromEaster(-2), 'goodFriday'],
    [fromEaster(1), 'easterMonday'],
    [day(5, 1), 'labourDay'],
    [fromEaster(39), 'ascension'],
    [fromEaster(50), 'whitMonday'],
    [day(10, 3), 'unityDay'],
    [day(12, 25), 'christmas'],
    [day(12, 26), 'boxingDay'],
  ];
  if (isIn('BW', 'BY', 'ST')) holidays.push([day(1, 6), 'epiphany']);
  if ((isIn('BE') && year >= 2019) || (isIn('MV') && year >= 2023)) {
    holidays.push([day(3, 8), 'womensDay']);
  }
  if (isIn('BW', 'BY', 'HE', 'NW', 'RP', 'SL')) holidays.push([fromEaster(60), 'corpusChristi']);
  if (isIn('SL')) holidays.push([day(8, 15), 'assumption']);
  if (isIn('TH') && year >= 2019) holidays.push([day(9, 20), 'childrensDay']);
  if (
    isIn('BB', 'MV', 'SN', 'ST', 'TH') ||
    (isIn('HB', 'HH', 'NI', 'SH') && year >= 2018) ||
    year === 2017
  ) {
    holidays.push([day(10, 31), 'reformation']); // nationwide in 2017
  }
  if (isIn('BW', 'BY', 'NW', 'RP', 'SL')) holidays.push([day(11, 1), 'allSaints']);
  if (isIn('SN')) holidays.push([repentanceDay(year), 'repentance']);
  holidays.sort(([a], [b]) => a.getTime() - b.getTime());
  return new Map(holidays.map(([date, id]) => [isoDate(date), id]));
}

/**
 * Monday to Friday of a month, less the days off (a half day off counts half). `month` counts
 * from 0.
 */
export function workingDays(year: number, month: number, off: DaysOff): number {
  let count = 0;
  for (let date = 1; date <= new Date(year, month + 1, 0).getDate(); date++) {
    const day = new Date(year, month, date);
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1 - offShare(off, isoDate(day));
  }
  return count;
}

/** Monday to Friday from `start` to `end` (ISO dates, both included), less the days off. */
export function workingDaysBetween(start: string, end: string, off: DaysOff): number {
  let count = 0;
  const last = parseIsoDate(end);
  for (const day = parseIsoDate(start); day <= last; day.setDate(day.getDate() + 1)) {
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1 - offShare(off, isoDate(day));
  }
  return count;
}

/** Easter Sunday by the anonymous Gregorian algorithm. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const date = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, date);
}

/** The Wednesday before November 23. */
function repentanceDay(year: number): Date {
  const date = new Date(year, 10, 22);
  date.setDate(date.getDate() - ((date.getDay() + 4) % 7));
  return date;
}
