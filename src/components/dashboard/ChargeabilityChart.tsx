import { useState } from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { MONTH_NAMES } from '../../utils/calendarGrid';
import { CHART_VIEW_WIDTH, clampTooltipPercent, LEGEND_ROW_HEIGHT, LEGEND_ROW_MARGIN_TOP } from '../../utils/chartScale';

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 220;
const MARGIN = { top: 16, right: 12, bottom: 24, left: 34 };
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const SLOT_W = PLOT_W / 12;
/** Percentage axis step (25/50/75/100…) - the ceiling grows past 100 when a value/target does, since
 * booking more than 8h on a working day (or being "abwesend" less than the deducted allowance) can
 * push chargeability/Arbeitsort-% above 100% - see dashboardAggregation.ts's `computeAvailableHoursByMonth`. */
const Y_AXIS_STEP = 25;

const useStyles = makeStyles({
  // Fixed width (matching VIEW_W 1:1, not `width: '100%'`) so every dashboard chart/table has a
  // stable, predictable size instead of reflowing with its card - if the page is narrower than
  // the combined content, the page itself scrolls horizontally (see DashboardPage's `.content`),
  // not this individual chart.
  root: {
    position: 'relative',
    width: `${VIEW_W}px`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalXS,
  },
  targetHint: {
    color: tokens.colorNeutralForeground3,
  },
  svgWrap: {
    position: 'relative',
  },
  // Chargeability is a single series, so it has no legend (per the dataviz convention: a lone
  // series needs no legend box). This reserves the same vertical space a real legend row would
  // take (see CompositionChart.tsx etc.) so every chart card ends up the same total height.
  legendSpacer: {
    marginTop: LEGEND_ROW_MARGIN_TOP,
    minHeight: LEGEND_ROW_HEIGHT,
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
  targetLine: {
    stroke: tokens.colorPaletteMarigoldBorderActive,
    strokeWidth: 1,
    strokeDasharray: '4 3',
  },
  targetLabel: {
    fill: tokens.colorPaletteMarigoldForeground2,
    fontSize: '10px',
  },
  // Lavender for the average line - same "computed reference" color used by the Hochrechnung
  // line in ChargeableDaysChart, so the dashboard uses one consistent color language: marigold
  // for a manually-set Ziel, lavender for a value derived from the actual bookings.
  averageLine: {
    stroke: tokens.colorPaletteLavenderBorderActive,
    strokeWidth: 1,
    strokeDasharray: '2 3',
  },
  averageLabel: {
    fill: tokens.colorPaletteLavenderForeground2,
    fontSize: '10px',
  },
  area: {
    fill: tokens.colorCompoundBrandBackground,
    opacity: 0.12,
  },
  line: {
    fill: 'none',
    stroke: tokens.colorCompoundBrandBackground,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  marker: {
    fill: tokens.colorCompoundBrandBackground,
    stroke: tokens.colorNeutralBackground1,
    strokeWidth: 2,
  },
  crosshair: {
    stroke: tokens.colorNeutralStroke1,
    strokeWidth: 1,
  },
  hoverRect: {
    fill: 'transparent',
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

interface ChargeabilityChartProps {
  /** Percent per month (0-100), `null` for months without working days. */
  values: (number | null)[];
  target: number;
  /** Hours-weighted Ø Chargeability over the plotted months (same value as the KPI tile), `null` if no month has data yet. */
  average: number | null;
}

/** Line chart of monthly chargeability (%), with a dashed, fixed target reference line and a dashed Ø reference line. */
export function ChargeabilityChart({ values, target, average }: ChargeabilityChartProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState<number | null>(null);

  const numericValues = values.filter((value): value is number => value !== null);
  const yMax = Math.max(100, Math.ceil(Math.max(0, target, average ?? 0, ...numericValues) / Y_AXIS_STEP) * Y_AXIS_STEP);

  const scaleY = (value: number) => MARGIN.top + PLOT_H - (value / yMax) * PLOT_H;
  const xForMonth = (monthIndex: number) => MARGIN.left + monthIndex * SLOT_W + SLOT_W / 2;

  const points = values.map((value, monthIndex) => (value === null ? null : { x: xForMonth(monthIndex), y: scaleY(value) }));

  const linePath = points
    .map((point, index) => {
      if (!point) return null;
      const prevIsGap = index === 0 || points[index - 1] === null;
      return `${prevIsGap ? 'M' : 'L'}${point.x},${point.y}`;
    })
    .filter(Boolean)
    .join(' ');

  const areaSegments: string[] = [];
  let segment: { x: number; y: number }[] = [];
  points.forEach((point, index) => {
    if (point) {
      segment.push(point);
    }
    if ((!point || index === points.length - 1) && segment.length > 0) {
      const first = segment[0];
      const last = segment[segment.length - 1];
      const baseline = MARGIN.top + PLOT_H;
      areaSegments.push(
        `M${first.x},${baseline} ${segment.map((p) => `L${p.x},${p.y}`).join(' ')} L${last.x},${baseline} Z`,
      );
      segment = [];
    }
  });

  const targetY = scaleY(Math.max(0, target));
  const averageY = average === null ? null : scaleY(Math.max(0, average));
  const ticks = Array.from({ length: yMax / Y_AXIS_STEP + 1 }, (_, i) => i * Y_AXIS_STEP);

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <Text weight="semibold">Chargeability</Text>
        <Text size={200} className={styles.targetHint}>
          Ziel {target}% · abrechenbare Tage. ÷ verfügbare Tage
        </Text>
      </div>
      <div className={styles.svgWrap}>
        <svg className={styles.svg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="Chargeability pro Monat">
          {ticks.map((tick) => {
            const y = scaleY(tick);
            return (
              <g key={tick}>
                <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={y} y2={y} className={styles.gridLine} />
                <text x={MARGIN.left - 6} y={y + 3} textAnchor="end" className={styles.axisLabel}>
                  {tick}
                </text>
              </g>
            );
          })}

          {areaSegments.map((d, index) => (
            <path key={index} d={d} className={styles.area} />
          ))}
          {linePath && <path d={linePath} className={styles.line} />}
          {points.map(
            (point, index) => point && <circle key={index} cx={point.x} cy={point.y} r={4} className={styles.marker} />,
          )}

          <line
            x1={MARGIN.left}
            x2={VIEW_W - MARGIN.right}
            y1={targetY}
            y2={targetY}
            className={styles.targetLine}
          />
          <text x={VIEW_W - MARGIN.right} y={targetY - 4} textAnchor="end" className={styles.targetLabel}>
            Ziel {target}%
          </text>

          {averageY !== null && (
            <>
              <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={averageY} y2={averageY} className={styles.averageLine} />
              <text x={MARGIN.left + 4} y={averageY - 4} textAnchor="start" className={styles.averageLabel}>
                Ø {average!.toFixed(1)}%
              </text>
            </>
          )}

          {hovered !== null && (
            <line
              x1={xForMonth(hovered)}
              x2={xForMonth(hovered)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              className={styles.crosshair}
            />
          )}

          {Array.from({ length: 12 }, (_, monthIndex) => (
            <rect
              key={monthIndex}
              x={MARGIN.left + monthIndex * SLOT_W}
              y={MARGIN.top}
              width={SLOT_W}
              height={PLOT_H}
              className={styles.hoverRect}
              onMouseEnter={() => setHovered(monthIndex)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {Array.from({ length: 12 }, (_, monthIndex) => (
            <text
              key={monthIndex}
              x={xForMonth(monthIndex)}
              y={VIEW_H - 6}
              textAnchor="middle"
              className={styles.axisLabel}
            >
              {MONTH_NAMES[monthIndex].slice(0, 3)}
            </text>
          ))}
        </svg>
        {hovered !== null && (
          <div className={styles.tooltip} style={{ left: `${clampTooltipPercent((xForMonth(hovered) / VIEW_W) * 100)}%` }}>
            <Text size={200} weight="semibold">
              {MONTH_NAMES[hovered]}
            </Text>
            <div className={styles.tooltipRow}>
              <Text size={200}>Chargeability</Text>
              <Text size={200} weight="semibold">
                {values[hovered] === null ? '–' : `${values[hovered]!.toFixed(1)}%`}
              </Text>
            </div>
            {values[hovered] !== null && (
              <div className={styles.tooltipRow}>
                <Text size={200}>ggü. Ziel</Text>
                <Text size={200}>
                  {values[hovered]! - target >= 0 ? '+' : ''}
                  {(values[hovered]! - target).toFixed(1)} Pkt.
                </Text>
              </div>
            )}
            {values[hovered] !== null && average !== null && (
              <div className={styles.tooltipRow}>
                <Text size={200}>ggü. Ø</Text>
                <Text size={200}>
                  {values[hovered]! - average >= 0 ? '+' : ''}
                  {(values[hovered]! - average).toFixed(1)} Pkt.
                </Text>
              </div>
            )}
          </div>
        )}
      </div>
      <div className={styles.legendSpacer} />
    </div>
  );
}
