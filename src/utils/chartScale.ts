/** Rounds a data max up to a "nice" axis ceiling (1/2/5 * 10^n) so gridline labels read as clean numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

/** Evenly spaced tick values from 0 to `max` (inclusive), `count` steps. */
export function ticksFor(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

/**
 * Keeps a centered, percentage-positioned tooltip (`left: X%` + `translateX(-50%)`) from ever
 * overflowing its own container - pair with a matching CSS `maxWidth: '<2 * halfWidthPercent>%'`
 * on the tooltip so its rendered width can never exceed what this clamp accounts for. Without
 * this, hovering near either edge (e.g. December) pushes the tooltip past the container, which
 * makes an `overflowX: auto` ancestor grow a horizontal scrollbar just from hovering.
 */
export function clampTooltipPercent(rawPercent: number, halfWidthPercent = 22.5): number {
  return Math.min(100 - halfWidthPercent, Math.max(halfWidthPercent, rawPercent));
}

/**
 * Every dashboard chart reserves exactly this much space below its plot for a legend row -
 * charts with a real legend (2+ series) size it to this height; a single-series chart with no
 * legend renders an empty spacer of the same height instead, so every chart card ends up the
 * same total height regardless of whether it actually has a legend.
 */
export const LEGEND_ROW_HEIGHT = '28px';

/** Space between the chart (x-axis) and the legend row below it, shared so every chart matches. */
export const LEGEND_ROW_MARGIN_TOP = '12px';

/** SVG viewport width (px) shared by every dashboard chart component. */
export const CHART_VIEW_WIDTH = 560;

/** DashboardCard's own horizontal padding (px, each side) - matches tokens.spacingHorizontalL. */
const CHART_CARD_PADDING = 16;

/** Rendered width (px) of one chart wrapped in a DashboardCard: view width + padding both sides. */
export const CHART_CARD_WIDTH = CHART_VIEW_WIDTH + CHART_CARD_PADDING * 2;

/** Gap (px) between the two charts in a chart row - matches tokens.spacingHorizontalXL. */
export const CHART_ROW_GAP = 20;

/**
 * Width (px) of the whole dashboard content block: exactly two chart cards side by side. Every
 * other row (KPI tiles, a lone trailing chart) is sized/aligned against this same width so the
 * dashboard reads as one consistent left-aligned block instead of independently centered rows.
 */
export const DASHBOARD_CONTENT_WIDTH = CHART_CARD_WIDTH * 2 + CHART_ROW_GAP;

/** Gap (px) between KPI tiles - matches tokens.spacingHorizontalL. */
const KPI_TILE_GAP = 16;

/** How many KPI tiles should exactly span the same width as two charts side by side. */
const KPI_TILES_PER_CHART_ROW = 6;

/**
 * Width (px) of a single KPI tile, computed so that KPI_TILES_PER_CHART_ROW tiles plus their
 * gaps exactly equal DASHBOARD_CONTENT_WIDTH (rounded to 2 decimals - the sub-pixel remainder is
 * imperceptible and CSS handles fractional px fine).
 */
export const KPI_TILE_WIDTH =
  Math.round(((DASHBOARD_CONTENT_WIDTH - (KPI_TILES_PER_CHART_ROW - 1) * KPI_TILE_GAP) / KPI_TILES_PER_CHART_ROW) * 100) / 100;
