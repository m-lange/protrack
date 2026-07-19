import { useMemo, useState } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { WEEKDAY_SHORT, buildMonthGrid, toIsoDate } from '../utils/calendarGrid';
import { dateKey } from '../utils/holidays';
import type { Bundesland } from '../types/bundesland';
import { useProjects } from '../hooks/useProjects';
import { useDayAssignments } from '../hooks/useDayAssignments';
import { resolveLocationForNewBooking } from '../types/dayAssignment';
import { buildMonthProjectSummaries } from '../utils/dashboardAggregation';
import { MonthDayCell } from './MonthDayCell';
import { EffortDistributionDialog } from './EffortDistributionDialog';
import { MonthProjectTable } from './MonthProjectTable';

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
});

interface MonthOverviewProps {
  year: number;
  month: number;
  holidayMap: Map<string, string>;
  bundesland: Bundesland;
}

export function MonthOverview({ year, month, holidayMap, bundesland }: MonthOverviewProps) {
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

      <MonthProjectTable summaries={monthSummaries} />
    </div>
  );
}
