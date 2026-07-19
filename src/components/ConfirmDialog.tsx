import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  surface: {
    width: '380px',
    maxWidth: '90vw',
  },
  transparentBackdrop: {
    backgroundColor: 'transparent',
  },
  content: {
    marginTop: tokens.spacingVerticalM,
  },
  actions: {
    marginTop: tokens.spacingVerticalXXL,
    justifyContent: 'flex-end',
  },
  confirmButton: {
    backgroundColor: tokens.colorStatusDangerBackground3,
    color: '#ffffff',
    ':hover': {
      backgroundColor: tokens.colorStatusDangerBackground3Hover,
      color: '#ffffff',
    },
    ':hover:active': {
      backgroundColor: tokens.colorStatusDangerBackground3Pressed,
      color: '#ffffff',
    },
  },
});

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = useStyles();

  return (
    <Dialog open={open} onOpenChange={(_event, data) => !data.open && onCancel()}>
      <DialogSurface className={styles.surface} backdrop={{ className: styles.transparentBackdrop }}>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent className={styles.content}>{message}</DialogContent>
          <DialogActions className={styles.actions}>
            <Button appearance="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button appearance="primary" className={styles.confirmButton} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
