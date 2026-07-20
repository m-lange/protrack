import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { ChargeableIcon } from './ChargeableIcon';
import type { Project } from '../types/project';

const useStyles = makeStyles({
  // String, not bare `0` - a numeric `0` on `minWidth` is silently dropped by this project's
  // makeStyles (see the griffel-gotchas memory), which would leave this text unable to shrink
  // below its full content width and defeat the ellipsis truncation below.
  name: {
    minWidth: '0px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  clientInline: {
    flexShrink: 0,
    marginLeft: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
  },
});

interface ProjectNameClusterProps {
  project: Project;
}

/**
 * Projektname (fett) + Kunde (grau) + Chargeable-Icon - identische Darstellung überall, wo ein
 * Projekt benannt wird (Projektliste, Monatstabelle, Kontingent-Charts). The name itself truncates
 * with an ellipsis (rather than wrapping) once its flex container runs out of room; client name
 * and the icon stay fixed-size so they never get squeezed out first.
 */
export function ProjectNameCluster({ project }: ProjectNameClusterProps) {
  const styles = useStyles();
  return (
    <>
      <Text weight="semibold" className={styles.name}>
        {project.name}
      </Text>
      {project.client && <Text className={styles.clientInline}>{project.client}</Text>}
      <ChargeableIcon chargeable={project.chargeable} />
    </>
  );
}
