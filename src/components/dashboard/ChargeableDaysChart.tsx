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
import { formatHoursDe } from '../../utils/format';

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
  bookedMarker: {
    fill: tokens.colorCompoundBrandBackground,
    stroke: tokens.colorNeutralBackground1,
    strokeWidth: 2,
  },
  forecastLine: {
    fill: 'none',
    stroke: tokens.colorNeutralForeground3,
    strokeWidth: 2,
    strokeDasharray: '5 4',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  // Gerade Hochrechnungs-Linie (aktuelles Ø-Tempo linear aufs Jahr hochgerechnet) - eigene Farbe/
  // Strichelung, damit sie sich klar von der (planbasierten) Prognose-Linie unterscheidet.
  trendLine: {
    fill: 'none',
    stroke: tokens.colorPaletteLavenderBorderActive,
    strokeWidth: 2,
    strokeDasharray: '2 3',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  trendLabel: {
    fill: tokens.colorPaletteLavenderForeground2,
    fontSize: '10px',
  },
  crosshair: {
    stroke: tokens.colorNeutralStroke1,
    strokeWidth: 1,
  },
  hoverRect: {
    fill: 'transparent',
  },
  // Kein Legende-Row nötig (Linien sind über Titel/Inline-Labels genug erklärt) - reserviert aber
  // dieselbe Höhe, damit die Karte genauso hoch bleibt wie die übrigen Dashboard-Charts.
  legendSpacer: {
    marginTop: LEGEND_ROW_MARGIN_TOP,
    minHeight: LEGEND_ROW_HEIGHT,
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

interface ChargeableDaysChartProps {
  /** Gebuchte verrechenbare Tage pro Monat (nicht kumuliert), 12 Einträge - wird intern kumuliert. */
  bookedByMonth: number[];
  /** Forecast (Tage) der verrechenbaren Projekte pro Monat (nicht kumuliert), 12 Einträge - wird intern kumuliert. */
  forecastByMonth: number[];
  /** Jahresziel für verrechenbare Tage (z.B. aus den YearSettings) - als exakte, flache Ziellinie eingezeichnet. */
  target: number;
  /** Monate, für die Gebucht/Prognose tatsächlich geplottet werden (1-12) - wie in `BurnUpChart`. */
  monthsToInclude?: number;
}

/**
 * Verrechenbare Tage kumuliert übers Jahr: gebuchte Tage (Linie + Punkte), Prognose der
 * verrechenbaren Projekte (gestrichelt) und eine gerade Hochrechnungs-Linie, die das bisherige
 * Ø-Tempo linear aufs ganze Jahr fortschreibt - zeigt auf einen Blick, ob man bei diesem Tempo das
 * (exakte, flache) Jahresziel erreichen würde. Dazu die Ziellinie selbst als Referenz.
 */
export function ChargeableDaysChart({ bookedByMonth, forecastByMonth, target, monthsToInclude = 12 }: ChargeableDaysChartProps) {
  const styles = useStyles();
  const [hovered, setHovered] = useState<number | null>(null);

  let bookedCursor = 0;
  const cumulativeBooked = bookedByMonth.map((value) => (bookedCursor += value));
  let forecastCursor = 0;
  const cumulativeForecast = forecastByMonth.map((value) => (forecastCursor += value));

  // Nur sinnvoll, solange das Jahr noch nicht vorbei ist - für vergangene Jahre (oder Dezember des
  // laufenden) gäbe es nichts mehr hochzurechnen.
  const showTrend = monthsToInclude > 0 && monthsToInclude < 12;
  const pace = monthsToInclude > 0 ? cumulativeBooked[monthsToInclude - 1] / monthsToInclude : 0;
  const trendByMonth = Array.from({ length: 12 }, (_, m) => pace * (m + 1));

  const yMax = niceMax(
    Math.max(
      target,
      ...cumulativeBooked.slice(0, monthsToInclude),
      ...cumulativeForecast.slice(0, monthsToInclude),
      showTrend ? trendByMonth[11] : 0,
      1,
    ),
  );
  const yTicks = ticksFor(yMax, 4);

  const scaleY = (value: number) => MARGIN.top + PLOT_H - (Math.min(value, yMax) / yMax) * PLOT_H;
  const xForMonth = (monthIndex: number) => MARGIN.left + monthIndex * SLOT_W + SLOT_W / 2;

  const bookedPoints = cumulativeBooked.slice(0, monthsToInclude).map((value, monthIndex) => ({ x: xForMonth(monthIndex), y: scaleY(value) }));
  const forecastPoints = cumulativeForecast
    .slice(0, monthsToInclude)
    .map((value, monthIndex) => ({ x: xForMonth(monthIndex), y: scaleY(value) }));
  const trendPoints = showTrend ? trendByMonth.map((value, monthIndex) => ({ x: xForMonth(monthIndex), y: scaleY(value) })) : [];

  const linePath = (points: { x: number; y: number }[]) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaUnderLine = (points: { x: number; y: number }[], baselineY: number) =>
    points.length > 0
      ? `M${points[0].x},${baselineY} ${points.map((p) => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${baselineY} Z`
      : '';

  const baseline = MARGIN.top + PLOT_H;
  const areaPath = areaUnderLine(bookedPoints, baseline);

  const targetY = scaleY(target);

  return (
    <div className={styles.root}>
      <div className={styles.titleRow}>
        <Text weight="semibold">Verrechenbare Tage</Text>
        <Text size={200} className={styles.targetHint}>
          Ziel {formatHoursDe(target)} Tage/Jahr
        </Text>
      </div>
      <div className={styles.svgWrap}>
        <svg className={styles.svg} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label="Verrechenbare Tage, kumuliert übers Jahr">
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

          <path d={areaPath} className={styles.area} />

          {showTrend && (
            <>
              <path d={linePath(trendPoints)} className={styles.trendLine} />
              <text x={VIEW_W - MARGIN.right} y={trendPoints[11].y - 4} textAnchor="end" className={styles.trendLabel}>
                Hochrechnung {formatHoursDe(trendByMonth[11])}
              </text>
            </>
          )}
          <path d={linePath(forecastPoints)} className={styles.forecastLine} />
          <path d={linePath(bookedPoints)} className={styles.bookedLine} />
          {bookedPoints.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r={4} className={styles.bookedMarker} />
          ))}

          <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={targetY} y2={targetY} className={styles.targetLine} />
          <text x={MARGIN.left + 4} y={targetY - 4} textAnchor="start" className={styles.targetLabel}>
            Ziel {formatHoursDe(target)}
          </text>

          {hovered !== null && (
            <line x1={xForMonth(hovered)} x2={xForMonth(hovered)} y1={MARGIN.top} y2={MARGIN.top + PLOT_H} className={styles.crosshair} />
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
            <text key={monthIndex} x={xForMonth(monthIndex)} y={VIEW_H - 6} textAnchor="middle" className={styles.axisLabel}>
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
            {showTrend && (
              <div className={styles.tooltipRow}>
                <Text size={200}>Hochrechnung</Text>
                <Text size={200}>{formatHoursDe(trendByMonth[hovered])} Tage</Text>
              </div>
            )}
            {hovered < monthsToInclude && (
              <div className={styles.tooltipRow}>
                <Text size={200}>Verbleibend bis Ziel</Text>
                <Text size={200}>
                  {target - cumulativeBooked[hovered] <= 0 ? 'Ziel erreicht' : `${formatHoursDe(target - cumulativeBooked[hovered])} Tage`}
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
