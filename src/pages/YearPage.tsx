import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { YearOverview } from '../components/YearOverview';
import { useManualBackup } from '../hooks/useManualBackup';
import type { ThemeMode } from '../theme/useThemeMode';
import { dashboardPath, defaultMonthForYear, monthPath, projectsPath, settingsPath, yearPath } from '../utils/navigation';
import { saveLastView } from '../utils/lastView';

interface YearPageProps {
  isDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
}

export function YearPage({ isDark, onSetThemeMode }: YearPageProps) {
  const { year: yearParam } = useParams();
  const navigate = useNavigate();
  const year = Number(yearParam) || new Date().getFullYear();
  const onManualBackup = useManualBackup();

  useEffect(() => {
    saveLastView(yearPath(year));
  }, [year]);

  return (
    <PageLayout
      view="year"
      label={String(year)}
      year={year}
      onPickYear={(y) => navigate(yearPath(y))}
      onPrev={() => navigate(yearPath(year - 1))}
      onNext={() => navigate(yearPath(year + 1))}
      onSwitchToProjects={() => navigate(projectsPath(year))}
      onSwitchToYear={() => navigate(yearPath(year))}
      onSwitchToMonth={() => navigate(monthPath(year, defaultMonthForYear(year)))}
      onSwitchToDashboard={() => navigate(dashboardPath(year))}
      isDark={isDark}
      onSetThemeMode={onSetThemeMode}
      onOpenSettings={() => navigate(settingsPath())}
      onManualBackup={onManualBackup}
    >
      <YearOverview year={year} />
    </PageLayout>
  );
}
