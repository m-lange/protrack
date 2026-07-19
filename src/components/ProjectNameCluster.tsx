import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { ChargeableIcon } from './ChargeableIcon';
import type { Project } from '../types/project';

const useStyles = makeStyles({
  clientInline: {
    marginLeft: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
  },
});

interface ProjectNameClusterProps {
  project: Project;
}

/**
 * Projektname (fett) + Kunde (grau) + Chargeable-Icon - identische Darstellung überall, wo ein
 * Projekt benannt wird (Projektliste, Monatstabelle, Kontingent-Charts).
 */
export function ProjectNameCluster({ project }: ProjectNameClusterProps) {
  const styles = useStyles();
  return (
    <>
      <Text weight="semibold">{project.name}</Text>
      {project.client && <Text className={styles.clientInline}>{project.client}</Text>}
      <ChargeableIcon chargeable={project.chargeable} />
    </>
  );
}
