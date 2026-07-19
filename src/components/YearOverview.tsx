import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { MonthCalendar } from './MonthCalendar';
import { getHolidayMap } from '../utils/holidays';
import { monthPath } from '../utils/navigation';
import { useProjects } from '../hooks/useProjects';
import { useDayAssignments } from '../hooks/useDayAssignments';
import { useResolvedYearSettings } from '../hooks/useYearSettings';

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL,

    '@media (max-width: 1200px)': {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    },
    '@media (max-width: 900px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    '@media (max-width: 560px)': {
      gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
    },
  },
});

interface YearOverviewProps {
  year: number;
}

export function YearOverview({ year }: YearOverviewProps) {
  const styles = useStyles();
  const navigate = useNavigate();
  const resolvedSettings = useResolvedYearSettings(year);
  const bundesland = resolvedSettings?.settings.bundesland ?? 'HB';
  const holidayMap = useMemo(() => getHolidayMap(year, bundesland), [year, bundesland]);
  const { projects } = useProjects();
  const { assignmentsByDate } = useDayAssignments();

  return (
    <div className={styles.grid}>
      {Array.from({ length: 12 }, (_, month) => (
        <MonthCalendar
          key={month}
          year={year}
          month={month}
          holidayMap={holidayMap}
          projects={projects ?? []}
          assignmentsByDate={assignmentsByDate}
          onSelect={() => navigate(monthPath(year, month + 1))}
        />
      ))}
    </div>
  );
}
