import type { Bundesland } from '../types/bundesland';
import type { Chargeable, Project } from '../types/project';
import { projectForecastMonth, totalDays } from '../types/project';
import type { DayAssignment } from '../types/dayAssignment';
import type { WorkLocation } from '../types/workLocation';
import { decemberSpecialDayDeductionHours, workingDaysByMonth } from './workingDays';

/** Standard workday used elsewhere (see dayAssignment.ts) to convert booked hours into "Tage". */
const HOURS_PER_DAY = 8;

export function hoursToDays(hours: number): number {
  return hours / HOURS_PER_DAY;
}

export interface MonthlyBookings {
  /** Booked hours per project id, 12 entries (index 0 = Januar). */
  hoursByProject: Map<string, number[]>;
  /** Booked hours across all projects, 12 entries. */
  totalHoursByMonth: number[];
  /** Booked hours across all projects, split by the project's `chargeable` classification, 12 entries each. */
  hoursByChargeable: Record<Chargeable, number[]>;
  /** Für Chargeability-% verfügbare Stunden pro Monat, 12 Einträge - siehe `computeAvailableHoursByMonth`. */
  availableHoursByMonth: number[];
}

function emptyMonthArray(): number[] {
  return new Array(12).fill(0);
}

/**
 * Verfügbare Stunden pro Monat: Arbeitstage (Kalendertage minus Wochenende minus Feiertage) × 8 Std.,
 * abzüglich der auf "abwesend" gebuchten Stunden sowie - im Dezember - je 4 Std. für Heiligabend und
 * Silvester (siehe `decemberSpecialDayDeductionHours`). Bildet den Nenner für `chargeabilityPercent`,
 * damit z.B. Urlaub die Chargeability nicht verwässert.
 */
function computeAvailableHoursByMonth(year: number, bundesland: Bundesland, abwesendHoursByMonth: number[]): number[] {
  const workingDays = workingDaysByMonth(year, bundesland);
  const decemberDeduction = decemberSpecialDayDeductionHours(year, bundesland);
  return workingDays.map((days, monthIndex) => {
    const available = days * HOURS_PER_DAY - abwesendHoursByMonth[monthIndex];
    return monthIndex === 11 ? available - decemberDeduction : available;
  });
}

/** Aggregates every `DayAssignment` that falls in `year` into per-project and per-chargeable-category monthly totals. */
export function buildMonthlyBookings(
  assignments: DayAssignment[],
  projects: Project[],
  year: number,
  bundesland: Bundesland,
): MonthlyBookings {
  const hoursByProject = new Map<string, number[]>();
  const totalHoursByMonth = emptyMonthArray();
  const hoursByChargeable: Record<Chargeable, number[]> = {
    yes: emptyMonthArray(),
    no: emptyMonthArray(),
    neutral: emptyMonthArray(),
  };
  const abwesendHoursByMonth = emptyMonthArray();
  const chargeableById = new Map(projects.map((p) => [p.id, p.chargeable]));
  const yearPrefix = String(year);

  for (const assignment of assignments) {
    if (assignment.date.slice(0, 4) !== yearPrefix) continue;
    const monthIndex = Number(assignment.date.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) continue;

    const perProject = hoursByProject.get(assignment.projectId) ?? emptyMonthArray();
    perProject[monthIndex] += assignment.hours;
    hoursByProject.set(assignment.projectId, perProject);

    totalHoursByMonth[monthIndex] += assignment.hours;

    const chargeable = chargeableById.get(assignment.projectId) ?? 'neutral';
    hoursByChargeable[chargeable][monthIndex] += assignment.hours;

    if (assignment.location === 'abwesend') {
      abwesendHoursByMonth[monthIndex] += assignment.hours;
    }
  }

  return {
    hoursByProject,
    totalHoursByMonth,
    hoursByChargeable,
    availableHoursByMonth: computeAvailableHoursByMonth(year, bundesland, abwesendHoursByMonth),
  };
}

export function bookedDaysForProjectMonth(bookings: MonthlyBookings, projectId: string, monthIndex: number): number {
  return hoursToDays(bookings.hoursByProject.get(projectId)?.[monthIndex] ?? 0);
}

export function bookedDaysForProjectYear(bookings: MonthlyBookings, projectId: string): number {
  const months = bookings.hoursByProject.get(projectId) ?? emptyMonthArray();
  return hoursToDays(months.reduce((sum, hours) => sum + hours, 0));
}

