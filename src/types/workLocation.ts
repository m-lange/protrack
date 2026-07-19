import { tokens } from '@fluentui/react-components';

export type WorkLocation = 'kunde' | 'buero' | 'homeoffice' | 'abwesend';

export const WORK_LOCATION_LABELS: Record<WorkLocation, string> = {
  kunde: 'Beim Kunden',
  homeoffice: 'Home Office',
  buero: 'Büro',
  abwesend: 'Abwesend',
};

export const WORK_LOCATIONS: WorkLocation[] = ['kunde', 'buero', 'homeoffice', 'abwesend'];

export const WORK_LOCATION_COLORS: Record<WorkLocation, string> = {
  kunde: tokens.colorPaletteBerryBackground3,
  homeoffice: tokens.colorPaletteLightGreenBackground3,
  buero: tokens.colorPaletteBlueBorderActive,
  abwesend: tokens.colorPaletteMarigoldBackground3,
};

/** The subset of `WorkLocation` shown in dashboard charts/tables (excludes `abwesend`). */
export type ChartLocation = 'kunde' | 'buero' | 'homeoffice';

export const CHART_LOCATIONS: ChartLocation[] = ['kunde', 'buero', 'homeoffice'];
