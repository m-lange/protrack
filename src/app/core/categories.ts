import { Billing, HEX_COLOR, Location, PROJECT_COLOR_PRESETS, ProjectStatus } from './data/model';
import { IconName } from '../shared/icon/icons';

/**
 * The categories of the app with their colors, icons and chip classes, in their fixed order.
 * The colors are CSS variables from src/categories.css: change a color there, not here.
 * The names are in the strings file.
 */
export interface Category<Id extends string> {
  id: Id;
  /** Main color: charts, swatches, dots. */
  color: string;
  /** The pt-chip modifier that shows the category as a chip. */
  chip: string;
}

/**
 * A location also has an icon and a text color for icons and text on white (4.5:1). In this
 * order everywhere: on-site, Reply, home office, out of office (user, 2026-11-10).
 */
export const LOCATIONS: readonly (Category<Location> & { icon: IconName; text: string })[] = [
  {
    id: 'onsite',
    color: 'var(--location-onsite)',
    text: 'var(--location-onsite-text)',
    chip: 'pt-chip--onsite',
    icon: 'loc-onsite',
  },
  {
    id: 'reply',
    color: 'var(--location-reply)',
    text: 'var(--location-reply-text)',
    chip: 'pt-chip--reply',
    icon: 'loc-reply',
  },
  {
    id: 'home',
    color: 'var(--location-home)',
    text: 'var(--location-home-text)',
    chip: 'pt-chip--home',
    icon: 'loc-home',
  },
  {
    id: 'ooo',
    color: 'var(--location-ooo)',
    text: 'var(--location-ooo-text)',
    chip: 'pt-chip--ooo',
    icon: 'loc-ooo',
  },
];

export type { Billing, ProjectStatus } from './data/model';

export const BILLING: readonly Category<Billing>[] = [
  { id: 'chargeable', color: 'var(--billing-chargeable)', chip: 'pt-chip--chargeable' },
  { id: 'nonChargeable', color: 'var(--billing-non-chargeable)', chip: 'pt-chip--non-chargeable' },
  { id: 'neutral', color: 'var(--billing-neutral)', chip: 'pt-chip--neutral' },
];

export const STATUSES: readonly Category<ProjectStatus>[] = [
  { id: 'active', color: 'var(--status-active)', chip: 'pt-chip--active' },
  { id: 'completed', color: 'var(--status-completed)', chip: 'pt-chip--completed' },
];

export function category<Id extends string>(list: readonly Category<Id>[], id: Id): Category<Id> {
  return list.find((c) => c.id === id)!;
}

/**
 * The CSS value of a project color: a preset becomes its design-system token, a custom color
 * stays as it is. Unknown values fall back to the first preset.
 */
export function projectColor(color: string): string {
  if (HEX_COLOR.test(color)) return color;
  const preset = PROJECT_COLOR_PRESETS.find((p) => p === color) ?? PROJECT_COLOR_PRESETS[0];
  return `var(--project-${preset})`;
}