/** Gebuchte abrechenbare Tage (chargeable = 'yes') pro Monat, 12 Einträge. */
export function bookedChargeableDaysByMonth(bookings: MonthlyBookings): number[] {
  return bookings.hoursByChargeable.yes.map(hoursToDays);
}

/** Forecast (Tage) der verrechenbaren Projekte (chargeable = 'yes') pro Monat, 12 Einträge - speist die "Prognose"-Linie im Abrechenbare-Tage-Chart. */
export function chargeableForecastByMonth(projects: Project[], year: number): number[] {
  const chargeableProjects = projects.filter((p) => p.chargeable === 'yes');
  return Array.from({ length: 12 }, (_, monthIndex) =>
    chargeableProjects.reduce((sum, project) => sum + projectForecastMonth(project, year, monthIndex), 0),
  );
}

/**
 * Verrechenbare Stunden im Verhältnis zu den im Monat verfügbaren Stunden (siehe
 * `computeAvailableHoursByMonth`: Arbeitstage × 8 Std., abzüglich Abwesend-Stunden und - im
 * Dezember - Heiligabend/Silvester) - nicht zu den tatsächlich gebuchten Stunden, damit ein Monat
 * mit wenigen Buchungen auch eine niedrige (statt fehlende) Chargeability zeigt. `null` nur wenn
 * der Monat keine verfügbaren Stunden hat (kommt praktisch nicht vor).
 */
export function chargeabilityPercent(bookings: MonthlyBookings, monthIndex: number): number | null {
  const availableHours = bookings.availableHoursByMonth[monthIndex];
  if (availableHours <= 0) return null;
  const billableHours = bookings.hoursByChargeable.yes[monthIndex];
  return (billableHours / availableHours) * 100;
}

/**
 * `monthsToInclude` lets the caller cap the average at the current month for the current year
 * (e.g. 7 = Januar..Juli), so future, still-empty months don't drag the year average down toward 0.
 */
export function chargeabilityPercentYear(bookings: MonthlyBookings, monthsToInclude = 12): number | null {
  const totalAvailableHours = bookings.availableHoursByMonth.slice(0, monthsToInclude).reduce((sum, hours) => sum + hours, 0);
  if (totalAvailableHours <= 0) return null;
  const billableHoursYear = bookings.hoursByChargeable.yes.slice(0, monthsToInclude).reduce((sum, hours) => sum + hours, 0);
  return (billableHoursYear / totalAvailableHours) * 100;
}

export type DeviationStatus = 'over' | 'under' | 'onTrack';

/** Booked vs. forecast deviation for a single project/month, in "Tage". A small tolerance avoids flagging rounding noise. */
export function deviationStatus(bookedDays: number, forecastDays: number, toleranceDays = 0.25): DeviationStatus {
  const delta = bookedDays - forecastDays;
  if (Math.abs(delta) <= toleranceDays) return 'onTrack';
  return delta > 0 ? 'over' : 'under';
}

export interface ProjectYearSummary {
  project: Project;
  bookedDays: number;
  forecastDays: number;
  budgetDays: number;
  budgetRatio: number | null;
  overBudget: boolean;
}

export function buildProjectYearSummaries(projects: Project[], bookings: MonthlyBookings, year: number): ProjectYearSummary[] {
  return projects.map((project) => {
    const bookedDays = bookedDaysForProjectYear(bookings, project.id);
    const forecastDays = Array.from({ length: 12 }, (_, m) => projectForecastMonth(project, year, m)).reduce(
      (sum, value) => sum + value,
      0,
    );
    const budgetDays = totalDays(project);
    return {
      project,
      bookedDays,
      forecastDays,
      budgetDays,
      budgetRatio: project.hasContingent && budgetDays > 0 ? bookedDays / budgetDays : null,
      overBudget: project.hasContingent && budgetDays > 0 && bookedDays > budgetDays,
    };
  });
}

export interface BiggestDeviation {
  project: Project;
  monthIndex: number;
  bookedDays: number;
  forecastDays: number;
  deltaDays: number;
}

/** The single project/month combination with the largest |booked - forecast|, used to call out what needs attention. */
export function findBiggestDeviation(projects: Project[], bookings: MonthlyBookings, year: number): BiggestDeviation | null {
  let best: BiggestDeviation | null = null;
  for (const project of projects) {
    if (!project.hasContingent) continue;
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const bookedDays = bookedDaysForProjectMonth(bookings, project.id, monthIndex);
      const forecastDays = projectForecastMonth(project, year, monthIndex);
      const deltaDays = bookedDays - forecastDays;
      if (best === null || Math.abs(deltaDays) > Math.abs(best.deltaDays)) {
        best = { project, monthIndex, bookedDays, forecastDays, deltaDays };
      }
    }
  }
  return best && Math.abs(best.deltaDays) > 0.05 ? best : null;
}

