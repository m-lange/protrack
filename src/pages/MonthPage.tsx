import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { MonthOverview } from '../components/MonthOverview';
import { MONTH_NAMES } from '../utils/calendarGrid';
import { getHolidayMap } from '../utils/holidays';
import { useResolvedYearSettings } from '../hooks/useYearSettings';
import { DEFAULT_YEAR_SETTINGS } from '../types/yearSettings';
import { useManualBackup } from '../hooks/useManualBackup';
import type { ThemeMode } from '../theme/useThemeMode';
import { dashboardPath, monthPath, projectsPath, settingsPath, yearPath } from '../utils/navigation';
import { saveLastView } from '../utils/lastView';

interface MonthPageProps {
  isDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
}

export function MonthPage({ isDark, onSetThemeMode }: MonthPageProps) {
  const { year: yearParam, month: monthParam } = useParams();
  const navigate = useNavigate();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month1to12 = Math.min(12, Math.max(1, Number(monthParam) || now.getMonth() + 1));
  const month0to11 = month1to12 - 1;

  useEffect(() => {
    saveLastView(monthPath(year, month1to12));
  }, [year, month1to12]);

  const resolvedSettings = useResolvedYearSettings(year);
  const settings = resolvedSettings?.settings;
  const bundesland = settings?.bundesland ?? DEFAULT_YEAR_SETTINGS.bundesland;
  const holidayMap = useMemo(() => getHolidayMap(year, bundesland), [year, bundesland]);
  const onManualBackup = useManualBackup();

  const goToMonth = (targetYear: number, targetMonth0to11: number) => {
    const wrappedYear = targetYear + Math.floor(targetMonth0to11 / 12);
    const wrappedMonth0to11 = ((targetMonth0to11 % 12) + 12) % 12;
    navigate(monthPath(wrappedYear, wrappedMonth0to11 + 1));
  };

  return (
    <PageLayout
      view="month"
      label={`${MONTH_NAMES[month0to11]} ${year}`}
      year={year}
      month1to12={month1to12}
      onPickMonth={(y, m) => navigate(monthPath(y, m))}
      onPrev={() => goToMonth(year, month0to11 - 1)}
      onNext={() => goToMonth(year, month0to11 + 1)}
      onSwitchToProjects={() => navigate(projectsPath(year))}
      onSwitchToYear={() => navigate(yearPath(year))}
      onSwitchToMonth={() => navigate(monthPath(year, month1to12))}
      onSwitchToDashboard={() => navigate(dashboardPath(year))}
      isDark={isDark}
      onSetThemeMode={onSetThemeMode}
      onOpenSettings={() => navigate(settingsPath())}
      onManualBackup={onManualBackup}
    >
      <MonthOverview
        year={year}
        month={month0to11}
        holidayMap={holidayMap}
        bundesland={bundesland}
        targetChargeability={settings?.targetChargeability ?? DEFAULT_YEAR_SETTINGS.targetChargeability}
        targetKunde={settings?.targetKunde ?? DEFAULT_YEAR_SETTINGS.targetKunde}
        targetBuero={settings?.targetBuero ?? DEFAULT_YEAR_SETTINGS.targetBuero}
      />
    </PageLayout>
  );
}
