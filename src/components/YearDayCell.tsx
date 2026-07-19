import { useState, type CSSProperties } from 'react';
import { Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { Project } from '../types/project';
import type { WorkLocation } from '../types/workLocation';
import { readableTextColor } from '../utils/color';
import { formatHoursDe } from '../utils/format';
import { ProjectChip } from './ProjectChip';
import { WorkLocationIcon } from './WorkLocationIcon';

const useStyles = makeStyles({
  root: {
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    bottom: 'calc(100% + 4px)',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    minWidth: '160px',
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow16,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    pointerEvents: 'none',
    cursor: 'default',
  },
  hours: {
    flexShrink: 0,
    opacity: 0.65,
  },
});

interface YearDayCellProps {
  className: string;
  day: number;
  style?: CSSProperties;
  holidayName?: string;
  projectEntries: { project: Project; hours: number; location: WorkLocation | null }[];
}

export function YearDayCell({ className, day, style, holidayName, projectEntries }: YearDayCellProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState(false);
  const hasInfo = Boolean(holidayName) || projectEntries.length > 0;

  return (
    <div
      className={mergeClasses(styles.root, className)}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {day}
      {hovered && hasInfo && (
        <div className={styles.tooltip}>
          {holidayName && (
            <Text size={200} weight="semibold">
              {holidayName}
            </Text>
          )}
          {projectEntries.map(({ project, hours, location }) => (
            <ProjectChip key={project.id} project={project} avatarSize={16}>
              {location && <WorkLocationIcon value={location} />}
              <Text size={100} className={styles.hours} style={{ color: readableTextColor(project.color) }}>
                {formatHoursDe(hours)}h
              </Text>
            </ProjectChip>
          ))}
        </div>
      )}
    </div>
  );
}
