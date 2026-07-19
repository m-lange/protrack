import type { ReactNode } from 'react';
import { Card, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  // Shrink-wraps to its (now fixed-width) content instead of stretching to fill its flex parent,
  // and never shrinks below that width either - so a row of these can overflow its container and
  // let the page scroll, instead of the cards themselves being squeezed or clipped (Card's own
  // base style is `overflow: hidden`, which would otherwise silently crop wider content).
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    minWidth: '0px',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
});

interface DashboardCardProps {
  className?: string;
  children: ReactNode;
}

/** Shared card surface for the dashboard's charts and table, matching the KPI tiles' Card look. */
export function DashboardCard({ className, children }: DashboardCardProps) {
  const styles = useStyles();
  return <Card className={mergeClasses(styles.card, className)}>{children}</Card>;
}
