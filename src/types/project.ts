import { tokens } from '@fluentui/react-components';
import { lightPalette } from '../theme/palette';
import { WORK_LOCATIONS, type WorkLocation } from './workLocation';

export type Chargeable = 'yes' | 'no' | 'neutral';

/** Bold/saturated per-state colors so Ja/Nein/Neutral stay clearly distinguishable wherever a project's Chargeable is shown. */
export const CHARGEABLE_COLORS: Record<Chargeable, string> = {
  yes: tokens.colorPaletteGreenForeground3,
  no: tokens.colorPaletteBerryForeground3,
  neutral: tokens.colorNeutralForeground2,
};

export interface ContingentEntry {
  id: string;
  label: string;
  /** ISO date (YYYY-MM-DD) */
  periodStart: string;
  /** ISO date (YYYY-MM-DD) */
  periodEnd: string;
  days: number;
  /** 12 entries per year (index 0 = Januar), one decimal place. */
  forecastByYear: Record<number, number[]>;
  notes: string;
  /** Optionale Vorgabe: bei Buchungen unter diesem Kontingent wählbare Arbeitsorte. Leer = keine Einschränkung. */
  workLocations: WorkLocation[];
}

export interface Project {
  id: string;
  order: number;
  name: string;
  client: string;
  chargeable: Chargeable;
  color: string;
  /** Data URL of an uploaded PNG/JPG/SVG logo, if any. */
  image?: string;
  /** False for projects tracked without a fixed day budget: no contingents, no forecast, shown as "--". */
  hasContingent: boolean;
  contingents: ContingentEntry[];
  notes: string;
}

export function emptyForecastMonths(): number[] {
  return new Array(12).fill(0);
}

export function totalDays(project: Project): number {
  return project.contingents.reduce((sum, entry) => sum + entry.days, 0);
}

export function contingentForecastTotal(entry: ContingentEntry, year: number): number {
  return (entry.forecastByYear[year] ?? emptyForecastMonths()).reduce((sum, value) => sum + value, 0);
}

/** Sums forecast across every year, so the over-budget state doesn't change when switching the selected year. */
export function isContingentOverBudget(entry: ContingentEntry): boolean {
  const total = Object.keys(entry.forecastByYear).reduce(
    (sum, year) => sum + contingentForecastTotal(entry, Number(year)),
    0,
  );
  return total > entry.days;
}

export function projectForecastMonth(project: Project, year: number, monthIndex: number): number {
  return project.contingents.reduce((sum, entry) => sum + (entry.forecastByYear[year]?.[monthIndex] ?? 0), 0);
}

/** Parses a `YYYY-MM-DD` date input value as a local date, matching how `monthStart`/`monthEnd` below are built. */
function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whether a given month falls inside the contingent's Von/Bis period. No period set = always active. */
export function isMonthInPeriod(entry: ContingentEntry, year: number, monthIndex: number): boolean {
  if (!entry.periodStart || !entry.periodEnd) {
    return true;
  }
  const monthStart = new Date(year, monthIndex, 1);
  const nextMonthStart = new Date(year, monthIndex + 1, 1);
  const periodStart = parseLocalDate(entry.periodStart);
  const periodEnd = parseLocalDate(entry.periodEnd);
  return nextMonthStart > periodStart && monthStart <= periodEnd;
}

/** Whether a contingent's Von/Bis period overlaps the given year at all. No period set = always active. */
export function contingentAppliesToYear(entry: ContingentEntry, year: number): boolean {
  if (!entry.periodStart || !entry.periodEnd) {
    return true;
  }
  const periodStart = parseLocalDate(entry.periodStart);
  const periodEnd = parseLocalDate(entry.periodEnd);
  return periodStart <= new Date(year, 11, 31) && periodEnd >= new Date(year, 0, 1);
}

/** Whether a project should appear in the Dashboard's project list: no fixed Kontingent at all, or one that applies to `year`. */
export function isProjectRelevantForYear(project: Project, year: number): boolean {
  return !project.hasContingent || project.contingents.some((entry) => contingentAppliesToYear(entry, year));
}

/** Whether any of a project's contingent entries active in `year` define an Arbeitsorte-Vorgabe. */
export function projectHasLocationVorgabe(project: Project, year: number): boolean {
  return project.contingents.some((entry) => entry.workLocations.length > 0 && contingentAppliesToYear(entry, year));
}

/**
 * Month index (0-11) within `year` that `entry`'s Kontingent days become part of the running
 * total - `null` if the period doesn't start until a later year (not yet active in `year`). No
 * period set = always active (month 0), matching `contingentAppliesToYear`'s default.
 */
function contingentStartMonthInYear(entry: ContingentEntry, year: number): number | null {
  if (!entry.periodStart) return 0;
  const start = parseLocalDate(entry.periodStart);
  if (start.getFullYear() < year) return 0;
  if (start.getFullYear() > year) return null;
  return start.getMonth();
}

