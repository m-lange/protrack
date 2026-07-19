import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Textarea,
  ToggleButton,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { DayOfWeek, type CalendarStrings } from '@fluentui/react-calendar-compat';
import { Delete24Regular } from '@fluentui/react-icons';
import { createEmptyContingentEntry, type ContingentEntry } from '../types/project';
import { WORK_LOCATIONS, WORK_LOCATION_LABELS } from '../types/workLocation';
import { WorkLocationIcon } from './WorkLocationIcon';

const GERMAN_CALENDAR_STRINGS: CalendarStrings = {
  months: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  shortMonths: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  shortDays: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  goToToday: 'Heute',
  prevMonthAriaLabel: 'Vorheriger Monat',
  nextMonthAriaLabel: 'Nächster Monat',
  prevYearAriaLabel: 'Vorheriges Jahr',
  nextYearAriaLabel: 'Nächstes Jahr',
  closeButtonAriaLabel: 'Schließen',
};

/** Parses a `YYYY-MM-DD` string as a local date; empty string becomes `null`. */
function isoToDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date | null | undefined): string {
  if (!date) return '';
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatGermanDate(date?: Date): string {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

function parseGermanDate(text: string): Date | null {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

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
    gap: tokens.spacingVerticalL,
    marginTop: tokens.spacingVerticalL,
  },
  spacedField: {
    columnGap: tokens.spacingHorizontalXXXL,
  },
  notesField: {
    marginTop: tokens.spacingVerticalXL,
  },
  locationToggleGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  actions: {
    marginTop: tokens.spacingVerticalXXL,
    justifyContent: 'flex-end',
  },
  deleteButton: {
    marginRight: 'auto',
    color: tokens.colorPaletteRedForeground1,
    ':hover': {
      color: tokens.colorPaletteRedForeground2,
    },
    ':hover:active': {
      color: tokens.colorPaletteRedForeground3,
    },
  },
});

interface ContingentDialogProps {
  open: boolean;
  entry: ContingentEntry | null;
  onSave: (entry: ContingentEntry) => void;
  onDelete: (entry: ContingentEntry) => void;
  onClose: () => void;
}

export function ContingentDialog({ open, entry, onSave, onDelete, onClose }: ContingentDialogProps) {
  const styles = useStyles();
  const [draft, setDraft] = useState<ContingentEntry>(() => entry ?? createEmptyContingentEntry());
  const [surfaceNode, setSurfaceNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(entry ?? createEmptyContingentEntry());
    }
  }, [open, entry]);

  const handleSave = () => {
    onSave({ ...draft, label: draft.label.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(_event, data) => !data.open && onClose()}>
      <DialogSurface
        ref={setSurfaceNode}
        className={styles.surface}
        backdrop={{ className: styles.transparentBackdrop }}
      >
        <DialogBody>
          <DialogTitle>{entry ? 'Kontingent bearbeiten' : 'Kontingent hinzufügen'}</DialogTitle>
          <DialogContent className={styles.content}>
            <Field label="Bezeichnung" orientation="horizontal" className={styles.spacedField}>
              <Input
                value={draft.label}
                placeholder="Bezeichnung"
                onChange={(_event, data) => setDraft((prev) => ({ ...prev, label: data.value }))}
              />
            </Field>
            <Field label="Kontingent" orientation="horizontal" className={styles.spacedField}>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                value={String(draft.days)}
                onChange={(_event, data) => setDraft((prev) => ({ ...prev, days: Number(data.value) || 0 }))}
              />
            </Field>
            <Field label="Von" orientation="horizontal" className={styles.spacedField}>
              <DatePicker
                value={isoToDate(draft.periodStart)}
                onSelectDate={(date) => setDraft((prev) => ({ ...prev, periodStart: dateToIso(date) }))}
                formatDate={formatGermanDate}
                parseDateFromString={parseGermanDate}
                allowTextInput
                firstDayOfWeek={DayOfWeek.Monday}
                strings={GERMAN_CALENDAR_STRINGS}
                placeholder="tt.mm.jjjj"
                mountNode={surfaceNode}
              />
            </Field>
            <Field label="Bis" orientation="horizontal" className={styles.spacedField}>
              <DatePicker
                value={isoToDate(draft.periodEnd)}
                onSelectDate={(date) => setDraft((prev) => ({ ...prev, periodEnd: dateToIso(date) }))}
                formatDate={formatGermanDate}
                parseDateFromString={parseGermanDate}
                allowTextInput
                firstDayOfWeek={DayOfWeek.Monday}
                strings={GERMAN_CALENDAR_STRINGS}
                placeholder="tt.mm.jjjj"
                mountNode={surfaceNode}
              />
            </Field>
            <Field label="Arbeitsorte" orientation="horizontal" className={styles.spacedField}>
              <div className={styles.locationToggleGroup}>
                {WORK_LOCATIONS.map((loc) => {
                  const checked = draft.workLocations.includes(loc);
                  return (
                    <ToggleButton
                      key={loc}
                      icon={<WorkLocationIcon value={loc} />}
                      checked={checked}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          workLocations: checked
                            ? prev.workLocations.filter((value) => value !== loc)
                            : [...prev.workLocations, loc],
                        }))
                      }
                      aria-label={WORK_LOCATION_LABELS[loc]}
                      title={WORK_LOCATION_LABELS[loc]}
                    />
                  );
                })}
              </div>
            </Field>
            <Field label="Notizen" className={styles.notesField}>
              <Textarea
                value={draft.notes}
                onChange={(_event, data) => setDraft((prev) => ({ ...prev, notes: data.value }))}
                resize="vertical"
                rows={4}
              />
            </Field>
          </DialogContent>
          {/* Fluent's DialogActions shrink-wraps by default; force full width so deleteButton's marginRight:auto has room to push right side out. */}
          <DialogActions fluid className={styles.actions} style={{ width: '100%', justifySelf: 'stretch' }}>
            {entry && (
              <Button
                appearance="subtle"
                icon={<Delete24Regular />}
                onClick={() => onDelete(entry)}
                className={styles.deleteButton}
              >
                Löschen
              </Button>
            )}
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
