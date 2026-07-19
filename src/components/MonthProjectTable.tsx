import { Fragment } from 'react';
import { Avatar, Card, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { MonthProjectSummary } from '../utils/dashboardAggregation';
import { WORK_LOCATION_LABELS, WORK_LOCATIONS } from '../types/workLocation';
import { formatHoursDe } from '../utils/format';
import { WorkLocationIcon } from './WorkLocationIcon';

const useStyles = makeStyles({
  card: {
    padding: tokens.spacingHorizontalM,
    gap: tokens.spacingVerticalS,
  },
  title: {
    paddingInline: tokens.spacingHorizontalS,
  },
  gridScroll: {
    overflowX: 'auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `minmax(180px, max-content) 70px repeat(${WORK_LOCATIONS.length}, 56px) 90px 120px`,
    width: 'max-content',
    maxWidth: '100%',
  },
  headerCell: {
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerCellCenter: {
    textAlign: 'center',
  },
  // Arbeitsort-Spalten sind eine sekundäre Aufschlüsselung von "Gesamt" - blasser, kleiner und mit
  // eigenem Hintergrundton, damit sie klar als Detail-Block von Gesamt/Forecast/Restkontingent
  // abgesetzt sind statt gleichwertig mitzukonkurrieren.
  secondary: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    boxSizing: 'border-box',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  numberCell: {
    justifyContent: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  projectCell: {
    gap: tokens.spacingHorizontalM,
  },
  // Deutlicherer Abstand zur ersten Datenspalte ("Gesamt"), damit die Projektspalte klar als
  // eigener Block erkennbar bleibt statt eng an die Zahlenspalten heranzurücken.
  projectColumnGap: {
    paddingRight: `calc(${tokens.spacingHorizontalM} * 3)`,
  },
  muted: {
    color: tokens.colorNeutralForeground4,
  },
  warning: {
    color: tokens.colorPaletteMarigoldForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  negative: {
    color: tokens.colorPaletteRedForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
});

interface MonthProjectTableProps {
  summaries: MonthProjectSummary[];
}

export function MonthProjectTable({ summaries }: MonthProjectTableProps) {
  const styles = useStyles();

  if (summaries.length === 0) {
    return null;
  }

  return (
    <Card className={styles.card}>
      <Text weight="semibold" size={400} className={styles.title}>
        Gebuchte Tage
      </Text>
      <div className={styles.gridScroll}>
        <div className={styles.grid} role="table" aria-label="Gebuchte Tage pro Projekt">
          <div className={mergeClasses(styles.headerCell, styles.projectColumnGap)} role="columnheader">
            Projekt
          </div>
          <div className={mergeClasses(styles.headerCell, styles.headerCellCenter)} role="columnheader">
            Gesamt
          </div>
          {WORK_LOCATIONS.map((loc) => (
            <div
              key={loc}
              className={mergeClasses(styles.headerCell, styles.headerCellCenter, styles.secondary)}
              role="columnheader"
              aria-label={WORK_LOCATION_LABELS[loc]}
              title={WORK_LOCATION_LABELS[loc]}
            >
              <WorkLocationIcon value={loc} />
            </div>
          ))}
          <div className={mergeClasses(styles.headerCell, styles.headerCellCenter)} role="columnheader">
            Forecast
          </div>
          <div className={mergeClasses(styles.headerCell, styles.headerCellCenter)} role="columnheader">
            Restkontingent
          </div>

          {summaries.map((summary) => {
            return (
              <Fragment key={summary.project.id}>
                <div className={mergeClasses(styles.cell, styles.projectCell)} role="cell">
                  <Avatar
                    image={summary.project.image ? { src: summary.project.image } : undefined}
                    name={summary.project.name || undefined}
                    size={28}
                  />
                  <Text weight="semibold">{summary.project.name}</Text>
                </div>
                <div className={mergeClasses(styles.cell, styles.numberCell)} role="cell">
                  {formatHoursDe(summary.bookedDays)}
                </div>
                {WORK_LOCATIONS.map((loc) => (
                  <div key={loc} className={mergeClasses(styles.cell, styles.numberCell, styles.secondary)} role="cell">
                    {summary.daysByLocation[loc] ? formatHoursDe(summary.daysByLocation[loc]!) : '–'}
                  </div>
                ))}
                <div
                  className={mergeClasses(
                    styles.cell,
                    styles.numberCell,
                    summary.deviation !== 'onTrack' && styles.warning,
                  )}
                  role="cell"
                >
                  {summary.forecastDays === null ? <span className={styles.muted}>–</span> : formatHoursDe(summary.forecastDays)}
                </div>
                <div
                  className={mergeClasses(
                    styles.cell,
                    styles.numberCell,
                    summary.overBudget
                      ? styles.negative
                      : summary.remainingRatio !== null && summary.remainingRatio < 0.25
                        ? styles.warning
                        : undefined,
                  )}
                  role="cell"
                >
                  {summary.remainingDays === null ? (
                    <span className={styles.muted}>–</span>
                  ) : (
                    `${summary.remainingDays < 0 ? '−' : ''}${formatHoursDe(Math.abs(summary.remainingDays))}`
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
