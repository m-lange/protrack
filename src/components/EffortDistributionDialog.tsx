import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Location16Regular, QuestionCircle16Regular } from '@fluentui/react-icons';
import { allowedWorkLocationsForBooking, dominantLocationForDay, type DayAssignment } from '../types/dayAssignment';
import type { Project } from '../types/project';
import { WORK_LOCATION_LABELS, type WorkLocation } from '../types/workLocation';
import { formatHoursDe } from '../utils/format';
import { WorkLocationIcon } from './WorkLocationIcon';

const useStyles = makeStyles({
  surface: {
    width: '420px',
    maxWidth: '90vw',
  },
  transparentBackdrop: {
    backgroundColor: 'transparent',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalL,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  colorDot: {
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  locationButton: {
    flexShrink: 0,
    minWidth: 'unset',
  },
  input: {
    width: '80px',
    flexShrink: 0,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    marginTop: tokens.spacingVerticalXXL,
    justifyContent: 'flex-end',
  },
});

interface EffortDistributionDialogProps {
  open: boolean;
  date: string;
  assignments: DayAssignment[];
  projects: Project[];
  onSave: (assignments: DayAssignment[]) => void;
  onClose: () => void;
}

export function EffortDistributionDialog({
  open,
  date,
  assignments,
  projects,
  onSave,
  onClose,
}: EffortDistributionDialogProps) {
  const styles = useStyles();
  const [hours, setHours] = useState<Record<string, number>>({});
  const [locations, setLocations] = useState<Record<string, WorkLocation | null>>({});
  // Der von den (anderen) Buchungen dieses Tages etablierte Arbeitsort - die Grundlage für die
  // graue Default-Anzeige unten, solange ein Projekt keinen eigenen Arbeitsort hat.
  const dayLocation = dominantLocationForDay(assignments);

  useEffect(() => {
    if (open) {
      setHours(Object.fromEntries(assignments.map((a) => [a.id, a.hours])));
      setLocations(Object.fromEntries(assignments.map((a) => [a.id, a.location])));
    }
  }, [open, assignments]);

  const total = Object.values(hours).reduce((sum, value) => sum + value, 0);

  const handleSave = () => {
    onSave(
      assignments.map((a) => ({
        ...a,
        hours: hours[a.id] ?? 0,
        location: locations[a.id] ?? null,
      })),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(_event, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface} backdrop={{ className: styles.transparentBackdrop }}>
        <DialogBody>
          <DialogTitle>Aufwand verteilen</DialogTitle>
          <DialogContent className={styles.content}>
            {assignments.map((assignment) => {
              const project = projects.find((p) => p.id === assignment.projectId);
              const location = locations[assignment.id] ?? null;
              const allowedLocations = project ? allowedWorkLocationsForBooking(project, date) : [];
              // Kein eigener Arbeitsort gesetzt: standardmäßig folgt die Buchung dem von den
              // übrigen Buchungen etablierten Arbeitsort (grau dargestellt, da nicht explizit
              // gewählt) - passt der aber nicht zur Vorgabe dieses Projekts, ist er nicht wählbar
              // und wird stattdessen als "?" markiert (wie im Tag).
              const dayLocationAllowed = dayLocation !== null && allowedLocations.includes(dayLocation);
              const buttonIcon = location ? (
                <WorkLocationIcon value={location} />
              ) : dayLocationAllowed ? (
                <WorkLocationIcon value={dayLocation!} variant="outline" color={tokens.colorNeutralForeground3} />
              ) : dayLocation !== null ? (
                <QuestionCircle16Regular style={{ color: tokens.colorNeutralForeground3 }} />
              ) : (
                <Location16Regular style={{ color: tokens.colorNeutralForeground3 }} />
              );
              return (
                <div key={assignment.id} className={styles.row}>
                  <span className={styles.colorDot} style={{ backgroundColor: project?.color }} />
                  <Text className={styles.name}>{project?.name ?? 'Unbekanntes Projekt'}</Text>
                  <Menu>
                    <MenuTrigger disableButtonEnhancement>
                      <Button
                        appearance="secondary"
                        className={styles.locationButton}
                        icon={buttonIcon}
                        aria-label="Arbeitsort wählen"
                        title="Arbeitsort wählen"
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        {allowedLocations.map((value) => (
                          <MenuItem
                            key={value}
                            icon={<WorkLocationIcon value={value} />}
                            onClick={() => setLocations((prev) => ({ ...prev, [assignment.id]: value }))}
                          >
                            {WORK_LOCATION_LABELS[value]}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                  <Input
                    className={styles.input}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    contentAfter="h"
                    value={String(hours[assignment.id] ?? 0)}
                    onChange={(_event, data) =>
                      setHours((prev) => ({ ...prev, [assignment.id]: Number(data.value) || 0 }))
                    }
                  />
                </div>
              );
            })}
            <Text size={200} className={styles.hint}>
              Summe: {formatHoursDe(total)} Stunden
            </Text>
          </DialogContent>
          <DialogActions className={styles.actions}>
            <Button appearance="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button appearance="primary" onClick={handleSave}>
              Speichern
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
