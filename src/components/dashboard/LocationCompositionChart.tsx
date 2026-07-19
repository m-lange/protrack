import { useState } from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { MONTH_NAMES } from '../../utils/calendarGrid';
import {
  CHART_VIEW_WIDTH,
  clampTooltipPercent,
  LEGEND_ROW_HEIGHT,
  LEGEND_ROW_MARGIN_TOP,
  niceMax,
  ticksFor,
} from '../../utils/chartScale';
import { roundedTopRectPath } from '../../utils/chartPaths';
import { hoursToDays } from '../../utils/dashboardAggregation';
import { formatHoursDe } from '../../utils/format';
import { WORK_LOCATION_COLORS, WORK_LOCATION_LABELS, type ChartLocation } from '../../types/workLocation';

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 220;
// Right margin matches left so the secondary "Tage" axis has the same room as the "Std." axis.
const MARGIN = { top: 16, right: 34, bottom: 24, left: 34 };
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const SLOT_W = PLOT_W / 12;
const BAR_W = Math.min(SLOT_W * 0.5, 24);
const SEGMENT_GAP = 2;

const SEGMENTS: { key: ChartLocation; label: string; color: string }[] = [
  { key: 'kunde', label: WORK_LOCATION_LABELS.kunde, color: WORK_LOCATION_COLORS.kunde },
  { key: 'buero', label: WORK_LOCATION_LABELS.buero, color: WORK_LOCATION_COLORS.buero },
  { key: 'homeoffice', label: WORK_LOCATION_LABELS.homeoffice, color: WORK_LOCATION_COLORS.homeoffice },
];

