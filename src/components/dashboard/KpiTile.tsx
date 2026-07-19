import type { ReactNode } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalL,
    minWidth: '0px',
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  label: {
    color: tokens.colorNeutralForeground3,
  },
  // Für Projekt-Kacheln: Projektname soll wie in der Projektliste hervortreten statt als blasse
  // Caption zu wirken.
  labelEmphasized: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  labelSuffix: {
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  value: {
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightSemibold,
  },
  delta: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  positive: {
    color: tokens.colorPaletteGreenForeground2,
  },
  negative: {
    color: tokens.colorPaletteRedForeground2,
  },
  warning: {
    color: tokens.colorPaletteMarigoldForeground2,
  },
  neutral: {
    color: tokens.colorNeutralForeground3,
  },
});

interface KpiTileProps {
  label: string;
  value: string;
  deltaText?: string;
  deltaTone?: 'positive' | 'negative' | 'warning' | 'neutral';
  hint?: string;
  /** Small identity element next to the label, e.g. an `<Avatar>` to tie a per-project tile back to its project. */
  avatar?: ReactNode;
  /** Muted text after the label, e.g. a project's client name. */
  labelSuffix?: string;
  /** Small icon after the label/labelSuffix, e.g. a project's `<ChargeableIcon>`. */
  labelIcon?: ReactNode;
  /** Renders `label` like a project name (prominent) instead of a muted caption - for tiles that identify a project rather than a generic metric. */
  emphasizeLabel?: boolean;
  children?: ReactNode;
}

/** A single dashboard stat tile: label, hero value, optional signed delta line. */
export function KpiTile({
  label,
  value,
  deltaText,
  deltaTone = 'neutral',
  hint,
  avatar,
  labelSuffix,
  labelIcon,
  emphasizeLabel,
  children,
}: KpiTileProps) {
  const styles = useStyles();
  const toneClass =
    deltaTone === 'positive'
      ? styles.positive
      : deltaTone === 'negative'
        ? styles.negative
        : deltaTone === 'warning'
          ? styles.warning
          : styles.neutral;

  return (
    <Card className={styles.card} title={hint}>
      <div className={styles.labelRow}>
        {avatar}
        <Text size={200} className={mergeClasses(styles.label, emphasizeLabel && styles.labelEmphasized)}>
          {label}
        </Text>
        {labelSuffix && (
          <Text size={200} className={styles.labelSuffix}>
            {labelSuffix}
          </Text>
        )}
        {labelIcon}
      </div>
      <Text className={styles.value} font="numeric">
        {value}
      </Text>
      {deltaText && (
        <Text size={200} className={mergeClasses(styles.delta, toneClass)}>
          {deltaText}
        </Text>
      )}
      {children}
    </Card>
  );
}
