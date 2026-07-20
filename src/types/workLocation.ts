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

/** The subset of `WorkLocation` compared against Ziel-% and plotted as a share of booked Kunde/Büro/Home-Office days in `WorkLocationChart`/KPI tiles (see `locationPercent`) - excludes `abwesend`, which has no meaningful share of that ratio and is shown instead as an absolute-hours segment in `LocationCompositionChart`. */
export type ChartLocation = 'kunde' | 'buero' | 'homeoffice';

export const CHART_LOCATIONS: ChartLocation[] = ['kunde', 'buero', 'homeoffice'];
