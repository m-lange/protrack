import { Fragment } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { MonthProjectSummary } from '../utils/dashboardAggregation';
import { WORK_LOCATION_LABELS, WORK_LOCATIONS } from '../types/workLocation';
import { formatHoursDe } from '../utils/format';
import { ProjectAvatar } from './ProjectAvatar';
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
  // Full width statt max-content, mit der Projektspalte als einziger 1fr-Spur: füllt den ganzen
  // Card-Innenraum, sodass rechts (Restkontingent) derselbe Abstand zum Kartenrand bleibt wie
  // links (Projekt) - vorher blieb bei breiten Karten rechts ungenutzter Leerraum stehen, weil die
  // max-content-Breite nie über die Summe der Spaltenbreiten hinauswuchs. Bei sehr schmalen
  // Containern greifen die restlichen festen Spaltenbreiten weiterhin als Minimum und lösen wie
  // zuvor `gridScroll`s horizontales Scrollen aus.
  grid: {
    display: 'grid',
    gridTemplateColumns: `minmax(180px, 1fr) 70px repeat(${WORK_LOCATIONS.length}, 56px) 90px 120px`,
    width: '100%',
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
  // Flex-Items schrumpfen standardmäßig nicht unter ihre Inhaltsbreite (min-width: auto) - erst
  // mit minWidth 0 greift die Ellipsis statt der Browser-Default-Umbruch, wenn die Projektspalte
  // (minmax(180px, ...)) auf ihr Minimum gedrückt wird.
  projectName: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  emptyState: {
    color: tokens.colorNeutralForeground3,
    paddingInline: tokens.spacingHorizontalS,
  },
  // Overrides `.cell`'s borderBottom for the last project row - same shorthand property as the
  // base style (not a longhand like borderBottomWidth), so Griffel's merge reliably wins here.
  noBorder: {
    borderBottom: 'none',
  },
});

interface MonthProjectTableProps {
  summaries: MonthProjectSummary[];
  /** Merged onto the root `Card` - lets the Monatsseite make this the one flexible tile in its KPI row. */
  className?: string;
}

export function MonthProjectTable({ summaries, className }: MonthProjectTableProps) {
  const styles = useStyles();

  if (summaries.length === 0) {
    return (
      <Card className={mergeClasses(styles.card, className)}>
        <Text weight="semibold" size={400} className={styles.title}>
          Gebuchte Tage
        </Text>
        <Text size={200} className={styles.emptyState}>
          Noch keine Buchungen in diesem Monat.
        </Text>
      </Card>
    );
  }

  return (
    <Card className={mergeClasses(styles.card, className)}>
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

          {summaries.map((summary, index) => {
            const isLastRow = index === summaries.length - 1;
            return (
              <Fragment key={summary.project.id}>
                <div className={mergeClasses(styles.cell, styles.projectCell, isLastRow && styles.noBorder)} role="cell">
                  <ProjectAvatar project={summary.project} size={28} />
                  <Text weight="semibold" className={styles.projectName}>
                    {summary.project.name}
                  </Text>
                </div>
                <div className={mergeClasses(styles.cell, styles.numberCell, isLastRow && styles.noBorder)} role="cell">
                  {formatHoursDe(summary.bookedDays)}
                </div>
                {WORK_LOCATIONS.map((loc) => (
                  <div
                    key={loc}
                    className={mergeClasses(styles.cell, styles.numberCell, styles.secondary, isLastRow && styles.noBorder)}
                    role="cell"
                  >
                    {summary.daysByLocation[loc] ? formatHoursDe(summary.daysByLocation[loc]!) : '–'}
                  </div>
                ))}
                <div
                  className={mergeClasses(
                    styles.cell,
                    styles.numberCell,
                    summary.deviation !== 'onTrack' && styles.warning,
                    isLastRow && styles.noBorder,
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
                    isLastRow && styles.noBorder,
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
