import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { PageLayout } from '../components/PageLayout';
import { BackupFileSection } from '../components/settings/BackupFileSection';
import { DataManagementSection } from '../components/settings/DataManagementSection';
import { BundeslandSection } from '../components/settings/BundeslandSection';
import { TargetsSection } from '../components/settings/TargetsSection';
import { useYearSettings } from '../hooks/useYearSettings';
import { useManualBackup } from '../hooks/useManualBackup';
import type { ThemeMode } from '../theme/useThemeMode';
import { dashboardPath, defaultMonthForYear, monthPath, projectsPath, yearPath } from '../utils/navigation';

const useStyles = makeStyles({
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, auto)',
    justifyContent: 'start',
    gap: tokens.spacingHorizontalXL,
    width: 'fit-content',
    maxWidth: '100%',
    alignSelf: 'center',
  },
});

interface SettingsPageProps {
  isDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
}

export function SettingsPage({ isDark, onSetThemeMode }: SettingsPageProps) {
  const styles = useStyles();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const { allSettings, upsertYearSettings, resolveForYear } = useYearSettings();
  const onManualBackup = useManualBackup();

  const resolved = allSettings === null ? null : resolveForYear(year);

  return (
    <PageLayout
      view="settings"
      label={String(year)}
      year={year}
      onPickYear={setYear}
      onPrev={() => setYear(year - 1)}
      onNext={() => setYear(year + 1)}
      onSwitchToProjects={() => navigate(projectsPath(year))}
      onSwitchToYear={() => navigate(yearPath(year))}
      onSwitchToMonth={() => navigate(monthPath(year, defaultMonthForYear(year)))}
      onSwitchToDashboard={() => navigate(dashboardPath(year))}
      isDark={isDark}
      onSetThemeMode={onSetThemeMode}
      onOpenSettings={() => {}}
      onManualBackup={onManualBackup}
    >
      <div className={styles.content}>
        <BackupFileSection />
        <DataManagementSection />
        {resolved !== null && (
          <>
            <BundeslandSection
              settings={resolved.settings}
              inheritedFromYear={resolved.inheritedFromYear}
              onChange={(settings) => void upsertYearSettings({ ...settings, year })}
            />
            <TargetsSection
              settings={resolved.settings}
              inheritedFromYear={resolved.inheritedFromYear}
              onChange={(settings) => void upsertYearSettings({ ...settings, year })}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
