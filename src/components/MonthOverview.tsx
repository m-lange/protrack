import { useMemo, useState } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { WEEKDAY_SHORT, buildMonthGrid, toIsoDate } from '../utils/calendarGrid';
import { dateKey } from '../utils/holidays';
import type { Bundesland } from '../types/bundesland';
import { useProjects } from '../hooks/useProjects';
import { useDayAssignments } from '../hooks/useDayAssignments';
import { resolveLocationForNewBooking } from '../types/dayAssignment';
import {
  buildMonthProjectSummaries,
  buildMonthlyBookings,
  buildMonthlyLocations,
  chargeabilityPercent,
  locationPercent,
} from '../utils/dashboardAggregation';
import { homeofficeTarget } from '../types/yearSettings';
import { KPI_TILE_WIDTH } from '../utils/chartScale';
import { MonthDayCell } from './MonthDayCell';
import { EffortDistributionDialog } from './EffortDistributionDialog';
import { MonthProjectTable } from './MonthProjectTable';
import { KpiTile } from './dashboard/KpiTile';

const useStyles = makeStyles({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
  },
  card: {
    padding: tokens.spacingHorizontalM,
    gap: 0,
  },
  weekdayHeader: {
    display: 'grid',
    gridTemplateColumns: '64px repeat(7, 1fr)',
    gap: tokens.spacingHorizontalXS,
    paddingBottom: tokens.spacingVerticalS,
    marginBottom: tokens.spacingVerticalL,
    borderBottomWidth: tokens.strokeWidthThin,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  weekdayHeaderCell: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  weeksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  weekRow: {
    display: 'grid',
    gridTemplateColumns: '64px repeat(7, 1fr)',
    gap: tokens.spacingHorizontalS,
    alignItems: 'stretch',
  },
  weekNumber: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
  },
  dayCell: {
    minHeight: '110px',
    minWidth: '0px',
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalS,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  emptyDayCell: {
    minHeight: '110px',
  },
  weekday: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  weekend: {
    // A lighter tint of the weekday gray, mixed with the card's own background —
    // this stays correctly "between" card and weekday in both light and dark themes,
    // unlike a fixed token (colorNeutralBackground2 is the *darkest* neutral in our
    // dark palette, which inverted the intended contrast there).
    backgroundColor: `color-mix(in srgb, ${tokens.colorNeutralBackground3} 50%, ${tokens.colorNeutralBackground1})`,
  },
  holiday: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
  },
  today: {
    boxShadow: `inset 0 0 0 1.5px ${tokens.colorBrandStroke1}`,
  },
  // Monats-KPIs neben der Gebuchte-Tage-Tabelle, immer in einer Reihe und gleicher Höhe
  // (align-items stretch, Flex-Default). Nur die Tabelle ist flexibel und füllt den nach den vier
  // festbreiten Kennzahl-Kacheln übrigen Platz - passt sich so als einzige der Fensterbreite an.
  summaryRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: tokens.spacingHorizontalL,
  },
  tableFlex: {
    flex: '1 1 auto',
    minWidth: 0,
  },
  // Etwas schmaler als das Dashboard-Pendant (KPI_TILE_WIDTH) - hier stehen die Kacheln neben der
  // deutlich breiteren Gebuchte-Tage-Tabelle statt in einer reinen Kachelreihe.
  metricTile: {
    flex: `0 0 ${KPI_TILE_WIDTH - 25}px`,
    width: `${KPI_TILE_WIDTH - 25}px`,
  },
});

interface MonthOverviewProps {
  year: number;
  month: number;
  holidayMap: Map<string, string>;
  bundesland: Bundesland;
  targetChargeability: number;
  targetKunde: number;
  targetBuero: number;
}

