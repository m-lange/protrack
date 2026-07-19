import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Avatar,
  Button,
  ColorSwatch,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  SwatchPicker,
  Textarea,
  ToggleButton,
  makeStyles,
  tokens,
  type SwatchPickerOnSelectEventHandler,
} from '@fluentui/react-components';
import {
  Camera24Regular,
  CircleLine24Regular,
  Checkmark24Regular,
  ChevronDown20Regular,
  Delete24Regular,
  Organization24Regular,
  Premium24Regular,
} from '@fluentui/react-icons';
import { suggestedProjectColors } from '../theme/palette';
import { createEmptyProject, type Chargeable, type Project } from '../types/project';

const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/svg+xml';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const useStyles = makeStyles({
  surface: {
    width: '520px',
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
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalS,
  },
  avatarWrapper: {
    position: 'relative',
    width: 'fit-content',
  },
  avatarButton: {
    position: 'relative',
    display: 'block',
    border: 'none',
    padding: 0,
    background: 'none',
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusCircular,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    color: '#fff',
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationFast,
    ':hover': {
      opacity: 1,
    },
  },
  avatarRemoveButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    minWidth: 'unset',
    width: '24px',
    height: '24px',
    padding: 0,
    borderRadius: tokens.borderRadiusCircular,
  },
  chargeableGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  colorTrigger: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    width: '160px',
    height: '32px',
    boxSizing: 'border-box',
    paddingInline: tokens.spacingHorizontalSNudge,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    font: 'inherit',
    color: tokens.colorNeutralForeground1,
  },
  colorTriggerSwatch: {
    width: '18px',
    height: '18px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
  },
  colorTriggerHex: {
    flex: 1,
    textAlign: 'left',
  },
  colorPopoverContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  notesField: {
    marginTop: tokens.spacingVerticalXL,
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
  actions: {
    marginTop: tokens.spacingVerticalXXL,
    justifyContent: 'flex-end',
  },
});

const CHARGEABLE_OPTIONS: { value: Chargeable; label: string; icon: ReactElement }[] = [
  { value: 'yes', label: 'Ja', icon: <Premium24Regular /> },
  { value: 'no', label: 'Nein', icon: <Organization24Regular /> },
  { value: 'neutral', label: 'Neutral', icon: <CircleLine24Regular /> },
];

interface ProjectDialogProps {
  open: boolean;
  project: Project | null;
  nextOrder: number;
  onSave: (project: Project) => void;
  onDelete: (project: Project) => void;
  onClose: () => void;
}

