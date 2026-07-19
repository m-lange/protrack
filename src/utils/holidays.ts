import type { Bundesland } from '../types/bundesland';

export interface Holiday {
  date: Date;
  name: string;
}

const ALL: Bundesland[] = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Gauss'sche Osterformel (Meeus/Jones/Butcher-Algorithmus). */
function calculateEasterSunday(year: number): Date {
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
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

interface HolidayRule {
  name: string;
  date: (year: number, easterSunday: Date) => Date;
  /** Bundesländer, in denen der Feiertag gilt. `states` ist eine Funktion, damit sich manche
   * Regeln (Reformationstag seit 2018, Weltfrauentag/Weltkindertag seit 2019) jahresabhängig
   * erweitern lassen. */
  states: (year: number) => Bundesland[];
}

const HOLIDAY_RULES: HolidayRule[] = [
  { name: 'Neujahr', date: (year) => new Date(year, 0, 1), states: () => ALL },
  {
    name: 'Heilige Drei Könige',
    date: (year) => new Date(year, 0, 6),
    states: () => ['BW', 'BY', 'ST'],
  },
  {
    name: 'Weltfrauentag',
    date: (year) => new Date(year, 2, 8),
    states: (year) => (year >= 2019 ? ['BE'] : []),
  },
  { name: 'Karfreitag', date: (_year, easter) => addDays(easter, -2), states: () => ALL },
  { name: 'Ostersonntag', date: (_year, easter) => easter, states: () => ['BB'] },
  { name: 'Ostermontag', date: (_year, easter) => addDays(easter, 1), states: () => ALL },
  { name: 'Tag der Arbeit', date: (year) => new Date(year, 4, 1), states: () => ALL },
  { name: 'Christi Himmelfahrt', date: (_year, easter) => addDays(easter, 39), states: () => ALL },
  { name: 'Pfingstsonntag', date: (_year, easter) => addDays(easter, 49), states: () => ['BB'] },
  { name: 'Pfingstmontag', date: (_year, easter) => addDays(easter, 50), states: () => ALL },
  {
    name: 'Fronleichnam',
    date: (_year, easter) => addDays(easter, 60),
    states: () => ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'],
  },
  {
    name: 'Mariä Himmelfahrt',
    date: (year) => new Date(year, 7, 15),
    states: () => ['SL'],
  },
  {
    name: 'Weltkindertag',
    date: (year) => new Date(year, 8, 20),
    states: (year) => (year >= 2019 ? ['TH'] : []),
  },
  { name: 'Tag der Deutschen Einheit', date: (year) => new Date(year, 9, 3), states: () => ALL },
  {
    name: 'Reformationstag',
    date: (year) => new Date(year, 9, 31),
    states: (year) => (year >= 2018 ? ['BB', 'MV', 'SN', 'ST', 'TH', 'HB', 'HH', 'NI', 'SH'] : ['BB', 'MV', 'SN', 'ST', 'TH']),
  },
  {
    name: 'Allerheiligen',
    date: (year) => new Date(year, 10, 1),
    states: () => ['BW', 'BY', 'NW', 'RP', 'SL'],
  },
  {
    name: 'Buß- und Bettag',
    date: (year) => {
      // Mittwoch vor dem 23. November (strikt davor, auch wenn der 23. selbst ein Mittwoch ist).
      const reference = new Date(year, 10, 23);
      const daysSinceWednesday = ((reference.getDay() - 3 + 7) % 7) || 7;
      return addDays(reference, -daysSinceWednesday);
    },
    states: () => ['SN'],
  },
  { name: '1. Weihnachtstag', date: (year) => new Date(year, 11, 25), states: () => ALL },
  { name: '2. Weihnachtstag', date: (year) => new Date(year, 11, 26), states: () => ALL },
];

/** Gesetzliche Feiertage für ein Bundesland in einem Jahr. */
export function getHolidays(year: number, bundesland: Bundesland): Holiday[] {
  const easterSunday = calculateEasterSunday(year);
  return HOLIDAY_RULES.filter((rule) => rule.states(year).includes(bundesland)).map((rule) => ({
    date: rule.date(year, easterSunday),
    name: rule.name,
  }));
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getHolidayMap(year: number, bundesland: Bundesland): Map<string, string> {
  const map = new Map<string, string>();
  for (const holiday of getHolidays(year, bundesland)) {
    map.set(dateKey(holiday.date), holiday.name);
  }
  return map;
}