/**
 * Cumulative Kontingent (Tage) available by month, 12 entries (index 0 = Januar) - handles a
 * project with several contingent entries (e.g. a mid-year Nachtrag/contract renewal): each
 * entry's days join the running total starting the month its Von-period begins, and stay part of
 * the total for the rest of `year` even if the entry's own period later ends (a granted Kontingent
 * doesn't shrink back down mid-year, it only ever grows as new entries kick in).
 */
export function budgetByMonthForYear(project: Project, year: number): number[] {
  const months = emptyForecastMonths();
  for (const entry of project.contingents) {
    const startMonth = contingentStartMonthInYear(entry, year);
    if (startMonth === null) continue;
    for (let m = startMonth; m < 12; m++) {
      months[m] += entry.days;
    }
  }
  return months;
}

export function createEmptyContingentEntry(): ContingentEntry {
  return {
    id: crypto.randomUUID(),
    label: '',
    periodStart: '',
    periodEnd: '',
    days: 0,
    forecastByYear: {},
    notes: '',
    workLocations: [],
  };
}

export function createEmptyProject(order: number): Project {
  return {
    id: crypto.randomUUID(),
    order,
    name: '',
    client: '',
    chargeable: 'neutral',
    color: lightPalette.accent,
    hasContingent: true,
    contingents: [],
    notes: '',
  };
}

/**
 * Repairs records written by older versions of the schema, so a stale IndexedDB
 * record can never crash the app. Handles, in order of age:
 *  - the original shape (`contingent: number`, `forecastByYear` on the project)
 *  - the 2026-07-18 shape (`contingents: { id, amount, periodStart, periodEnd }[]`,
 *    still `forecastByYear` on the project, no `label`/`days`/`order`)
 *  - the current shape (forecast + label + days live on each contingent, project has `order`)
 *  - `hasContingent` (2026-07-18): missing on any record older than this defaults to `true`.
 *  - `notes` (2026-07-18): missing on any record older than this defaults to `''` (on both the
 *    project and each contingent entry).
 *  - `workLocations` (2026-07-19): missing, or containing invalid values, on any contingent entry
 *    older than this defaults to `[]` (no Arbeitsorte-Vorgabe/restriction).
 */
export function normalizeProject(raw: Record<string, unknown>, fallbackOrder: number): Project {
  const rawContingents = Array.isArray(raw.contingents) ? (raw.contingents as Record<string, unknown>[]) : [];
  const legacyContingent = raw.contingent;
  const legacyProjectForecast =
    raw.forecastByYear && typeof raw.forecastByYear === 'object'
      ? (raw.forecastByYear as Record<number, number[]>)
      : undefined;

  let contingents: ContingentEntry[];
  if (rawContingents.length > 0) {
    contingents = rawContingents.map((entry, index) => ({
      id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
      label: typeof entry.label === 'string' ? entry.label : '',
      periodStart: typeof entry.periodStart === 'string' ? entry.periodStart : '',
      periodEnd: typeof entry.periodEnd === 'string' ? entry.periodEnd : '',
      days: typeof entry.days === 'number' ? entry.days : typeof entry.amount === 'number' ? entry.amount : 0,
      forecastByYear:
        entry.forecastByYear && typeof entry.forecastByYear === 'object'
          ? (entry.forecastByYear as Record<number, number[]>)
          : index === 0 && legacyProjectForecast
            ? legacyProjectForecast
            : {},
      notes: typeof entry.notes === 'string' ? entry.notes : '',
      workLocations: Array.isArray(entry.workLocations)
        ? (entry.workLocations as unknown[]).filter((value): value is WorkLocation =>
            WORK_LOCATIONS.includes(value as WorkLocation),
          )
        : [],
    }));
  } else if (typeof legacyContingent === 'number' && legacyContingent !== 0) {
    contingents = [
      {
        id: crypto.randomUUID(),
        label: '',
        periodStart: '',
        periodEnd: '',
        days: legacyContingent,
        forecastByYear: legacyProjectForecast ?? {},
        notes: '',
        workLocations: [],
      },
    ];
  } else {
    contingents = [];
  }

  return {
    id: String(raw.id),
    order: typeof raw.order === 'number' ? raw.order : fallbackOrder,
    name: typeof raw.name === 'string' ? raw.name : '',
    client: typeof raw.client === 'string' ? raw.client : '',
    chargeable: raw.chargeable === 'yes' || raw.chargeable === 'no' ? raw.chargeable : 'neutral',
    color: typeof raw.color === 'string' ? raw.color : lightPalette.accent,
    image: typeof raw.image === 'string' ? raw.image : undefined,
    hasContingent: typeof raw.hasContingent === 'boolean' ? raw.hasContingent : true,
    contingents,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
}