export interface MonthlyLocations {
  /** Anzahl Tage pro Arbeitsort, 12 Einträge je Ort (Index 0 = Januar). */
  daysByLocation: Record<WorkLocation, number[]>;
}

/** Aggregates every `DayAssignment`'s Arbeitsort that falls in `year` into monthly "Tage" (Stunden/8) per `WorkLocation`. */
export function buildMonthlyLocations(assignments: DayAssignment[], year: number): MonthlyLocations {
  const daysByLocation: Record<WorkLocation, number[]> = {
    kunde: emptyMonthArray(),
    homeoffice: emptyMonthArray(),
    buero: emptyMonthArray(),
    abwesend: emptyMonthArray(),
  };
  const yearPrefix = String(year);

  for (const assignment of assignments) {
    if (!assignment.location) continue;
    if (assignment.date.slice(0, 4) !== yearPrefix) continue;
    const monthIndex = Number(assignment.date.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) continue;
    daysByLocation[assignment.location][monthIndex] += hoursToDays(assignment.hours);
  }

  return { daysByLocation };
}

/** Kunde/Büro/Home Office bilden zusammen den Nenner für `locationPercent`/`locationPercentYear` - Abwesend zählt weder zum Zähler noch zum Nenner. */
const CHART_LOCATIONS: WorkLocation[] = ['kunde', 'buero', 'homeoffice'];

/**
 * Anteil eines Arbeitsorts (Kunde/Büro/Home Office) an den im Monat auf diese drei Orte gebuchten
 * Tagen - rein das Verhältnis der gebuchten Tage untereinander, unabhängig von Arbeitstagen/Feiertagen/
 * Abwesenheit. `abwesend` selbst ist als Ort hier nicht sinnvoll (siehe `CHART_LOCATIONS`) und wird
 * stattdessen als absoluter Stunden-/Tage-Wert angezeigt (`LocationCompositionChart`). `null` nur wenn
 * der Monat noch keine Kunde/Büro/Home-Office-Buchung hat.
 */
export function locationPercent(monthly: MonthlyLocations, location: WorkLocation, monthIndex: number): number | null {
  const totalDays = CHART_LOCATIONS.reduce((sum, key) => sum + monthly.daysByLocation[key][monthIndex], 0);
  if (totalDays <= 0) return null;
  return (monthly.daysByLocation[location][monthIndex] / totalDays) * 100;
}

/** `monthsToInclude` - see `chargeabilityPercentYear` for why the current year caps this at the current month. */
export function locationPercentYear(monthly: MonthlyLocations, location: WorkLocation, monthsToInclude = 12): number | null {
  const daysOverRange = (key: WorkLocation) => monthly.daysByLocation[key].slice(0, monthsToInclude).reduce((sum, days) => sum + days, 0);
  const totalDays = CHART_LOCATIONS.reduce((sum, key) => sum + daysOverRange(key), 0);
  if (totalDays <= 0) return null;
  return (daysOverRange(location) / totalDays) * 100;
}

export function emptyWorkLocationRecord(): Record<WorkLocation, number[]> {
  return { kunde: emptyMonthArray(), buero: emptyMonthArray(), homeoffice: emptyMonthArray(), abwesend: emptyMonthArray() };
}

/**
 * Gebuchte Stunden pro Monat, gruppiert nach dem Arbeitsort der jeweiligen Buchung. Speist
 * `LocationCompositionChart`, das analog zu `CompositionChart` funktioniert, nur mit
 * Kunde/Büro/Home Office/Abwesend statt verrechenbar/nicht verrechenbar/neutral als Segmenten -
 * anders als `locationPercent` (das Abwesend als Abzug behandelt, siehe dort) zeigt dieser Chart
 * Abwesend als eigenes Segment mit den tatsächlich gebuchten Stunden.
 */
