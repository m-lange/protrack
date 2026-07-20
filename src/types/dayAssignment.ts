import type { ContingentEntry, Project } from './project';
import { WORK_LOCATIONS, type WorkLocation } from './workLocation';

/** Standard workday used to split hours evenly when a project is added to/removed from a day. */
const DEFAULT_DAY_HOURS = 8;

export interface DayAssignment {
  id: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  projectId: string;
  /** Hours spent on this project on this date. Not constrained to sum to a fixed total. */
  hours: number;
  /** Arbeitsort dieser Buchung, falls gesetzt. Wird ausschließlich im Aufwand-verteilen-Dialog gepflegt. */
  location: WorkLocation | null;
}

export function createDayAssignment(
  date: string,
  projectId: string,
  hours: number,
  location: WorkLocation | null = null,
): DayAssignment {
  return { id: crypto.randomUUID(), date, projectId, hours, location };
}

/** Whether a given day falls inside the contingent's Von/Bis period. No period set = always active. */
export function isDayInPeriod(periodStart: string, periodEnd: string, date: string): boolean {
  if (!periodStart || !periodEnd) {
    return true;
  }
  return date >= periodStart && date <= periodEnd;
}

/** Projects selectable for a given day: no fixed contingent, or a contingent whose period covers the day. */
export function eligibleProjectsForDay(projects: Project[], date: string): Project[] {
  return projects.filter(
    (project) =>
      !project.hasContingent ||
      project.contingents.some((entry) => isDayInPeriod(entry.periodStart, entry.periodEnd, date)),
  );
}

/** The contingent entries (if any) whose Von/Bis period covers `date`, i.e. those governing a booking made on that day. */
export function contingentEntriesForDate(project: Project, date: string): ContingentEntry[] {
  return project.contingents.filter((entry) => isDayInPeriod(entry.periodStart, entry.periodEnd, date));
}

/**
 * Arbeitsorte, die für eine Buchung dieses Projekts an `date` wählbar sind: die Vereinigung der
 * Vorgaben aller an diesem Tag greifenden Kontingente (eine Buchung ist keinem bestimmten
 * Kontingent-Eintrag zugeordnet, überlappen sich also z.B. ein Vor-Ort- und ein Homeoffice-Kontingent
 * für denselben Zeitraum, müssen beide Vorgaben wählbar sein). Hat keines der greifenden Kontingente
 * eine Vorgabe gesetzt (oder greift keines), gilt keine Einschränkung. Immer in der kanonischen
 * `WORK_LOCATIONS`-Reihenfolge, unabhängig davon, in welcher Reihenfolge die Vorgaben ursprünglich
 * angeklickt/gespeichert wurden.
 */
export function allowedWorkLocationsForBooking(project: Project, date: string): WorkLocation[] {
  const entries = contingentEntriesForDate(project, date);
  if (entries.length === 0 || entries.some((entry) => entry.workLocations.length === 0)) return WORK_LOCATIONS;
  const union = new Set<WorkLocation>();
  for (const entry of entries) {
    for (const loc of entry.workLocations) union.add(loc);
  }
  return WORK_LOCATIONS.filter((loc) => union.has(loc));
}

/** The first explicitly set Arbeitsort among a day's bookings, used as the day's "established" location when deciding whether a newly added project conflicts with what's already booked that day. */
export function dominantLocationForDay(assignments: DayAssignment[]): WorkLocation | null {
  return assignments.find((a) => a.location)?.location ?? null;
}

/** The Arbeitsort of this project's most recently dated booking that has one set, if any - used to default a new booking to whatever was used last for this project. */
export function lastUsedLocationForProject(assignments: DayAssignment[], projectId: string): WorkLocation | null {
  let latest: DayAssignment | null = null;
  for (const assignment of assignments) {
    if (assignment.projectId !== projectId || !assignment.location) continue;
    if (!latest || assignment.date > latest.date) {
      latest = assignment;
    }
  }
  return latest?.location ?? null;
}

/**
 * How a newly booked project's Arbeitsort-Vorgabe should be defaulted:
 * `none` - nothing to auto-fill (no history for this project and either no Arbeitsort established
 * yet by the day's other bookings, or it allows the established one) - left without an explicit
 * Arbeitsort.
 * `auto` - either this project's Vorgabe leaves exactly one possible location, or (with several
 * possible locations) one was found either from this project's own booking history or - failing
 * that - because it's the day's already-established Arbeitsort.
 * `ambiguous` - several possible locations, no usable history, and it conflicts with the day's
 * established Arbeitsort - left to the user to resolve in "Aufwand verteilen" (rendered as a "?").
 */
export type LocationResolution =
  | { kind: 'none' }
  | { kind: 'auto'; location: WorkLocation }
  | { kind: 'ambiguous' };

export function resolveLocationForNewBooking(
  project: Project,
  date: string,
  existingAssignmentsForDay: DayAssignment[],
  allAssignments: DayAssignment[],
): LocationResolution {
  const allowed = allowedWorkLocationsForBooking(project, date);
  if (allowed.length === 1) {
    return { kind: 'auto', location: allowed[0] };
  }

  // Mehrere mögliche Arbeitsorte: bevorzugt den zuletzt für dieses Projekt gewählten, sofern einer
  // bekannt und weiterhin zulässig ist - unabhängig davon, ob der Tag schon einen Arbeitsort hat.
  const lastUsed = lastUsedLocationForProject(allAssignments, project.id);
  if (lastUsed && allowed.includes(lastUsed)) {
    return { kind: 'auto', location: lastUsed };
  }

  const dayLocation = dominantLocationForDay(existingAssignmentsForDay);
  if (!dayLocation || allowed.includes(dayLocation)) {
    return { kind: 'none' };
  }
  return { kind: 'ambiguous' };
}

/** Redistributes a date's assignments evenly across a standard workday, e.g. after adding or removing one. */
export function withEvenHours(assignments: DayAssignment[]): DayAssignment[] {
  if (assignments.length === 0) return assignments;
  const hours = DEFAULT_DAY_HOURS / assignments.length;
  return assignments.map((assignment) => ({ ...assignment, hours }));
}
