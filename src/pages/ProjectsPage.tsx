import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Spinner,
  Text,
  Toast,
  ToastTitle,
  makeStyles,
  mergeClasses,
  tokens,
  useToastController,
} from '@fluentui/react-components';
import {
  Add24Regular,
  ChevronDown16Regular,
  ChevronDown24Regular,
  ChevronRight16Regular,
  ChevronUp24Regular,
} from '@fluentui/react-icons';
import { PageLayout } from '../components/PageLayout';
import { ProjectDialog } from '../components/ProjectDialog';
import { ContingentDialog } from '../components/ContingentDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InlineNumberInput } from '../components/InlineNumberInput';
import { ProjectNameCluster } from '../components/ProjectNameCluster';
import { WorkLocationIcon } from '../components/WorkLocationIcon';
import { useDayAssignments } from '../hooks/useDayAssignments';
import { useProjects } from '../hooks/useProjects';
import {
  emptyForecastMonths,
  isContingentOverBudget,
  isMonthInPeriod,
  projectForecastMonth,
  totalDays,
  type ContingentEntry,
  type Project,
} from '../types/project';
import { WORK_LOCATIONS, WORK_LOCATION_LABELS } from '../types/workLocation';
import { useManualBackup } from '../hooks/useManualBackup';
import type { ThemeMode } from '../theme/useThemeMode';
import { dashboardPath, defaultMonthForYear, monthPath, projectsPath, settingsPath, yearPath } from '../utils/navigation';
import { saveLastView } from '../utils/lastView';
import { hoursToDays } from '../utils/dashboardAggregation';
import { formatHoursDe } from '../utils/format';
import { MONTH_NAMES } from '../utils/calendarGrid';
import { APP_TOASTER_ID } from '../utils/toaster';

/** Entries without a period sort first; otherwise ascending by start date (then end date). */
function sortContingentsByPeriod(contingents: ContingentEntry[]): ContingentEntry[] {
  return [...contingents].sort((a, b) => {
    const start = a.periodStart.localeCompare(b.periodStart);
    return start !== 0 ? start : a.periodEnd.localeCompare(b.periodEnd);
  });
}

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: tokens.spacingVerticalXL,
  },
  gridScroll: {
    flex: 1,
    minHeight: 0,
    overflowX: 'auto',
  },
  // A single CSS Grid spanning the whole list: every cell (header or body, whichever
  // row it belongs to) is a direct sibling here and shares these exact column tracks,
  // so no per-row layout algorithm can ever drift two rows' columns out of alignment.
  grid: {
    display: 'grid',
    gridTemplateColumns: '32px 40px 44px minmax(260px, 1fr) 90px repeat(12, 76px) 84px',
    width: '100%',
    minWidth: '1462px',
  },
  headerCell: {
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerSpacerRow: {
    height: tokens.spacingVerticalL,
    paddingBlock: 0,
  },
  headerCellCenter: {
    textAlign: 'center',
  },
  cell: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    boxSizing: 'border-box',
  },
  // Applied explicitly wherever a row divider is wanted - never a default on `.cell`, so a row's
  // border never has to be turned off again for a case that shouldn't have one.
  rowDivider: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  numberCell: {
    paddingInline: tokens.spacingHorizontalXS,
    justifyContent: 'center',
  },
  numberCellStack: {
    flexDirection: 'column',
    gap: 0,
  },
  bookedDays: {
    color: `color-mix(in srgb, ${tokens.colorBrandForeground1} 70%, ${tokens.colorNeutralBackground1})`,
    fontSize: tokens.fontSizeBase200,
    marginTop: `calc(-1 * ${tokens.spacingVerticalXS})`,
  },
  colorDot: {
    width: '14px',
    height: '14px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
  },
  projectRow: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  contingentRow: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  nameButton: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    font: 'inherit',
    color: tokens.colorNeutralForeground1,
    minWidth: 0,
    ':hover': {
      textDecorationLine: 'underline',
    },
  },
  contingentNameButton: {
    paddingLeft: tokens.spacingHorizontalXXL,
  },
  contingentNamePlaceholder: {
    color: tokens.colorNeutralForeground4,
  },
  contingentNameOverBudget: {
    color: tokens.colorPaletteRedForeground2,
    fontWeight: tokens.fontWeightBold,
  },
  contingentLocationIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginLeft: tokens.spacingHorizontalS,
  },
  collapseButton: {
    flexShrink: 0,
    minWidth: 'unset',
  },
  collapseButtonHidden: {
    visibility: 'hidden',
  },
  spanAllColumns: {
    gridColumn: '1 / -1',
  },
  addContingentButton: {
    marginLeft: 'auto',
  },
  // Split in half so the divider between two projects (added to the bottom half below) sits
  // exactly halfway through the gap - equidistant from the avatar above and the one below,
  // instead of hugging whichever row happens to carry the border.
  spacerRowTop: {
    height: `calc(${tokens.spacingVerticalL} / 2)`,
    paddingBlock: 0,
  },
  spacerRowBottom: {
    height: `calc(${tokens.spacingVerticalL} / 2)`,
    paddingBlock: 0,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalXXXL,
    color: tokens.colorNeutralForeground3,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: tokens.spacingVerticalXXXL,
  },
});

