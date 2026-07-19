import { useEffect, useMemo, useState } from 'react';
import { Button, DrawerBody, DrawerHeader, OverlayDrawer, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ChevronLeft24Regular, ChevronRight24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { WEEKDAY_SHORT, MONTH_NAMES, toIsoDate } from '../utils/calendarGrid';
import { dateKey, getHolidayMap } from '../utils/holidays';
import { getAllDayAssignments, getAllProjects, getAllYearSettings } from '../db/database';
import { allowedWorkLocationsForBooking, dominantLocationForDay, type DayAssignment } from '../types/dayAssignment';
import type { Project } from '../types/project';
import { resolveYearSettings, type YearSettings } from '../types/yearSettings';
import { HeaderDatePicker } from './HeaderDatePicker';
import { ProjectTag } from './ProjectTag';

const useStyles = makeStyles({
  drawer: {
    width: '440px',
    maxWidth: '90vw',
  },
  header: {
    display: 'flex',
    // DrawerHeader's own default style hardcodes flex-direction: column - Griffel only lets a
    // consumer className override a property the class actually sets, so this needs to be
    // explicit even though "row" is normally the flex default.
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  label: {
    minWidth: '130px',
    textAlign: 'center',
  },
  body: {
    padding: 0,
  },
  list: {
    display: 'grid',
    gridTemplateColumns: '1fr',
  },
  dayRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    paddingBlock: '8px',
    paddingInlineStart: tokens.spacingHorizontalXXL,
    paddingInlineEnd: tokens.spacingHorizontalXXL,
  },
  // A genuinely neutral medium gray (mixing toward the muted foreground/text color rather than a
  // background token, since this theme's neutral background ramp is all very light/hue-tinted -
  // see theme/palette.ts) - all other weeks stay plain white/background.
  weekend: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
  holiday: {
    backgroundColor: tokens.colorPaletteRedBackground2,
  },
  divider: {
    borderBottomWidth: tokens.strokeWidthThin,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  dayLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    width: '32px',
    lineHeight: '1.1',
    paddingTop: '2px',
  },
  weekdayName: {
    color: tokens.colorNeutralForeground3,
  },
  content: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingTop: '2px',
  },
  holidayText: {
    color: tokens.colorPaletteRedForeground2,
  },
  mutedText: {
    color: tokens.colorNeutralForeground3,
  },
});

interface DayRowProps {
  date: Date;
  holidayName: string | undefined;
  dayAssignments: DayAssignment[];
  projects: Project[];
  isoDate: string;
}

/** One calendar day: a fixed-width day-label next to a stack of the day's bookings, each shown as
 * the exact same colored `ProjectTag` used in the real Month view (read-only here - no
 * `onRemove` passed, so the tag hides its remove button). Reusing the tag sidesteps needing
 * pixel-aligned columns across the whole list - each tag just sizes to its own content, like in
 * the Month grid. */
function DayRow({ date, holidayName, dayAssignments, projects, isoDate }: DayRowProps) {
  const styles = useStyles();
  const weekdayIndex = (date.getDay() + 6) % 7;
  const isWeekend = weekdayIndex >= 5;
  const dayLocation = dominantLocationForDay(dayAssignments);

  return (
    <div
      className={mergeClasses(
        styles.dayRow,
        styles.divider,
        isWeekend && styles.weekend,
        holidayName && styles.holiday,
      )}
    >
      <div className={styles.dayLabel}>
        <Text size={200} weight="semibold" font="numeric">
          {date.getDate()}
        </Text>
        <Text size={100} className={styles.weekdayName}>
          {WEEKDAY_SHORT[weekdayIndex]}
        </Text>
      </div>
      <div className={styles.content}>
        {dayAssignments.length > 0 ? (
          dayAssignments.map((assignment) => {
            const project = projects.find((p) => p.id === assignment.projectId);
            if (!project) return null;
            return (
              <ProjectTag
                key={assignment.id}
                project={project}
                hours={assignment.hours}
                location={assignment.location}
                dayLocation={dayLocation}
                allowedLocations={allowedWorkLocationsForBooking(project, isoDate)}
              />
            );
          })
        ) : holidayName ? (
          <Text size={200} className={styles.holidayText}>
            {holidayName}
          </Text>
        ) : isWeekend ? (
          <Text size={200} className={styles.mutedText}>
            Wochenende
          </Text>
        ) : (
          <Text size={200} className={styles.mutedText}>
            Keine Einträge
          </Text>
        )}
      </div>
    </div>
  );
}

