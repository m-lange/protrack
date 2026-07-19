import { useState } from 'react';
import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Add16Regular } from '@fluentui/react-icons';
import {
  allowedWorkLocationsForBooking,
  dominantLocationForDay,
  eligibleProjectsForDay,
  type DayAssignment,
} from '../types/dayAssignment';
import type { Project } from '../types/project';
import { ProjectChip } from './ProjectChip';
import { ProjectTag } from './ProjectTag';

const useStyles = makeStyles({
  root: {
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    minHeight: '20px',
  },
  dayNumber: {
    fontWeight: tokens.fontWeightSemibold,
  },
  holidayLabel: {
    color: 'inherit',
  },
  triggerButton: {
    minWidth: 'unset',
    width: '20px',
    height: '20px',
    padding: 0,
  },
  addButton: {
    opacity: 0,
    ':hover': {
      opacity: 1,
    },
  },
  addButtonVisible: {
    opacity: 1,
  },
  tagsList: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '2px',
    minHeight: 0,
    minWidth: '0px',
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: tokens.colorNeutralForeground3,
  },
  menuItem: {
    padding: '0px',
  },
});

interface MonthDayCellProps {
  className: string;
  date: Date;
  dateIso: string;
  holidayName?: string;
  projects: Project[];
  assignments: DayAssignment[];
  onAdd: (projectId: string) => void;
  onRemove: (assignmentId: string) => void;
  onOpenDistribution: () => void;
}

export function MonthDayCell({
  className,
  date,
  dateIso,
  holidayName,
  projects,
  assignments,
  onAdd,
  onRemove,
  onOpenDistribution,
}: MonthDayCellProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const assignedProjectIds = new Set(assignments.map((a) => a.projectId));
  const eligibleProjects = eligibleProjectsForDay(projects, dateIso).filter(
    (project) => !assignedProjectIds.has(project.id),
  );
  const dayLocation = dominantLocationForDay(assignments);

  return (
    <div
      className={mergeClasses(styles.root, className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={styles.header}>
        <Text className={styles.dayNumber} font="numeric">
          {date.getDate()}
        </Text>
        <Menu open={projectMenuOpen} onOpenChange={(_event, data) => setProjectMenuOpen(data.open)}>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="subtle"
              icon={<Add16Regular />}
              className={mergeClasses(
                styles.triggerButton,
                styles.addButton,
                (hovered || projectMenuOpen) && styles.addButtonVisible,
              )}
              aria-label="Projekt hinzufügen"
              title="Projekt hinzufügen"
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {eligibleProjects.length === 0 && <MenuItem disabled>Keine Projekte verfügbar</MenuItem>}
              {eligibleProjects.map((project) => (
                <MenuItem key={project.id} className={styles.menuItem} onClick={() => onAdd(project.id)}>
                  <ProjectChip project={project} avatarSize={20} />
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>

      {holidayName && (
        <Text size={100} className={styles.holidayLabel}>
          {holidayName}
        </Text>
      )}

      {assignments.length > 0 ? (
        <div className={styles.tagsList}>
          {assignments.map((assignment) => {
            const project = projects.find((p) => p.id === assignment.projectId);
            if (!project) return null;
            return (
              <ProjectTag
                key={assignment.id}
                project={project}
                hours={assignment.hours}
                location={assignment.location}
                dayLocation={dayLocation}
                allowedLocations={allowedWorkLocationsForBooking(project, dateIso)}
                onRemove={() => onRemove(assignment.id)}
                onClick={onOpenDistribution}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Text size={100} className={styles.emptyStateText}>
            Keine Einträge
          </Text>
        </div>
      )}
    </div>
  );
}
