import type { ReactNode } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { AppHeader } from './AppHeader';
import type { AppView } from './AppHeader';
import type { ThemeMode } from '../theme/useThemeMode';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: '1600px',
    marginInline: 'auto',
  },
  main: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    paddingBlock: tokens.spacingVerticalXXL,
    paddingInline: tokens.spacingHorizontalXXXL,
  },
});

interface PageLayoutProps {
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
  children: ReactNode;
}

export function PageLayout({ children, ...headerProps }: PageLayoutProps) {
  const styles = useStyles();

  return (
    <div className={styles.page}>
      <AppHeader {...headerProps} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