export function MonthOverview({
  year,
  month,
  holidayMap,
  bundesland,
  targetChargeability,
  targetKunde,
  targetBuero,
}: MonthOverviewProps) {
  const styles = useStyles();
  const weeks = buildMonthGrid(year, month);
  const today = new Date();
  const todayKey = today.getFullYear() === year ? dateKey(today) : null;
  const { projects } = useProjects();
  const { assignments, assignmentsByDate, addAssignment, removeAssignment, setHours } = useDayAssignments();
  const [distributionDate, setDistributionDate] = useState<string | null>(null);

  const projectList = projects ?? [];
  const distributionAssignments = distributionDate ? (assignmentsByDate.get(distributionDate) ?? []) : [];
  const monthSummaries = useMemo(
    () => buildMonthProjectSummaries(projectList, assignments ?? [], year, month, bundesland),
    [projectList, assignments, year, month, bundesland],
  );

  // Monats-KPIs (siehe summaryRow unten): dieselben Aggregations-Funktionen wie im Dashboard, hier
  // aber je Monat statt Jahresdurchschnitt ausgewertet.
  const monthlyBookings = useMemo(
    () => buildMonthlyBookings(assignments ?? [], projects ?? [], year, bundesland),
    [assignments, projects, year, bundesland],
  );
  const monthlyLocations = useMemo(() => buildMonthlyLocations(assignments ?? [], year), [assignments, year]);
  const targetHomeoffice = homeofficeTarget(targetKunde, targetBuero);
  const metricTiles = [
    { key: 'chargeability', label: 'Chargeability', value: chargeabilityPercent(monthlyBookings, month), target: targetChargeability },
    { key: 'buero', label: 'Büro', value: locationPercent(monthlyLocations, 'buero', month), target: targetBuero },
    { key: 'kunde', label: 'Kunde', value: locationPercent(monthlyLocations, 'kunde', month), target: targetKunde },
    { key: 'homeoffice', label: 'Home Office', value: locationPercent(monthlyLocations, 'homeoffice', month), target: targetHomeoffice },
  ];

  return (
    <div className={styles.stack}>
      <Card className={styles.card}>
        <div className={styles.weekdayHeader}>
          <div />
          {WEEKDAY_SHORT.map((name) => (
            <Text key={name} weight="semibold" size={200} className={styles.weekdayHeaderCell}>
              {name}
            </Text>
          ))}
        </div>

        <div className={styles.weeksList}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className={styles.weekRow}>
              <div className={styles.weekNumber}>
                <Text size={200} weight="semibold">
                  KW {week.weekNumber}
                </Text>
              </div>
              {week.days.map((day, dayIndex) => {
                if (!day) {
                  return <div key={dayIndex} className={styles.emptyDayCell} />;
                }
                const key = dateKey(day.date);
                const iso = toIsoDate(day.date);
                const holidayName = holidayMap.get(key);
                const isWeekday = dayIndex <= 4;
                const isToday = key === todayKey;
                const cellClassName = mergeClasses(
                  styles.dayCell,
                  isWeekday ? styles.weekday : styles.weekend,
                  holidayName && styles.holiday,
                  isToday && styles.today,
                );

                return (
                  <MonthDayCell
                    key={dayIndex}
                    className={cellClassName}
                    date={day.date}
                    dateIso={iso}
                    holidayName={holidayName}
                    projects={projectList}
                    assignments={assignmentsByDate.get(iso) ?? []}
                    onAdd={(projectId) => {
                      const project = projectList.find((p) => p.id === projectId);
                      const existingForDay = assignmentsByDate.get(iso) ?? [];
                      // Prefers this project's own most recently used Arbeitsort when it allows
                      // several; falls back to auto-resolving/flagging a conflict with the day's
                      // already-established Arbeitsort otherwise (see resolveLocationForNewBooking).
                      const resolution = project
                        ? resolveLocationForNewBooking(project, iso, existingForDay, assignments ?? [])
                        : ({ kind: 'none' } as const);
                      void addAssignment(iso, projectId, resolution.kind === 'auto' ? resolution.location : null);
                    }}
                    onRemove={(assignmentId) => void removeAssignment(assignmentId)}
                    onOpenDistribution={() => setDistributionDate(iso)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <EffortDistributionDialog
          open={distributionDate !== null}
          date={distributionDate ?? ''}
          assignments={distributionAssignments}
          projects={projectList}
          onSave={(updated) => {
            void setHours(updated);
            setDistributionDate(null);
          }}
          onClose={() => setDistributionDate(null)}
        />
      </Card>

      <div className={styles.summaryRow}>
        <MonthProjectTable summaries={monthSummaries} className={styles.tableFlex} />
        {metricTiles.map((tile) => {
          const delta = tile.value === null ? null : tile.value - tile.target;
          return (
            <KpiTile
              key={tile.key}
              className={styles.metricTile}
              label={tile.label}
              value={tile.value === null ? '–' : `${tile.value.toFixed(1)}%`}
              deltaText={delta === null ? undefined : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} % ggü. Ziel`}
              deltaTone={delta === null ? 'neutral' : delta >= 0 ? 'positive' : 'negative'}
            />
          );
        })}
      </div>
    </div>
  );
}
