import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Organization24Regular, Premium24Regular, Scales24Regular } from '@fluentui/react-icons';
import { CHARGEABLE_COLORS, type Chargeable } from '../types/project';

const useStyles = makeStyles({
  icon: {
    width: '14px',
    height: '14px',
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
  const color = CHARGEABLE_COLORS[chargeable];
  if (chargeable === 'yes') return <Premium24Regular className={merged} style={{ color }} />;
  if (chargeable === 'no') return <Organization24Regular className={merged} style={{ color }} />;
  return <Scales24Regular className={merged} style={{ color }} />;
}
