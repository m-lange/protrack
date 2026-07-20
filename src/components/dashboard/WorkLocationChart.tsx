import { useState } from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { MONTH_NAMES } from '../../utils/calendarGrid';
import { CHART_VIEW_WIDTH, clampTooltipPercent, LEGEND_ROW_HEIGHT, LEGEND_ROW_MARGIN_TOP } from '../../utils/chartScale';
import { WORK_LOCATION_COLORS, WORK_LOCATION_LABELS, type ChartLocation } from '../../types/workLocation';

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 220;
const MARGIN = { top: 16, right: 12, bottom: 24, left: 34 };
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const SLOT_W = PLOT_W / 12;
/** See the matching comment in ChargeabilityChart.tsx - the axis ceiling grows past 100 when a
 * value/target does. */
const Y_AXIS_STEP = 25;

const SERIES: { key: ChartLocation; label: string; color: string }[] = [
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

interface WorkLocationChartProps {
  /** Percent per month (0-100) for kunde/buero/homeoffice, `null` for months without working days. */
  valuesByLocation: Record<ChartLocation, (number | null)[]>;
  targetsByLocation: Record<ChartLocation, number>;
}

/** Line chart of monthly work-location share (%), analog zu ChargeabilityChart, mit einer Linie je Ort. */
export function WorkLocationChart({ valuesByLocation, targetsByLocation }: WorkLocationChartProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState<number | null>(null);

  const numericValues = SERIES.flatMap((series) => valuesByLocation[series.key].filter((value): value is number => value !== null));
  const targetValues = SERIES.map((series) => targetsByLocation[series.key]);
  const yMax = Math.max(100, Math.ceil(Math.max(0, ...targetValues, ...numericValues) / Y_AXIS_STEP) * Y_AXIS_STEP);

  const scaleY = (value: number) => MARGIN.top + PLOT_H - (value / yMax) * PLOT_H;
  const xForMonth = (monthIndex: number) => MARGIN.left + monthIndex * SLOT_W + SLOT_W / 2;

  const seriesData = SERIES.map((series) => {
    const values = valuesByLocation[series.key];
    const points = values.map((value, monthIndex) => (value === null ? null : { x: xForMonth(monthIndex), y: scaleY(value) }));
    const linePath = points
      .map((point, index) => {
        if (!point) return null;
        const prevIsGap = index === 0 || points[index - 1] === null;
        return `${prevIsGap ? 'M' : 'L'}${point.x},${point.y}`;
      })
      .filter(Boolean)
      .join(' ');
    return { ...series, values, points, linePath, target: targetsByLocation[series.key] };
  });

  const ticks = Array.from({ length: yMax / Y_AXIS_STEP + 1 }, (_, i) => i * Y_AXIS_STEP);

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <Text weight="semibold">Arbeitsorte</Text>
        <Text size={200} className={styles.targetHint}>
          Ziel Kunde {targetsByLocation.kunde}% · Büro {targetsByLocation.buero}% · Home Office Rest ({targetsByLocation.homeoffice}%)
        </Text>
      </div>
      <div className={styles.svgWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Anteil Arbeitsorte pro Monat"
        >
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

          {seriesData.map((series) => (
            <line
              key={`target-${series.key}`}
              x1={MARGIN.left}
              x2={VIEW_W - MARGIN.right}
              y1={scaleY(series.target)}
              y2={scaleY(series.target)}
              stroke={series.color}
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          ))}

          {seriesData.map(
            (series) =>
              series.linePath && (
                <path
                  key={series.key}
                  d={series.linePath}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ),
          )}
          {seriesData.map((series) =>
            series.points.map(
              (point, index) =>
                point && (
                  <circle
                    key={`${series.key}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={series.color}
                    stroke={tokens.colorNeutralBackground1}
                    strokeWidth={2}
                  />
                ),
            ),
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
            {seriesData.map((series) => {
              const value = series.values[hovered];
              return (
                <div key={series.key} className={styles.tooltipRow}>
                  <Text size={200}>{series.label}</Text>
                  <Text size={200} weight="semibold">
                    {value === null ? '–' : `${value.toFixed(1)}%`}
                  </Text>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.legend}>
        {SERIES.map((series) => (
          <div key={series.key} className={styles.legendItem}>
            <div className={styles.swatch} style={{ backgroundColor: series.color }} />
            <Text size={200}>{series.label}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}
