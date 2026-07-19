import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllYearSettings, saveYearSettings } from '../db/database';
import { resolveYearSettings, type YearSettings } from '../types/yearSettings';

export function useYearSettings() {
  const [allSettings, setAllSettings] = useState<YearSettings[] | null>(null);

  useEffect(() => {
    getAllYearSettings().then(setAllSettings);
  }, []);

  const upsertYearSettings = useCallback(async (settings: YearSettings) => {
    await saveYearSettings(settings);
    setAllSettings((prev) => [...(prev ?? []).filter((s) => s.year !== settings.year), settings]);
  }, []);

  const resolveForYear = useCallback(
    (year: number) => resolveYearSettings(allSettings ?? [], year),
    [allSettings],
  );

  return { allSettings, upsertYearSettings, resolveForYear };
}

/** Convenience-Hook für Seiten, die nur die aufgelösten Settings eines einzelnen Jahres brauchen. */
export function useResolvedYearSettings(year: number) {
  const { allSettings, resolveForYear } = useYearSettings();
  return useMemo(() => (allSettings === null ? null : resolveForYear(year)), [allSettings, resolveForYear, year]);
}
