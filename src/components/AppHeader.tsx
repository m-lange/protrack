import { useState } from 'react';
import { Button, Tab, TabList, Text, Title2, ToggleButton, makeStyles, tokens } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import {
  ChevronLeft24Regular,
  ChevronRight24Regular,
  PanelRight24Regular,
  Save24Regular,
  Settings24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from '@fluentui/react-icons';
import type { ThemeMode } from '../theme/useThemeMode';
import { HeaderDatePicker } from './HeaderDatePicker';
import { MonthQuickOverviewDialog } from './MonthQuickOverviewDialog';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalXL,
    paddingBottom: tokens.spacingVerticalL,
    paddingInline: tokens.spacingHorizontalXXXL,
    borderBottomWidth: tokens.strokeWidthThin,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXL,
    flex: '1 1 0',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flex: '1 1 0',
    justifyContent: 'center',
  },
  label: {
    minWidth: '160px',
    textAlign: 'center',
  },
  themeToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flex: '1 1 0',
    justifyContent: 'flex-end',
  },
});

export type AppView = 'projects' | 'year' | 'month' | 'dashboard' | 'settings';

interface AppHeaderProps {
  view: AppView;
  label: string;
  year: number;
  month1to12?: number;
  onPickYear?: (year: number) => void;
  onPickMonth?: (year: number, month1to12: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSwitchToProjects: () => void;
  onSwitchToYear: () => void;
  onSwitchToMonth: () => void;
  onSwitchToDashboard: () => void;
  isDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
  onOpenSettings: () => void;
  onManualBackup: () => void;
}

export function AppHeader({
  view,
  label,
  year,
  month1to12,
  onPickYear,
  onPickMonth,
  onPrev,
  onNext,
  onSwitchToProjects,
  onSwitchToYear,
  onSwitchToMonth,
  onSwitchToDashboard,
  isDark,
  onSetThemeMode,
  onOpenSettings,
  onManualBackup,
}: AppHeaderProps) {
  const styles = useStyles();
  const [monthOverviewOpen, setMonthOverviewOpen] = useState(false);
  const [monthOverviewTarget, setMonthOverviewTarget] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month0to11: now.getMonth() };
  });

  const openMonthOverview = () => {
    if (view === 'month' && month1to12) {
      setMonthOverviewTarget({ year, month0to11: month1to12 - 1 });
    } else {
      const now = new Date();
      setMonthOverviewTarget({ year: now.getFullYear(), month0to11: now.getMonth() });
    }
    setMonthOverviewOpen(true);
  };

  const labelText = (
    <Text size={600} weight="semibold" font="numeric" className={styles.label}>
      {label}
    </Text>
  );

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    if (data.value === 'projects') {
      onSwitchToProjects();
    } else if (data.value === 'year') {
      onSwitchToYear();
    } else if (data.value === 'month') {
      onSwitchToMonth();
    } else {
      onSwitchToDashboard();
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.left}>
          <Title2>ProTrack</Title2>
          <TabList selectedValue={view} onTabSelect={handleTabSelect}>
            <Tab value="dashboard">Dashboard</Tab>
            <Tab value="projects">Projekte</Tab>
            <Tab value="year">Jahr</Tab>
            <Tab value="month">Monat</Tab>
          </TabList>
        </div>

        <div className={styles.nav}>
          <Button appearance="subtle" icon={<ChevronLeft24Regular />} onClick={onPrev} aria-label="Zurück" title="Zurück" />
          {(view === 'year' || view === 'settings') && onPickYear ? (
            <HeaderDatePicker mode="year" year={year} onSelectYear={onPickYear}>
              {labelText}
            </HeaderDatePicker>
          ) : view === 'month' && onPickMonth && month1to12 ? (
            <HeaderDatePicker mode="month" year={year} month1to12={month1to12} onSelectMonth={onPickMonth}>
              {labelText}
            </HeaderDatePicker>
          ) : (
            labelText
          )}
          <Button appearance="subtle" icon={<ChevronRight24Regular />} onClick={onNext} aria-label="Weiter" title="Weiter" />
        </div>

        <div className={styles.themeToggle}>
          <Button
            appearance="subtle"
            shape="circular"
            icon={<PanelRight24Regular />}
            onClick={openMonthOverview}
            aria-label="Monatsübersicht"
            title="Monatsübersicht"
          />
          <Button
            appearance="subtle"
            shape="circular"
            icon={<Save24Regular />}
            onClick={onManualBackup}
            aria-label="Jetzt sichern"
            title="Jetzt sichern"
          />
          <Button
            appearance="subtle"
            shape="circular"
            icon={<Settings24Regular />}
            onClick={onOpenSettings}
            aria-label="Einstellungen"
            title="Einstellungen"
          />
          <ToggleButton
            appearance="subtle"
            shape="circular"
            icon={<WeatherSunny24Regular />}
            checked={!isDark}
            onClick={() => onSetThemeMode('light')}
            aria-label="Helles Design"
            title="Helles Design"
          />
          <ToggleButton
            appearance="subtle"
            shape="circular"
            icon={<WeatherMoon24Regular />}
            checked={isDark}
            onClick={() => onSetThemeMode('dark')}
            aria-label="Dunkles Design"
            title="Dunkles Design"
          />
        </div>
      </header>
      <MonthQuickOverviewDialog
        open={monthOverviewOpen}
        year={monthOverviewTarget.year}
        month0to11={monthOverviewTarget.month0to11}
        onClose={() => setMonthOverviewOpen(false)}
      />
    </>
  );
}
