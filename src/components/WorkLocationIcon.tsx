import {
  Building16Filled,
  Building16Regular,
  BuildingBank16Filled,
  BuildingBank16Regular,
  Home16Filled,
  Home16Regular,
  PersonProhibited16Filled,
  PersonProhibited16Regular,
  type FluentIcon,
} from '@fluentui/react-icons';
import { WORK_LOCATION_COLORS, type WorkLocation } from '../types/workLocation';

const FILLED_ICONS: Record<WorkLocation, FluentIcon> = {
  kunde: BuildingBank16Filled,
  homeoffice: Home16Filled,
  buero: Building16Filled,
  abwesend: PersonProhibited16Filled,
};

const OUTLINE_ICONS: Record<WorkLocation, FluentIcon> = {
  kunde: BuildingBank16Regular,
  homeoffice: Home16Regular,
  buero: Building16Regular,
  abwesend: PersonProhibited16Regular,
};

interface WorkLocationIconProps {
  value: WorkLocation;
  /** `filled` (default) uses the location's own semantic color; `outline` is meant to take a custom `color`. */
  variant?: 'filled' | 'outline';
  /** Overrides the default semantic color, e.g. to match surrounding text instead of the location's own color. */
  color?: string;
}

export function WorkLocationIcon({ value, variant = 'filled', color }: WorkLocationIconProps) {
  const Icon = variant === 'outline' ? OUTLINE_ICONS[value] : FILLED_ICONS[value];
  return <Icon style={{ color: color ?? WORK_LOCATION_COLORS[value] }} />;
}