export function ProjectDialog({ open, project, nextOrder, onSave, onDelete, onClose }: ProjectDialogProps) {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Project>(() => project ?? createEmptyProject(nextOrder));
  const [hexText, setHexText] = useState(draft.color);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [surfaceNode, setSurfaceNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      const initial = project ?? createEmptyProject(nextOrder);
      setDraft(initial);
      setHexText(initial.color);
    }
  }, [open, project, nextOrder]);

  const handleImageSelect = (file: File | undefined) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const applyColor = (hex: string) => {
    setDraft((prev) => ({ ...prev, color: hex }));
    setHexText(hex);
  };

  const handleSwatchSelect: SwatchPickerOnSelectEventHandler = (_event, data) => {
    applyColor(data.selectedSwatch.toUpperCase());
  };

  const handleSave = () => {
    if (!draft.name.trim()) {
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      client: draft.client.trim(),
      contingents: draft.hasContingent ? draft.contingents : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(_event, data) => !data.open && onClose()}>
      <DialogSurface
        ref={setSurfaceNode}
        className={styles.surface}
        backdrop={{ className: styles.transparentBackdrop }}
      >
        <DialogBody>
          <DialogTitle>{project ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
          <DialogContent className={styles.content}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                <button
                  type="button"
                  className={styles.avatarButton}
                  onClick={() => fileInputRef.current?.click()}
                  title="Bild ändern"
                >
                  <Avatar image={draft.image ? { src: draft.image } : undefined} name={draft.name || undefined} size={72} />
                  <span className={styles.avatarOverlay}>
                    <Camera24Regular />
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES}
                  hidden
                  onChange={(event) => handleImageSelect(event.target.files?.[0])}
                />
                {draft.image && (
                  <Button
                    appearance="secondary"
                    icon={<Delete24Regular />}
                    className={styles.avatarRemoveButton}
                    onClick={() => setDraft((prev) => ({ ...prev, image: undefined }))}
                    aria-label="Bild entfernen"
                    title="Bild entfernen"
                  />
                )}
              </div>
            </div>

            <Field label="Name" required orientation="horizontal">
              <Input value={draft.name} onChange={(_event, data) => setDraft((prev) => ({ ...prev, name: data.value }))} />
            </Field>

            <Field label="Kunde" orientation="horizontal">
              <Input value={draft.client} onChange={(_event, data) => setDraft((prev) => ({ ...prev, client: data.value }))} />
            </Field>

            <Field label="Chargeable" orientation="horizontal">
              <div className={styles.chargeableGroup}>
                {CHARGEABLE_OPTIONS.map((option) => (
                  <ToggleButton
                    key={option.value}
                    icon={option.icon}
                    checked={draft.chargeable === option.value}
                    onClick={() => setDraft((prev) => ({ ...prev, chargeable: option.value }))}
                    aria-label={option.label}
                    title={option.label}
                  />
                ))}
              </div>
            </Field>

            <Field label="Kontingent" orientation="horizontal">
              <ToggleButton
                icon={<Checkmark24Regular />}
                checked={draft.hasContingent}
                onClick={() => setDraft((prev) => ({ ...prev, hasContingent: !prev.hasContingent }))}
                aria-label="Festes Kontingent"
                title="Festes Kontingent"
              />
            </Field>

            <Field label="Farbe" orientation="horizontal">
              <Popover
                open={colorPopoverOpen}
                onOpenChange={(_event, data) => setColorPopoverOpen(data.open)}
                positioning="below-start"
                mountNode={surfaceNode}
              >
                <PopoverTrigger disableButtonEnhancement>
                  <button type="button" className={styles.colorTrigger}>
                    <span className={styles.colorTriggerSwatch} style={{ backgroundColor: draft.color }} />
                    <span className={styles.colorTriggerHex}>{draft.color}</span>
                    <ChevronDown20Regular />
                  </button>
                </PopoverTrigger>
                <PopoverSurface>
                  <div className={styles.colorPopoverContent}>
                    <SwatchPicker aria-label="Vorschlagsfarben" selectedValue={draft.color} onSelectionChange={handleSwatchSelect}>
                      {suggestedProjectColors.map((color) => (
                        <ColorSwatch key={color.hex} color={color.hex} value={color.hex} aria-label={color.name} />
                      ))}
                    </SwatchPicker>
                    <Input
                      value={hexText}
                      onChange={(_event, data) => setHexText(data.value)}
                      onBlur={() => {
                        const normalized = hexText.startsWith('#') ? hexText : `#${hexText}`;
                        if (HEX_COLOR_PATTERN.test(normalized)) {
                          applyColor(normalized.toUpperCase());
                        } else {
                          setHexText(draft.color);
                        }
                      }}
                      placeholder="#RRGGBB"
                    />
                  </div>
                </PopoverSurface>
              </Popover>
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
          <DialogActions fluid className={styles.actions} style={{ width: '100%', justifySelf: 'stretch' }}>
            {project && (
              <Button
                appearance="subtle"
                icon={<Delete24Regular />}
                onClick={() => onDelete(project)}
                className={styles.deleteButton}
              >
                Löschen
              </Button>
            )}
            <Button appearance="secondary" onClick={onClose}>
              Abbrechen
            </Button>
            <Button appearance="primary" onClick={handleSave} disabled={!draft.name.trim()}>
              Speichern
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
