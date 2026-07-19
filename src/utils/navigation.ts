export function projectsPath(year: number): string {
  return `/projekte/${year}`;
}

export function dashboardPath(year: number): string {
  return `/dashboard/${year}`;
}

export function settingsPath(): string {
  return '/einstellungen';
}

export function yearPath(year: number): string {
  return `/jahr/${year}`;
}

/** month1to12: 1-12 (human-friendly, matches the URL), not the JS Date 0-11 convention. */
export function monthPath(year: number, month1to12: number): string {
  return `/monat/${year}/${month1to12}`;
}

/** Sensible default month (1-12) to land on when switching from year to month view. */
export function defaultMonthForYear(year: number): number {
  const today = new Date();
  return today.getFullYear() === year ? today.getMonth() + 1 : 1;
}
