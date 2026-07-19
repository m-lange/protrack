import { isBundesland, type Bundesland } from './bundesland';

export interface YearSettings {
  year: number;
  bundesland: Bundesland;
  targetChargeability: number;
  targetKunde: number;
  targetBuero: number;
}

export const DEFAULT_YEAR_SETTINGS: Omit<YearSettings, 'year'> = {
  bundesland: 'HB',
  targetChargeability: 80,
  targetKunde: 10,
  targetBuero: 20,
};

export function homeofficeTarget(targetKunde: number, targetBuero: number): number {
  return 100 - targetKunde - targetBuero;
}

export function createDefaultYearSettings(year: number): YearSettings {
  return { year, ...DEFAULT_YEAR_SETTINGS };
}

/** Repariert eine potenziell veraltete/unvollständige IndexedDB-Row (analog zu `normalizeProject`). */
export function normalizeYearSettings(raw: Record<string, unknown>, year: number): YearSettings {
  return {
    year: typeof raw.year === 'number' ? raw.year : year,
    bundesland: isBundesland(raw.bundesland) ? raw.bundesland : DEFAULT_YEAR_SETTINGS.bundesland,
    targetChargeability: typeof raw.targetChargeability === 'number' ? raw.targetChargeability : DEFAULT_YEAR_SETTINGS.targetChargeability,
    targetKunde: typeof raw.targetKunde === 'number' ? raw.targetKunde : DEFAULT_YEAR_SETTINGS.targetKunde,
    targetBuero: typeof raw.targetBuero === 'number' ? raw.targetBuero : DEFAULT_YEAR_SETTINGS.targetBuero,
  };
}

/**
 * Löst die effektiven Einstellungen für `year` auf: exakter Treffer zuerst, sonst das Setting
 * mit dem größten `year <= angefragtes Jahr`, sonst feste Defaults. Das Ergebnis meldet über
 * `inheritedFromYear`, ob (und von welchem Jahr) geerbt wurde, statt für dieses Jahr explizit
 * gespeichert zu sein.
 */
export function resolveYearSettings(all: YearSettings[], year: number): { settings: YearSettings; inheritedFromYear: number | null } {
  const exact = all.find((s) => s.year === year);
  if (exact) return { settings: exact, inheritedFromYear: null };

  const earlier = all.filter((s) => s.year < year).sort((a, b) => b.year - a.year)[0];
  if (earlier) return { settings: { ...earlier, year }, inheritedFromYear: earlier.year };

  return { settings: createDefaultYearSettings(year), inheritedFromYear: null };
}
