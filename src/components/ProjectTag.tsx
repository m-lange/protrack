import { useState } from 'react';
import { Text, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Dismiss12Regular, QuestionCircle16Regular } from '@fluentui/react-icons';
import { readableTextColor } from '../utils/color';
import { formatHoursDe } from '../utils/format';
import { ProjectChip } from './ProjectChip';
import { WorkLocationIcon } from './WorkLocationIcon';
import type { Project } from '../types/project';
import { WORK_LOCATION_LABELS, type WorkLocation } from '../types/workLocation';

const useStyles = makeStyles({
  tag: {
    position: 'relative',
    cursor: 'default',
  },
  clickable: {
    cursor: 'pointer',
  },
  hours: {
    flexShrink: 0,
    opacity: 0.65,
  },
  deviationIcon: {
    flexShrink: 0,
    display: 'flex',
  },
  removeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '16px',
    height: '16px',
    padding: 0,
    border: 'none',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0,
  },
  removeButtonVisible: {
    opacity: 1,
  },
});

interface ProjectTagProps {
  project: Project;
  hours: number;
  /** Arbeitsort dieser Buchung, falls gesetzt (wird nur im Aufwand-verteilen-Dialog gepflegt). */
  location: WorkLocation | null;
  /** Der von den übrigen Buchungen des Tages etablierte Arbeitsort (für den Konflikt-Check), `null` wenn noch keiner gesetzt ist. */
  dayLocation: WorkLocation | null;
  /** Arbeitsorte, die dieses Projekt an diesem Tag laut Kontingent-Vorgabe zulässt. */
  allowedLocations: WorkLocation[];
  onRemove: () => void;
  onClick?: () => void;
}

export function ProjectTag({
  project,
  hours,
  location,
  dayLocation,
  allowedLocations,
  onRemove,
  onClick,
}: ProjectTagProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState(false);
  const textColor = readableTextColor(project.color);
  // Kein eigener Arbeitsort gesetzt, aber der von den übrigen Buchungen etablierte Arbeitsort
  // passt nicht zur Vorgabe dieses Projekts - ungelöster Konflikt, der manuell (im
  // Aufwand-verteilen-Dialog) aufgelöst werden muss.
  const hasUnresolvedConflict = !location && dayLocation !== null && !allowedLocations.includes(dayLocation);

  return (
    <ProjectChip
      project={project}
      className={mergeClasses(styles.tag, onClick && styles.clickable)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      title={project.name}
    >
      {location && (
        <span className={styles.deviationIcon} title={`Arbeitsort: ${WORK_LOCATION_LABELS[location]}`}>
          <WorkLocationIcon value={location} variant="outline" color={textColor} />
        </span>
      )}
      {hasUnresolvedConflict && (
        <span className={styles.deviationIcon} title="Arbeitsort weicht vom Tages-Arbeitsort ab - bitte auflösen">
          <QuestionCircle16Regular style={{ color: textColor }} />
        </span>
      )}
      <Text size={100} className={styles.hours} style={{ color: textColor }}>
        {formatHoursDe(hours)}h
      </Text>
      <button
        type="button"
        className={mergeClasses(styles.removeButton, hovered && styles.removeButtonVisible)}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label="Zuordnung entfernen"
        title="Zuordnung entfernen"
      >
        <Dismiss12Regular />
      </button>
    </ProjectChip>
  );
}