interface ProjectsPageProps {
  isDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
}

interface EditingContingent {
  project: Project;
  /** `null` while creating a brand-new entry that hasn't been saved yet. */
  entry: ContingentEntry | null;
}

export function ProjectsPage({ isDark, onSetThemeMode }: ProjectsPageProps) {
  const { year: yearParam } = useParams();
  const navigate = useNavigate();
  const year = Number(yearParam) || new Date().getFullYear();
  const { projects, upsertProject, removeProject, moveProject, nextOrder } = useProjects();
  const { assignments } = useDayAssignments();
  const styles = useStyles();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContingent, setEditingContingent] = useState<EditingContingent | null>(null);
  const [contingentDialogOpen, setContingentDialogOpen] = useState(false);
  const [collapsedProjectIds, setCollapsedProjectIds] = useState<Set<string>>(new Set());
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const onManualBackup = useManualBackup();
  const { dispatchToast } = useToastController(APP_TOASTER_ID);

  /** Gebuchte Stunden pro Projekt und Monat in `year`, 12 Einträge je Projekt (Index 0 = Januar). */
  const bookedHoursByProjectMonth = useMemo(() => {
    const map = new Map<string, number[]>();
    const yearPrefix = String(year);
    for (const assignment of assignments ?? []) {
      if (assignment.date.slice(0, 4) !== yearPrefix) continue;
      const monthIndex = Number(assignment.date.slice(5, 7)) - 1;
      if (monthIndex < 0 || monthIndex > 11) continue;
      const months = map.get(assignment.projectId) ?? emptyForecastMonths();
      months[monthIndex] += assignment.hours;
      map.set(assignment.projectId, months);
    }
    return map;
  }, [assignments, year]);

  const bookedDaysForMonth = (projectId: string, monthIndex: number): number =>
    hoursToDays(bookedHoursByProjectMonth.get(projectId)?.[monthIndex] ?? 0);

  const bookedDaysForYear = (projectId: string): number =>
    hoursToDays((bookedHoursByProjectMonth.get(projectId) ?? []).reduce((sum, hours) => sum + hours, 0));

  useEffect(() => {
    saveLastView(projectsPath(year));
  }, [year]);

  const handleMove = (id: string, direction: 'up' | 'down') => {
    moveProject(id, direction).catch(() => {
      dispatchToast(
        <Toast>
          <ToastTitle>Reihenfolge konnte nicht gespeichert werden</ToastTitle>
        </Toast>,
        { intent: 'error' },
      );
    });
  };

  const openNewProjectDialog = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  const handleDelete = (project: Project) => {
    setPendingConfirm({
      message: `"${project.name}" wirklich löschen?`,
      onConfirm: () => {
        void removeProject(project.id);
        setDialogOpen(false);
        setPendingConfirm(null);
      },
    });
  };

  const updateContingent = (project: Project, contingentId: string, patch: Partial<ContingentEntry>) => {
    const contingents = project.contingents.map((entry) =>
      entry.id === contingentId ? { ...entry, ...patch } : entry,
    );
    void upsertProject({ ...project, contingents });
  };

  const commitContingentForecastMonth = (
    project: Project,
    contingentId: string,
    monthIndex: number,
    value: number,
  ) => {
    const entry = project.contingents.find((c) => c.id === contingentId);
    if (!entry) return;
    const months = [...(entry.forecastByYear[year] ?? emptyForecastMonths())];
    months[monthIndex] = value;
    updateContingent(project, contingentId, { forecastByYear: { ...entry.forecastByYear, [year]: months } });
  };

  const openContingentDialog = (project: Project, entry: ContingentEntry | null) => {
    setEditingContingent({ project, entry });
    setContingentDialogOpen(true);
  };

  const addContingent = (project: Project) => {
    openContingentDialog(project, null);
  };

  const removeContingent = (project: Project, contingentId: string) => {
    void upsertProject({ ...project, contingents: project.contingents.filter((c) => c.id !== contingentId) });
  };

  const toggleContingentsCollapsed = (projectId: string) => {
    setCollapsedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  return (
    <PageLayout
      view="projects"
      label={String(year)}
      year={year}
      onPrev={() => navigate(projectsPath(year - 1))}
      onNext={() => navigate(projectsPath(year + 1))}
      onSwitchToProjects={() => navigate(projectsPath(year))}
      onSwitchToYear={() => navigate(yearPath(year))}
      onSwitchToMonth={() => navigate(monthPath(year, defaultMonthForYear(year)))}
      onSwitchToDashboard={() => navigate(dashboardPath(year))}
      isDark={isDark}
      onSetThemeMode={onSetThemeMode}
      onOpenSettings={() => navigate(settingsPath())}
      onManualBackup={onManualBackup}
    >
      <div className={styles.toolbar}>
        <Button appearance="primary" icon={<Add24Regular />} onClick={openNewProjectDialog}>
          Neues Projekt
        </Button>
      </div>

      {projects === null && (
        <div className={styles.loading}>
          <Spinner label="Projekte werden geladen…" />
        </div>
      )}

      {projects !== null && projects.length === 0 && (
        <div className={styles.emptyState}>
          <Text>Noch keine Projekte angelegt.</Text>
        </div>
      )}

      {projects !== null && projects.length > 0 && (
        <div className={styles.gridScroll}>
          <div className={styles.grid} role="table" aria-label="Projekte">
            <div className={styles.headerCell} role="columnheader" />
            <div className={styles.headerCell} role="columnheader" />
            <div className={styles.headerCell} role="columnheader" />
            <div className={styles.headerCell} role="columnheader" />
            <div className={mergeClasses(styles.headerCell, styles.headerCellCenter)} role="columnheader">
              Kontingent
            </div>
            {MONTH_NAMES.map((name) => (
              <div key={name} className={mergeClasses(styles.headerCell, styles.headerCellCenter)} role="columnheader">
                {name.slice(0, 3)}
              </div>
            ))}
            <div className={styles.headerCell} role="columnheader" />
            <div className={mergeClasses(styles.cell, styles.spanAllColumns, styles.headerSpacerRow)} role="cell" />

            {projects.map((project, index) => {
              const canCollapseContingents = project.hasContingent && project.contingents.length > 0;
              const contingentsCollapsed = canCollapseContingents && collapsedProjectIds.has(project.id);
              return (
                <Fragment key={project.id}>
                  <div
                    className={mergeClasses(styles.cell, styles.projectRow)}
                    role="cell"
                  >
                    <Button
                      appearance="transparent"
                      className={mergeClasses(
                        styles.collapseButton,
                        !canCollapseContingents && styles.collapseButtonHidden,
                      )}
                      icon={contingentsCollapsed ? <ChevronRight16Regular /> : <ChevronDown16Regular />}
                      onClick={() => toggleContingentsCollapsed(project.id)}
                      disabled={!canCollapseContingents}
                      aria-hidden={!canCollapseContingents}
                      aria-label={contingentsCollapsed ? 'Kontingente anzeigen' : 'Kontingente ausblenden'}
                      title={contingentsCollapsed ? 'Kontingente anzeigen' : 'Kontingente ausblenden'}
                    />
                  </div>
                  <div
                    className={mergeClasses(styles.cell, styles.projectRow)}
                    role="cell"
                  >
                    <div className={styles.colorDot} style={{ backgroundColor: project.color }} title={project.color} />
                  </div>
                  <div
                    className={mergeClasses(styles.cell, styles.projectRow)}
                    role="cell"
                  >
                    <Avatar image={project.image ? { src: project.image } : undefined} name={project.name || undefined} size={28} />
                  </div>
                  <div
                    className={mergeClasses(styles.cell, styles.projectRow)}
                    role="cell"
                  >
                    <button type="button" className={styles.nameButton} onClick={() => openEditProjectDialog(project)}>
                      <ProjectNameCluster project={project} />
                    </button>
                    {project.hasContingent && (
                      <Button
                        className={styles.addContingentButton}
                        appearance="secondary"
                        icon={<Add24Regular />}
                        onClick={() => addContingent(project)}
                        aria-label="Kontingent hinzufügen"
                        title="Kontingent hinzufügen"
                      />
                    )}
                  </div>
                  <div
                    className={mergeClasses(
                      styles.cell,
                      styles.numberCell,
                      styles.numberCellStack,
                      styles.projectRow,
                    )}
                    role="cell"
                  >
                    <InlineNumberInput value={totalDays(project)} readOnly unavailable={!project.hasContingent} />
                    <Text className={styles.bookedDays}>{formatHoursDe(bookedDaysForYear(project.id))}</Text>
                  </div>
                  {Array.from({ length: 12 }, (_, monthIndex) => (
                    <div
                      key={monthIndex}
                      className={mergeClasses(
                        styles.cell,
                        styles.numberCell,
                        styles.numberCellStack,
                        styles.projectRow,
                      )}
                      role="cell"
                    >
                      <InlineNumberInput
                        value={projectForecastMonth(project, year, monthIndex)}
                        readOnly
                        unavailable={!project.hasContingent}
                      />
                      <Text className={styles.bookedDays}>{formatHoursDe(bookedDaysForMonth(project.id, monthIndex))}</Text>
                    </div>
                  ))}
                  <div
                    className={mergeClasses(styles.cell, styles.projectRow)}
                    role="cell"
                  >
                    <Button
                      appearance="subtle"
                      icon={<ChevronUp24Regular />}
                      onClick={() => handleMove(project.id, 'up')}
                      disabled={index === 0}
                      aria-label="Nach oben"
                      title="Nach oben"
                    />
                    <Button
                      appearance="subtle"
                      icon={<ChevronDown24Regular />}
                      onClick={() => handleMove(project.id, 'down')}
                      disabled={index === projects.length - 1}
                      aria-label="Nach unten"
                      title="Nach unten"
                    />
                  </div>

                  {project.hasContingent &&
                    !contingentsCollapsed &&
                    (() => {
                      const sortedEntries = sortContingentsByPeriod(project.contingents);
                      return sortedEntries.map((entry) => {
                        const overBudget = isContingentOverBudget(entry);
                        return (
                          <Fragment key={entry.id}>
                            {/* Leading chevron/color/avatar spacer columns never carry the row divider -
                                it should start together with the Kontingent name, not at the table's left edge. */}
                            <div className={mergeClasses(styles.cell, styles.contingentRow)} role="cell" />
                            <div className={mergeClasses(styles.cell, styles.contingentRow)} role="cell" />
                            <div className={mergeClasses(styles.cell, styles.contingentRow)} role="cell" />
                            <div className={mergeClasses(styles.cell, styles.contingentRow, styles.rowDivider)} role="cell">
                              <button
                                type="button"
                                className={mergeClasses(styles.nameButton, styles.contingentNameButton)}
                                onClick={() => openContingentDialog(project, entry)}
                              >
                                <Text
                                  className={mergeClasses(
                                    !entry.label && styles.contingentNamePlaceholder,
                                    overBudget && styles.contingentNameOverBudget,
                                  )}
                                >
                                  {entry.label || 'Bezeichnung'}
                                </Text>
                                {entry.workLocations.length > 0 && (
                                  <span className={styles.contingentLocationIcons}>
                                    {WORK_LOCATIONS.filter((loc) => entry.workLocations.includes(loc)).map((loc) => (
                                      <span key={loc} title={WORK_LOCATION_LABELS[loc]}>
                                        <WorkLocationIcon value={loc} />
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </button>
                            </div>
                            <div
                              className={mergeClasses(styles.cell, styles.numberCell, styles.contingentRow, styles.rowDivider)}
                              role="cell"
                            >
                              <InlineNumberInput value={entry.days} readOnly highlight={overBudget} />
                            </div>
                            {Array.from({ length: 12 }, (_, monthIndex) => (
                              <div
                                key={monthIndex}
                                className={mergeClasses(styles.cell, styles.numberCell, styles.contingentRow, styles.rowDivider)}
                                role="cell"
                              >
                                <InlineNumberInput
                                  value={entry.forecastByYear[year]?.[monthIndex] ?? 0}
                                  highlight={overBudget}
                                  disabled={!isMonthInPeriod(entry, year, monthIndex)}
                                  onCommit={(value) =>
                                    commitContingentForecastMonth(project, entry.id, monthIndex, value)
                                  }
                                />
                              </div>
                            ))}
                            <div className={mergeClasses(styles.cell, styles.contingentRow, styles.rowDivider)} role="cell" />
                          </Fragment>
                        );
                      });
                    })()}

                  {index < projects.length - 1 && (
                    <>
                      <div className={mergeClasses(styles.cell, styles.spanAllColumns, styles.spacerRowTop)} role="cell" />
                      <div className={mergeClasses(styles.cell, styles.spanAllColumns, styles.spacerRowBottom)} role="cell" />
                    </>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        project={editingProject}
        nextOrder={nextOrder()}
        onClose={() => setDialogOpen(false)}
        onSave={(project) => {
          void upsertProject(project);
          setDialogOpen(false);
        }}
        onDelete={handleDelete}
      />

      <ContingentDialog
        open={contingentDialogOpen}
        entry={editingContingent?.entry ?? null}
        onClose={() => setContingentDialogOpen(false)}
        onSave={(entry) => {
          if (!editingContingent) return;
          const exists = editingContingent.project.contingents.some((c) => c.id === entry.id);
          const contingents = exists
            ? editingContingent.project.contingents.map((c) => (c.id === entry.id ? entry : c))
            : [...editingContingent.project.contingents, entry];
          void upsertProject({ ...editingContingent.project, contingents });
          setContingentDialogOpen(false);
        }}
        onDelete={(entry) => {
          if (!editingContingent) return;
          const project = editingContingent.project;
          setPendingConfirm({
            message: `Kontingent "${entry.label || 'Bezeichnung'}" wirklich löschen?`,
            onConfirm: () => {
              removeContingent(project, entry.id);
              setContingentDialogOpen(false);
              setPendingConfirm(null);
            },
          });
        }}
      />

      <ConfirmDialog
        open={pendingConfirm !== null}
        title="Löschen bestätigen"
        message={pendingConfirm?.message ?? ''}
        onConfirm={() => pendingConfirm?.onConfirm()}
        onCancel={() => setPendingConfirm(null)}
      />
    </PageLayout>
  );
}
