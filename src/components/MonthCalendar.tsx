import { Fragment } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { MONTH_NAMES, WEEKDAY_LETTERS, buildMonthGrid, toIsoDate } from '../utils/calendarGrid';
import { dateKey } from '../utils/holidays';
import { readableTextColor } from '../utils/color';
import type { DayAssignment } from '../types/dayAssignment';
import type { Project } from '../types/project';
import type { WorkLocation } from '../types/workLocation';
import { YearDayCell } from './YearDayCell';

/** One solid color for a single project, hard-edged stripes for several, so each project stays identifiable. */
function projectBackground(colors: string[]): string | undefined {
  if (colors.length === 0) return undefined;
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  const stops = colors.map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`);
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

/** Collapses same-project assignments on a day into one entry, summing their hours (location taken from the last one). */
function dedupeByProject(assignments: DayAssignment[]): { projectId: string; hours: number; location: WorkLocation | null }[] {
  const hoursByProject = new Map<string, number>();
  const locationByProject = new Map<string, WorkLocation | null>();
  for (const assignment of assignments) {
    hoursByProject.set(assignment.projectId, (hoursByProject.get(assignment.projectId) ?? 0) + assignment.hours);
    locationByProject.set(assignment.projectId, assignment.location);
  }
  return [...hoursByProject].map(([projectId, hours]) => ({
    projectId,
    hours,
    location: locationByProject.get(projectId) ?? null,
  }));
}

const CELL_SIZE = '24px';

const useStyles = makeStyles({
  card: {
    padding: tokens.spacingHorizontalM,
    gap: tokens.spacingVerticalS,
    cursor: 'pointer',
    ':hover': {
      boxShadow: tokens.shadow4,
    },
  },
  title: {
    textAlign: 'center',
    display: 'block',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `28px repeat(7, ${CELL_SIZE})`,
    gap: '2px',
    justifyContent: 'center',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    borderRadius: tokens.borderRadiusSmall,
  },
  weekdayHeaderCell: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  weekNumberCell: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
  },
  dayCell: {
    color: tokens.colorNeutralForeground1,
  },
  emptyCell: {
    // padding cell outside the month, no visual content
  },
  weekday: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  holiday: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  today: {
    boxShadow: `inset 0 0 0 1.5px ${tokens.colorBrandStroke1}`,
    fontWeight: tokens.fontWeightSemibold,
  },
});

interface MonthCalendarProps {
  year: number;
  month: number;
  holidayMap: Map<string, string>;
  projects: Project[];
  assignmentsByDate: Map<string, DayAssignment[]>;
  onSelect: () => void;
}

export function MonthCalendar({
  year,
  month,
  holidayMap,
  projects,
  assignmentsByDate,
  onSelect,
}: MonthCalendarProps) {
  const styles = useStyles();
  const weeks = buildMonthGrid(year, month);
  const today = new Date();
  const todayKey =
    today.getFullYear() === year ? dateKey(today) : null;
  const projectById = new Map(projects.map((project) => [project.id, project]));

  return (
    <Card
      className={styles.card}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${MONTH_NAMES[month]} ${year} öffnen`}
    >
      <Text weight="semibold" size={300} className={styles.title}>
        {MONTH_NAMES[month]}
      </Text>
      <div className={styles.grid}>
        <div className={styles.cell} aria-hidden="true" />
        {WEEKDAY_LETTERS.map((letter, index) => (
          <div key={index} className={mergeClasses(styles.cell, styles.weekdayHeaderCell)}>
            {letter}
          </div>
        ))}

        {weeks.map((week, weekIndex) => (
          <Fragment key={weekIndex}>
            <div className={mergeClasses(styles.cell, styles.weekNumberCell)}>
              {week.weekNumber}
            </div>
            {week.days.map((day, dayIndex) => {
              if (!day) {
                return <div key={dayIndex} className={mergeClasses(styles.cell, styles.emptyCell)} />;
              }
              const key = dateKey(day.date);
              const iso = toIsoDate(day.date);
              const holidayName = holidayMap.get(key);
              const isWeekday = dayIndex <= 4;
              const isToday = key === todayKey;
              const dayAssignments = assignmentsByDate.get(iso) ?? [];
              const projectEntries = dedupeByProject(dayAssignments)
                .map(({ projectId, hours, location }) => {
                  const project = projectById.get(projectId);
                  return project ? { project, hours, location } : null;
                })
                .filter((entry): entry is { project: Project; hours: number; location: WorkLocation | null } => entry !== null);
              const projectColors = projectEntries.map((entry) => entry.project.color);
              const background = projectBackground(projectColors);
              const cellClassName = mergeClasses(
                styles.cell,
                styles.dayCell,
                isWeekday && styles.weekday,
                holidayName && styles.holiday,
                isToday && styles.today,
              );

              return (
                <YearDayCell
                  key={dayIndex}
                  className={cellClassName}
                  day={day.date.getDate()}
                  holidayName={holidayName}
                  projectEntries={projectEntries}
                  style={background ? { background, color: readableTextColor(projectColors[0]) } : undefined}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </Card>
  );
}