export function buildHoursByLocation(assignments: DayAssignment[], year: number): Record<WorkLocation, number[]> {
  const result = emptyWorkLocationRecord();
  const yearPrefix = String(year);

  for (const assignment of assignments) {
    if (assignment.date.slice(0, 4) !== yearPrefix) continue;
    const monthIndex = Number(assignment.date.slice(5, 7)) - 1;
    if (monthIndex < 0 || monthIndex > 11) continue;

    const location = assignment.location;
    if (!location) continue;

    result[location][monthIndex] += assignment.hours;
  }

  return result;
}

/**
 * Gebuchte Tage eines einzelnen Projekts im Jahr (oder, mit `monthIndex`, in nur einem Monat davon),
 * gruppiert nach dem Arbeitsort der jeweiligen Buchung - zeigt, wie sich ein Kontingent mit
 * Arbeitsorte-Vorgabe (siehe `ContingentEntry.workLocations`) tatsächlich auf die vorgegebenen
 * (oder auch andere) Orte verteilt hat.
 */
export function projectBookedDaysByLocation(
  assignments: DayAssignment[],
  projectId: string,
  year: number,
  monthIndex?: number,
): Partial<Record<WorkLocation, number>> {
  const result: Partial<Record<WorkLocation, number>> = {};
  const yearPrefix = String(year);

  for (const assignment of assignments) {
    if (assignment.projectId !== projectId || !assignment.location) continue;
    if (assignment.date.slice(0, 4) !== yearPrefix) continue;
    if (monthIndex !== undefined && Number(assignment.date.slice(5, 7)) - 1 !== monthIndex) continue;
    result[assignment.location] = (result[assignment.location] ?? 0) + hoursToDays(assignment.hours);
  }

  return result;
}

export interface MonthProjectSummary {
  project: Project;
  /** Insgesamt für dieses Projekt in diesem Monat gebuchte Tage. */
  bookedDays: number;
  /** Dieselben Tage, aufgeschlüsselt nach dem Arbeitsort des jeweiligen Buchungstages. */
  daysByLocation: Partial<Record<WorkLocation, number>>;
  /** Forecast (Tage) für diesen Monat. `null` bei Projekten ohne festes Kontingent. */
  forecastDays: number | null;
  /** Verbleibendes Kontingent, kumuliert über das ganze Jahr bis inkl. diesem Monat. `null` bei Projekten ohne festes Kontingent. */
  remainingDays: number | null;
  /** `remainingDays` relativ zum gesamten Kontingent (0-1). `null` bei Projekten ohne festes Kontingent. */
  remainingRatio: number | null;
  /** Verbleibendes Kontingent ist negativ, d.h. das Jahres-Kontingent ist bereits überschritten. */
  overBudget: boolean;
  /** Abweichung der gebuchten Tage dieses Monats vom Forecast dieses Monats. */
  deviation: DeviationStatus;
}

/**
 * Ein Eintrag pro Projekt, das im gegebenen Monat mindestens eine Buchung hat (nur "ausgewählte"
 * Projekte, keine vollständige Projektliste) - speist die Monatsansicht-Tabelle unter dem Kalender.
 */
export function buildMonthProjectSummaries(
  projects: Project[],
  assignments: DayAssignment[],
  year: number,
  monthIndex: number,
  bundesland: Bundesland,
): MonthProjectSummary[] {
  const yearPrefix = String(year);
  const bookedProjectIds = new Set(
    assignments
      .filter((a) => a.date.slice(0, 4) === yearPrefix && Number(a.date.slice(5, 7)) - 1 === monthIndex)
      .map((a) => a.projectId),
  );
  const bookings = buildMonthlyBookings(assignments, projects, year, bundesland);

  return projects
    .filter((project) => bookedProjectIds.has(project.id))
    .map((project) => {
      const bookedDays = bookedDaysForProjectMonth(bookings, project.id, monthIndex);
      const budgetDays = totalDays(project);
      const hasContingent = project.hasContingent && budgetDays > 0;
      const remainingDays = hasContingent ? budgetDays - bookedDaysForProjectYear(bookings, project.id) : null;
      const forecastDays = hasContingent ? projectForecastMonth(project, year, monthIndex) : null;
      return {
        project,
        bookedDays,
        daysByLocation: projectBookedDaysByLocation(assignments, project.id, year, monthIndex),
        forecastDays,
        remainingDays,
        remainingRatio: remainingDays !== null ? remainingDays / budgetDays : null,
        overBudget: remainingDays !== null && remainingDays < 0,
        deviation: hasContingent ? deviationStatus(bookedDays, forecastDays ?? 0) : 'onTrack',
      };
    })
    .sort((a, b) => a.project.order - b.project.order);
}
