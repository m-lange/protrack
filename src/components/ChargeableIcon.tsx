import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { CircleLine24Regular, Organization24Regular, Premium24Regular } from '@fluentui/react-icons';
import type { Chargeable } from '../types/project';

const useStyles = makeStyles({
  icon: {
    width: '14px',
    height: '14px',
    color: tokens.colorNeutralForeground3,
    marginLeft: tokens.spacingHorizontalXS,
  },
});

interface ChargeableIconProps {
  chargeable: Chargeable;
  className?: string;
}

/** Chargeable-Icon eines Projekts - identische Darstellung überall, wo ein Projekt benannt wird. */
export function ChargeableIcon({ chargeable, className }: ChargeableIconProps) {
  const styles = useStyles();
  const merged = mergeClasses(styles.icon, className);
  if (chargeable === 'yes') return <Premium24Regular className={merged} />;
  if (chargeable === 'no') return <Organization24Regular className={merged} />;
  return <CircleLine24Regular className={merged} />;
}
