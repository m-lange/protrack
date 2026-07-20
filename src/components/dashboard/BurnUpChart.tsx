import { useState } from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { ProjectAvatar } from '../ProjectAvatar';
import { MONTH_NAMES } from '../../utils/calendarGrid';
import {
  CHART_VIEW_WIDTH,
  clampTooltipPercent,
  LEGEND_ROW_HEIGHT,
  LEGEND_ROW_MARGIN_TOP,
  niceMax,
  ticksFor,
} from '../../utils/chartScale';
import { formatHoursDe } from '../../utils/format';
import type { Project } from '../../types/project';
import { ProjectNameCluster } from '../ProjectNameCluster';

const VIEW_W = CHART_VIEW_WIDTH;
const VIEW_H = 220;
const MARGIN = { top: 16, right: 12, bottom: 24, left: 34 };
const PLOT_W = VIEW_W - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const SLOT_W = PLOT_W / 12;

const useStyles = makeStyles({
  root: {
    position: 'relative',
    width: `${VIEW_W}px`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalXS,
  },
  avatar: {
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
  availableZone: {
    fill: tokens.colorPaletteGreenBackground2,
    opacity: 0.2,
  },
  budgetLine: {
    fill: 'none',
    stroke: tokens.colorPaletteRedBorderActive,
    strokeWidth: 2,
    strokeDasharray: '4 3',
  },
  budgetLabel: {
    fill: tokens.colorPaletteRedForeground2,
    fontSize: '10px',
  },
  area: {
    fill: tokens.colorCompoundBrandBackground,
    opacity: 0.12,
  },
  bookedLine: {
    fill: 'none',
    stroke: tokens.colorCompoundBrandBackground,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  forecastLine: {
    fill: 'none',
    stroke: tokens.colorNeutralForeground3,
    strokeWidth: 2,
    strokeDasharray: '5 4',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  bookedMarker: {
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
  legendSwatchLine: {
    width: '14px',
    height: '2px',
    flexShrink: 0,
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

interface BurnUpChartProps {
  project: Project;
  budgetDays: number;
  /** Kontingent (Tage) available by month, 12 entries - usually flat, but steps up mid-year for a
   * project with a later-starting contingent entry (e.g. a Nachtrag/contract renewal). See
   * `budgetByMonthForYear` in `types/project.ts`. */
  budgetByMonth: number[];
  bookedByMonth: number[];
  forecastByMonth: number[];
  /** Months to actually plot the *booked* line/markers for (1-12) - the forecast and Kontingent
   * lines always span the full year. Used to stop the "Gebucht"-line at the current month for
   * the current year instead of implying "0 booked" for months that simply haven't happened yet. */
  monthsToInclude?: number;
}

/** Burn-up chart: kumulierte gebuchte Tage vs. kumulierter Forecast vs. Kontingent (kumulierte Verfügbarkeit), pro Projekt. */
export function BurnUpChart({ project, budgetDays, budgetByMonth, bookedByMonth, forecastByMonth, monthsToInclude = 12 }: BurnUpChartProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState<number | null>(null);

  let bookedCursor = 0;
  const cumulativeBooked = bookedByMonth.map((value) => (bookedCursor += value));
  let forecastCursor = 0;
  const cumulativeForecast = forecastByMonth.map((value) => (forecastCursor += value));

  const yMax = niceMax(Math.max(budgetDays, ...cumulativeBooked.slice(0, monthsToInclude), ...cumulativeForecast, 1));
  const yTicks = ticksFor(yMax, 4);
  const scaleY = (value: number) => MARGIN.top + PLOT_H - (Math.min(value, yMax) / yMax) * PLOT_H;
  const xForMonth = (monthIndex: number) => MARGIN.left + monthIndex * SLOT_W + SLOT_W / 2;

  const bookedPoints = cumulativeBooked
    .slice(0, monthsToInclude)
    .map((value, monthIndex) => ({ x: xForMonth(monthIndex), y: scaleY(value) }));
  const forecastPoints = cumulativeForecast
    .slice(0, monthsToInclude)
    .map((value, monthIndex) => ({ x: xForMonth(monthIndex), y: scaleY(value) }));
  const budgetPoints = budgetByMonth.map((value, monthIndex) => ({ x: xForMonth(monthIndex), y: scaleY(value) }));

  const linePath = (points: { x: number; y: number }[]) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaUnderLine = (points: { x: number; y: number }[], baselineY: number) =>
    points.length > 0
      ? `M${points[0].x},${baselineY} ${points.map((p) => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${baselineY} Z`
      : '';

  const baseline = MARGIN.top + PLOT_H;
  const areaPath = areaUnderLine(bookedPoints, baseline);
  const availableAreaPath = areaUnderLine(budgetPoints, baseline);

  const budgetY = budgetPoints.length > 0 ? budgetPoints[budgetPoints.length - 1].y : scaleY(budgetDays);

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <ProjectAvatar project={project} size={20} className={styles.avatar} />
        <ProjectNameCluster project={project} />
      </div>
      <div className={styles.svgWrap}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`Burn-up Kontingent ${project.name}`}
        >
          {yTicks.map((tick) => {
            const y = scaleY(tick);
            return (
              <g key={tick}>
                <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={y} y2={y} className={styles.gridLine} />
                <text x={MARGIN.left - 6} y={y + 3} textAnchor="end" className={styles.axisLabel}>
                  {formatHoursDe(tick)}
                </text>
              </g>
            );
          })}

          <path d={availableAreaPath} className={styles.availableZone} />

          <path d={areaPath} className={styles.area} />

          <path d={linePath(budgetPoints)} className={styles.budgetLine} />
          <text x={VIEW_W - MARGIN.right} y={budgetY - 4} textAnchor="end" className={styles.budgetLabel}>
            Kontingent {formatHoursDe(budgetDays)}
          </text>

          <path d={linePath(forecastPoints)} className={styles.forecastLine} />
          <path d={linePath(bookedPoints)} className={styles.bookedLine} />
          {bookedPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} className={styles.bookedMarker} />
          ))}

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
              <Text size={200}>Gebucht (kumuliert)</Text>
              <Text size={200} weight="semibold">
                {hovered < monthsToInclude ? `${formatHoursDe(cumulativeBooked[hovered])} Tage` : '–'}
              </Text>
            </div>
            <div className={styles.tooltipRow}>
              <Text size={200}>Forecast (kumuliert)</Text>
              <Text size={200}>{formatHoursDe(cumulativeForecast[hovered])} Tage</Text>
            </div>
            <div className={styles.tooltipRow}>
              <Text size={200}>Restkontingent</Text>
              <Text size={200}>
                {hovered < monthsToInclude ? `${formatHoursDe(budgetByMonth[hovered] - cumulativeBooked[hovered])} Tage` : '–'}
              </Text>
            </div>
          </div>
        )}
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendSwatchLine} style={{ backgroundColor: tokens.colorCompoundBrandBackground }} />
          <Text size={200}>Gebucht (kumuliert)</Text>
        </div>
        <div className={styles.legendItem}>
          <div
            className={styles.legendSwatchLine}
            style={{ backgroundImage: `linear-gradient(90deg, ${tokens.colorNeutralForeground3} 60%, transparent 40%)`, backgroundSize: '6px 2px' }}
          />
          <Text size={200}>Forecast (kumuliert)</Text>
        </div>
      </div>
    </div>
  );
}