export interface MonthQuickOverviewDialogProps {
  open: boolean;
  /** Month to show when the sidebar opens; 0 = Januar. Only read at the moment `open` becomes true - the sidebar then navigates independently via its own prev/next/picker controls. */
  year: number;
  month0to11: number;
  onClose: () => void;
}

/** Kompakte Monatsübersicht als Sidebar am rechten Fensterrand: zeigt pro Tag entweder die
 * gebuchten Projekte oder - falls keine gebucht sind - Feiertag/Wochenende. Hat einen eigenen
 * Monats-Umschalter, unabhängig von der gerade in der Hauptansicht aufgerufenen Seite. */
export function MonthQuickOverviewDialog({ open, year: initialYear, month0to11: initialMonth, onClose }: MonthQuickOverviewDialogProps) {
  const styles = useStyles();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  useEffect(() => {
    if (open) {
      setYear(initialYear);
      setMonth(initialMonth);
    }
  }, [open, initialYear, initialMonth]);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [assignments, setAssignments] = useState<DayAssignment[] | null>(null);
  const [allYearSettings, setAllYearSettings] = useState<YearSettings[]>([]);

  // Re-reads straight from IndexedDB on every open/navigation, rather than relying on
  // `useProjects`/`useDayAssignments` (which only fetch once on mount): this sidebar can stay open
  // for a while alongside edits made elsewhere in the app, so a mount-once fetch would keep
  // showing stale data.
  useEffect(() => {
    if (!open) return;
    getAllProjects().then(setProjects);
    getAllDayAssignments().then(setAssignments);
    getAllYearSettings().then(setAllYearSettings);
  }, [open, year, month]);

  const bundesland = useMemo(() => resolveYearSettings(allYearSettings, year).settings.bundesland, [allYearSettings, year]);
  const holidayMap = useMemo(() => getHolidayMap(year, bundesland), [year, bundesland]);
  const projectList = projects ?? [];
  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, DayAssignment[]>();
    for (const assignment of assignments ?? []) {
      const list = map.get(assignment.date);
      if (list) {
        list.push(assignment);
      } else {
        map.set(assignment.date, [assignment]);
      }
    }
    return map;
  }, [assignments]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  const goToMonth = (targetYear: number, targetMonth0to11: number) => {
    const wrappedYear = targetYear + Math.floor(targetMonth0to11 / 12);
    const wrappedMonth0to11 = ((targetMonth0to11 % 12) + 12) % 12;
    setYear(wrappedYear);
    setMonth(wrappedMonth0to11);
  };

  const labelText = (
    <Text size={500} weight="semibold" font="numeric" className={styles.label}>
      {MONTH_NAMES[month]} {year}
    </Text>
  );

  return (
    <OverlayDrawer
      open={open}
      onOpenChange={(_event, data) => !data.open && onClose()}
      position="end"
      modalType="non-modal"
      className={styles.drawer}
    >
      <DrawerHeader className={styles.header}>
        <div className={styles.nav}>
          <Button appearance="subtle" icon={<ChevronLeft24Regular />} onClick={() => goToMonth(year, month - 1)} aria-label="Zurück" title="Zurück" />
          <HeaderDatePicker mode="month" year={year} month1to12={month + 1} onSelectMonth={(y, m1to12) => goToMonth(y, m1to12 - 1)}>
            {labelText}
          </HeaderDatePicker>
          <Button appearance="subtle" icon={<ChevronRight24Regular />} onClick={() => goToMonth(year, month + 1)} aria-label="Weiter" title="Weiter" />
        </div>
        <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={onClose} aria-label="Schließen" title="Schließen" />
      </DrawerHeader>
      <DrawerBody className={styles.body}>
        <div className={styles.list}>
          {days.map((date) => {
            const key = dateKey(date);
            const iso = toIsoDate(date);
            return (
              <DayRow
                key={key}
                date={date}
                holidayName={holidayMap.get(key)}
                dayAssignments={assignmentsByDate.get(iso) ?? []}
                projects={projectList}
                isoDate={iso}
              />
            );
          })}
        </div>
      </DrawerBody>
    </OverlayDrawer>
  );
}