const useStyles = makeStyles({
  // Fixed width/height (matching VIEW_W/VIEW_H 1:1) - see the matching comment in ChargeabilityChart.tsx.
  root: {
    position: 'relative',
    width: `${VIEW_W}px`,
  },
  // See the matching comment in CompositionChart.tsx.
  title: {
    display: 'block',
    marginBottom: tokens.spacingVerticalXS,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalL,
    marginTop: LEGEND_ROW_MARGIN_TOP,
    flexWrap: 'wrap',
    minHeight: LEGEND_ROW_HEIGHT,
    alignItems: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  swatch: {
    width: '10px',
    height: '10px',
    borderRadius: tokens.borderRadiusSmall,
    flexShrink: 0,
  },
  svgWrap: {
    position: 'relative',
  },
  svg: {
    display: 'block',
    width: `${VIEW_W}px`,
    height: `${VIEW_H}px`,
  },
  gridLine: {
    stroke: tokens.colorNeutralStroke2,
    strokeWidth: 1,
  },
  axisLabel: {
    fill: tokens.colorNeutralForeground3,
    fontSize: '10px',
  },
  axisUnitLabel: {
    fill: tokens.colorNeutralForeground4,
    fontSize: '9px',
  },
  hoverRect: {
    fill: 'transparent',
  },
  hoverRectActive: {
    fill: tokens.colorNeutralBackground3,
  },
  tooltip: {
    position: 'absolute',
    top: '4px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    width: 'max-content',
    maxWidth: '45%',
    padding: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow16,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    pointerEvents: 'none',
    transform: 'translateX(-50%)',
  },
  tooltipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
});

interface LocationCompositionChartProps {
  hoursByLocation: Record<ChartLocation, number[]>;
}

/** Stacked bar chart: booked hours per month, split by Arbeitsort (Kunde/Büro/Home Office) - analog zu CompositionChart. */
export function LocationCompositionChart({ hoursByLocation }: LocationCompositionChartProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState<number | null>(null);

  const segmentColor = (segment: (typeof SEGMENTS)[number]) => segment.color;

  const totals = Array.from(
    { length: 12 },
    (_, m) => hoursByLocation.kunde[m] + hoursByLocation.buero[m] + hoursByLocation.homeoffice[m],
  );
  const yMax = niceMax(Math.max(1, ...totals));
  const yTicks = ticksFor(yMax, 4);
  const scaleY = (value: number) => (value / yMax) * PLOT_H;

  const bars = Array.from({ length: 12 }, (_, monthIndex) => {
    const slotX = MARGIN.left + monthIndex * SLOT_W;
    const barX = slotX + (SLOT_W - BAR_W) / 2;
    const baseline = MARGIN.top + PLOT_H;
    let cursor = baseline;
    const segments = SEGMENTS.map((segment) => {
      const value = hoursByLocation[segment.key][monthIndex] ?? 0;
      const height = Math.max(0, scaleY(value) - (value > 0 ? SEGMENT_GAP : 0));
      const y = cursor - height;
      cursor -= scaleY(value);
      return { ...segment, value, path: roundedTopRectPath(barX, y, BAR_W, height, 3) };
    });
    return { monthIndex, slotX, segments, total: totals[monthIndex] };
  });

  const hoveredBar = hovered !== null ? bars[hovered] : null;

  return (
    <div className={styles.root}>
      <Text weight="semibold" className={styles.title}>
        Zusammensetzung der gebuchten Stunden nach Arbeitsort
      </Text>
      <div className={styles.svgWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Zusammensetzung der gebuchten Stunden nach Arbeitsort pro Monat"
        >
          {yTicks.map((tick) => {
            const y = MARGIN.top + PLOT_H - scaleY(tick);
            return (
              <g key={tick}>
                <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={y} y2={y} className={styles.gridLine} />
                <text x={MARGIN.left - 6} y={y + 3} textAnchor="end" className={styles.axisLabel}>
                  {Math.round(tick)}
                </text>
                {/* Same values re-expressed in "Tage" (÷8) on the right - a unit relabeling of the
                    identical scale, not a second independent measure - see CompositionChart.tsx. */}
                <text x={VIEW_W - MARGIN.right + 6} y={y + 3} textAnchor="start" className={styles.axisLabel}>
                  {formatHoursDe(hoursToDays(tick))}
                </text>
              </g>
            );
          })}
          <text x={MARGIN.left} y={MARGIN.top - 6} textAnchor="start" className={styles.axisUnitLabel}>
            Std.
          </text>
          <text x={VIEW_W - MARGIN.right} y={MARGIN.top - 6} textAnchor="end" className={styles.axisUnitLabel}>
            Tage
          </text>

          {bars.map((bar) => (
            <g key={bar.monthIndex}>
              <rect
                x={bar.slotX}
                y={MARGIN.top}
                width={SLOT_W}
                height={PLOT_H}
                className={hovered === bar.monthIndex ? styles.hoverRectActive : styles.hoverRect}
                onMouseEnter={() => setHovered(bar.monthIndex)}
                onMouseLeave={() => setHovered(null)}
              />
              {bar.segments.map((segment) => (
                <path key={segment.key} d={segment.path} fill={segmentColor(segment)} />
              ))}
              <text x={bar.slotX + SLOT_W / 2} y={VIEW_H - 6} textAnchor="middle" className={styles.axisLabel}>
                {MONTH_NAMES[bar.monthIndex].slice(0, 3)}
              </text>
            </g>
          ))}
        </svg>
        {hoveredBar && (
          <div
            className={styles.tooltip}
            style={{ left: `${clampTooltipPercent(((hoveredBar.slotX + SLOT_W / 2) / VIEW_W) * 100)}%` }}
          >
            <Text size={200} weight="semibold">
              {MONTH_NAMES[hoveredBar.monthIndex]}
            </Text>
            {hoveredBar.segments.map((segment) => (
              <div key={segment.key} className={styles.tooltipRow}>
                <Text size={200}>{segment.label}</Text>
                <Text size={200}>{formatHoursDe(segment.value)} Std.</Text>
              </div>
            ))}
            <div className={styles.tooltipRow}>
              <Text size={200} weight="semibold">
                Gesamt
              </Text>
              <Text size={200} weight="semibold">
                {formatHoursDe(hoveredBar.total)} Std.
              </Text>
            </div>
          </div>
        )}
      </div>
      <div className={styles.legend}>
        {SEGMENTS.map((segment) => (
          <div key={segment.key} className={styles.legendItem}>
            <div className={styles.swatch} style={{ backgroundColor: segment.color }} />
            <Text size={200}>{segment.label}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}
