import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { PageLayout } from '../components/PageLayout';
import { KpiTile } from '../components/dashboard/KpiTile';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { ChargeabilityChart } from '../components/dashboard/ChargeabilityChart';
import { CompositionChart } from '../components/dashboard/CompositionChart';
import { LocationCompositionChart } from '../components/dashboard/LocationCompositionChart';
import { WorkLocationChart } from '../components/dashboard/WorkLocationChart';
import { BurnUpChart } from '../components/dashboard/BurnUpChart';
import { useProjects } from '../hooks/useProjects';
import { useDayAssignments } from '../hooks/useDayAssignments';
import { useResolvedYearSettings } from '../hooks/useYearSettings';
import { useManualBackup } from '../hooks/useManualBackup';
import type { Project } from '../types/project';
import { budgetByMonthForYear, isProjectRelevantForYear, projectForecastMonth } from '../types/project';
import type { DayAssignment } from '../types/dayAssignment';
import type { ChartLocation, WorkLocation } from '../types/workLocation';
import type { Bundesland } from '../types/bundesland';
import { homeofficeTarget, type YearSettings } from '../types/yearSettings';
import {
  bookedDaysForProjectMonth,
  buildHoursByLocation,
  buildMonthlyBookings,
  buildMonthlyLocations,
  buildProjectYearSummaries,
  chargeabilityPercent,
  chargeabilityPercentYear,
  locationPercent,
  locationPercentYear,
  type MonthlyBookings,
  type MonthlyLocations,
  type ProjectYearSummary,
} from '../utils/dashboardAggregation';
import { formatHoursDe } from '../utils/format';
import { MONTH_NAMES } from '../utils/calendarGrid';
import { DASHBOARD_CONTENT_WIDTH, KPI_TILE_WIDTH } from '../utils/chartScale';
import type { ThemeMode } from '../theme/useThemeMode';
import { dashboardPath, defaultMonthForYear, monthPath, projectsPath, settingsPath, yearPath } from '../utils/navigation';
import { saveLastView } from '../utils/lastView';

const useStyles = makeStyles({
  loading: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalXXXL,
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalXXXL,
    color: tokens.colorNeutralForeground3,
  },
  // The single shared horizontal scroll container for the whole dashboard body: charts and
  // tables below are fixed-width (see e.g. ChargeabilityChart.tsx), so if their combined width
  // exceeds the viewport, this scrolls as one unit instead of each card scrolling on its own.
  // Sized to exactly two chart cards wide (not 100% of the page) and centered as one block within
  // the wider page row - internally, its rows (KPI tiles, charts) stay left-aligned against each
  // other (see chartRow/kpiRow below), so only the block as a whole is centered, not each row.
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXL,
    width: `${DASHBOARD_CONTENT_WIDTH}px`,
    maxWidth: '100%',
    alignSelf: 'center',
    overflowX: 'auto',
  },
  // Tile width is computed (KPI_TILE_WIDTH) so exactly 6 tiles plus their gaps equal the width of
  // two chart cards side by side - see chartScale.ts.
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, ${KPI_TILE_WIDTH}px)`,
    gap: tokens.spacingHorizontalL,
    justifyContent: 'start',
  },
  // Plain (non-wrapping) flex row: each chart card keeps its own fixed width and never shrinks
  // (DashboardCard sets flexShrink:0), so this row overflows `.content` rather than compressing
  // the charts - `.content`'s overflowX:auto is what actually shows the scrollbar, not this row.
  // Left-aligned (not centered) so a trailing lone chart hugs the left edge like everything else.
  chartRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: tokens.spacingHorizontalXL,
    alignItems: 'flex-start',
  },
  // Subtile Trennlinie über die gesamte Breite, oberhalb jeder Abschnittsüberschrift - grenzt die
  // Abschnitte (Projekte/Kontingent-Verlauf/Chargeability/Arbeitsorte) klarer voneinander ab.
  sectionHeading: {
    paddingTop: tokens.spacingVerticalL,
    borderTopWidth: tokens.strokeWidthThin,
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
  },
});

interface DashboardPageProps {
  isDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
}

interface DashboardData {
  projects: Project[];
  assignments: DayAssignment[];
  bookings: MonthlyBookings;
  summaries: ProjectYearSummary[];
  locations: MonthlyLocations;
  hoursByLocation: Record<ChartLocation, number[]>;
}

function useDashboardData(
  projects: Project[] | null,
  assignments: DayAssignment[] | null,
  year: number,
  bundesland: Bundesland,
): DashboardData | null {
  return useMemo(() => {
    if (!projects || !assignments) return null;
    const bookings = buildMonthlyBookings(assignments, projects, year, bundesland);
    const summaries = buildProjectYearSummaries(projects, bookings, year);
    const locations = buildMonthlyLocations(assignments, year, bundesland);
    const hoursByLocation = buildHoursByLocation(assignments, year);
    return { projects, assignments, bookings, summaries, locations, hoursByLocation };
  }, [projects, assignments, year, bundesland]);
}

export function DashboardPage({ isDark, onSetThemeMode }: DashboardPageProps) {
  const { year: yearParam } = useParams();
  const navigate = useNavigate();
  const year = Number(yearParam) || new Date().getFullYear();
  const styles = useStyles();

  const { projects } = useProjects();
  const { assignments } = useDayAssignments();
  const resolvedSettings = useResolvedYearSettings(year);
  const bundesland = resolvedSettings?.settings.bundesland ?? 'HB';
  const data = useDashboardData(projects, assignments, year, bundesland);
  const onManualBackup = useManualBackup();

  useEffect(() => {
    saveLastView(dashboardPath(year));
  }, [year]);

  return (
    <PageLayout
      view="dashboard"
      label={String(year)}
      year={year}
      onPrev={() => navigate(dashboardPath(year - 1))}
      onNext={() => navigate(dashboardPath(year + 1))}
      onSwitchToProjects={() => navigate(projectsPath(year))}
      onSwitchToYear={() => navigate(yearPath(year))}
      onSwitchToMonth={() => navigate(monthPath(year, defaultMonthForYear(year)))}
      onSwitchToDashboard={() => navigate(dashboardPath(year))}
      isDark={isDark}
      onSetThemeMode={onSetThemeMode}
      onOpenSettings={() => navigate(settingsPath())}
      onManualBackup={onManualBackup}
    >
      {(data === null || resolvedSettings === null) && (
        <div className={styles.loading}>
          <Spinner label="Dashboard wird geladen…" />
        </div>
      )}

      {data !== null && data.projects.length === 0 && (
        <div className={styles.emptyState}>
          <Text>Noch keine Projekte angelegt.</Text>
        </div>
      )}

      {data !== null && resolvedSettings !== null && data.projects.length > 0 && (
        <DashboardContent year={year} data={data} settings={resolvedSettings.settings} />
      )}
    </PageLayout>
  );
}

interface DashboardContentProps {
  year: number;
  data: DashboardData;
  settings: YearSettings;
}

/** Splits a list into chunks of at most 2, so callers can render "max 2 nebeneinander" rows. */
function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

function DashboardContent({ year, data, settings }: DashboardContentProps) {
  const styles = useStyles();
  const { bookings, summaries, locations, hoursByLocation } = data;
  const target = settings.targetChargeability;
  const targetKunde = settings.targetKunde;
  const targetBuero = settings.targetBuero;
  const targetHomeoffice = homeofficeTarget(targetKunde, targetBuero);
  const locationTargets = { kunde: targetKunde, buero: targetBuero, homeoffice: targetHomeoffice };

  // For the current year, cap year-average calculations at the current month so future,
  // still-empty months don't drag the average down toward 0. Past years use the full 12.
  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  const monthsToInclude = isCurrentYear ? now.getMonth() + 1 : 12;
  const yearAverageSuffix = isCurrentYear ? ` (bis ${MONTH_NAMES[monthsToInclude - 1]})` : ' (Jahr)';

  // For the current year, only plot the line up to the current month - null breaks the line in
  // ChargeabilityChart/WorkLocationChart rather than implying "0%" for months that haven't
  // happened yet. The axis itself still always spans Jan-Dec.
  const chargeabilitySeries = useMemo<(number | null)[]>(
    () => Array.from({ length: 12 }, (_, m) => (m < monthsToInclude ? chargeabilityPercent(bookings, m) : null)),
    [bookings, monthsToInclude],
  );

  const locationSeries = useMemo(
    () => ({
      kunde: Array.from({ length: 12 }, (_, m) => (m < monthsToInclude ? locationPercent(locations, 'kunde', m) : null)),
      buero: Array.from({ length: 12 }, (_, m) => (m < monthsToInclude ? locationPercent(locations, 'buero', m) : null)),
      homeoffice: Array.from({ length: 12 }, (_, m) => (m < monthsToInclude ? locationPercent(locations, 'homeoffice', m) : null)),
    }),
    [locations, monthsToInclude],
  );

  const bookedTotal = summaries.reduce((sum, s) => sum + s.bookedDays, 0);
  const forecastTotal = summaries.reduce((sum, s) => sum + s.forecastDays, 0);
  const chargeabilityYear = chargeabilityPercentYear(bookings, monthsToInclude);
  // Dashboard project tiles/burn charts only list projects without a fixed Kontingent, or ones
  // whose Kontingent period actually overlaps the selected year - an old contract from a past
  // year shouldn't clutter the current year's view. Real booking totals above are unaffected.
  const visibleSummaries = summaries.filter((s) => isProjectRelevantForYear(s.project, year));
  const contingentSummaries = visibleSummaries.filter((s) => s.project.hasContingent && s.budgetDays > 0);

  const locationTiles: { key: WorkLocation; label: string; target: number }[] = [
    { key: 'kunde', label: `Ø Kunde${yearAverageSuffix}`, target: targetKunde },
    { key: 'buero', label: `Ø Büro${yearAverageSuffix}`, target: targetBuero },
    { key: 'homeoffice', label: `Ø Home Office${yearAverageSuffix}`, target: targetHomeoffice },
  ];

  return (
    <div className={styles.content}>
      <div className={styles.kpiRow}>
        <KpiTile
          label="Gebuchte Tage (Jahr)"
          value={formatHoursDe(bookedTotal)}
          deltaText={`${bookedTotal - forecastTotal >= 0 ? '+' : ''}${formatHoursDe(bookedTotal - forecastTotal)} ggü. Forecast`}
        />
        <KpiTile
          label={`Ø Chargeability${yearAverageSuffix}`}
          value={chargeabilityYear === null ? '–' : `${chargeabilityYear.toFixed(1)}%`}
          deltaText={chargeabilityYear === null ? undefined : `${chargeabilityYear - target >= 0 ? '+' : ''}${(chargeabilityYear - target).toFixed(1)} Pkt. ggü. Ziel`}
          deltaTone={chargeabilityYear === null ? 'neutral' : chargeabilityYear >= target ? 'positive' : 'negative'}
        />
        {locationTiles.map((tile) => {
          const value = locationPercentYear(locations, tile.key, monthsToInclude);
          return (
            <KpiTile
              key={tile.key}
              label={tile.label}
              value={value === null ? '–' : `${value.toFixed(1)}%`}
              deltaText={value === null ? undefined : `Ziel ${tile.target}%`}
            />
          );
        })}
      </div>

      <Text size={400} weight="semibold" className={styles.sectionHeading}>
        Projekte
      </Text>
      <div className={styles.kpiRow}>
        {visibleSummaries.map((s) => {
          const avatar = (
            <Avatar
              image={s.project.image ? { src: s.project.image } : undefined}
              name={s.project.name || undefined}
              size={20}
            />
          );
          const hasContingent = s.project.hasContingent && s.budgetDays > 0;
          const remaining = s.budgetDays - s.bookedDays;
          const remainingRatio = hasContingent ? remaining / s.budgetDays : 0;
          return (
            <KpiTile
              key={s.project.id}
              label={s.project.name}
              emphasizeLabel
              avatar={avatar}
              hint={s.project.name}
              value={`${formatHoursDe(s.bookedDays)} Tage`}
              deltaText={hasContingent ? `Restkontingent: ${remaining >= 0 ? '' : '−'}${formatHoursDe(Math.abs(remaining))} Tage` : undefined}
              deltaTone={!hasContingent ? 'neutral' : remainingRatio < 0.1 ? 'negative' : remainingRatio < 0.25 ? 'warning' : 'positive'}
            />
          );
        })}
      </div>

      {contingentSummaries.length > 0 && (
        <>
          <Text size={400} weight="semibold" className={styles.sectionHeading}>
            Kontingent-Verlauf
          </Text>
          {chunkPairs(contingentSummaries).map((pair) => (
            <div key={pair[0].project.id} className={styles.chartRow}>
              {pair.map((s) => (
                <DashboardCard key={s.project.id}>
                  <BurnUpChart
                    project={s.project}
                    budgetDays={s.budgetDays}
                    budgetByMonth={budgetByMonthForYear(s.project, year)}
                    bookedByMonth={Array.from({ length: 12 }, (_, m) => bookedDaysForProjectMonth(bookings, s.project.id, m))}
                    forecastByMonth={Array.from({ length: 12 }, (_, m) => projectForecastMonth(s.project, year, m))}
                    monthsToInclude={monthsToInclude}
                  />
                </DashboardCard>
              ))}
            </div>
          ))}
        </>
      )}

      <Text size={400} weight="semibold" className={styles.sectionHeading}>
        Chargeability
      </Text>
      <div className={styles.chartRow}>
        <DashboardCard>
          <ChargeabilityChart values={chargeabilitySeries} target={target} />
        </DashboardCard>
        <DashboardCard>
          <CompositionChart hoursByChargeable={bookings.hoursByChargeable} />
        </DashboardCard>
      </div>

      <Text size={400} weight="semibold" className={styles.sectionHeading}>
        Arbeitsorte
      </Text>
      <div className={styles.chartRow}>
        <DashboardCard>
          <WorkLocationChart valuesByLocation={locationSeries} targetsByLocation={locationTargets} />
        </DashboardCard>
        <DashboardCard>
          <LocationCompositionChart hoursByLocation={hoursByLocation} />
        </DashboardCard>
      </div>
    </div>
  );
}
