import { useRef, useState } from 'react';
import { Button, Title3, Toast, ToastTitle, useToastController, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ArrowDownload24Regular, ArrowUpload24Regular, Delete24Regular } from '@fluentui/react-icons';
import { ConfirmDialog } from '../ConfirmDialog';
import { DashboardCard } from '../dashboard/DashboardCard';
import { downloadBackupFallback, importBackupFile, resetAllData } from '../../utils/backup';
import { APP_TOASTER_ID } from '../../utils/toaster';

const useStyles = makeStyles({
  card: {
    alignSelf: 'stretch',
    width: '260px',
    boxSizing: 'border-box',
    gap: tokens.spacingVerticalM,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalM,
  },
  divider: {
    width: '100%',
    borderTopWidth: tokens.strokeWidthThin,
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    paddingTop: tokens.spacingVerticalM,
  },
  dangerButton: {
    color: tokens.colorPaletteRedForeground2,
  },
  fullWidthButton: {
    width: '100%',
  },
});

export function DataManagementSection() {
  const styles = useStyles();
  const { dispatchToast } = useToastController(APP_TOASTER_ID);
  const [confirmAction, setConfirmAction] = useState<'import' | 'reset' | null>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const notify = (title: string, intent: 'success' | 'error') => {
    dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
      </Toast>,
      { intent },
    );
  };

  const handleImportFileSelected = (file: File | undefined) => {
    if (!file) return;
    setPendingImportFile(file);
    setConfirmAction('import');
  };

  const runImport = async () => {
    if (!pendingImportFile) return;
    try {
      await importBackupFile(pendingImportFile);
      window.location.href = '/';
    } catch {
      notify('Import fehlgeschlagen - Datei ungültig?', 'error');
    } finally {
      setPendingImportFile(null);
      setConfirmAction(null);
    }
  };

  const runReset = async () => {
    await resetAllData();
    window.location.href = '/';
  };

  return (
    <DashboardCard className={styles.card}>
      <Title3>Daten</Title3>

      <div className={styles.column}>
        <Button className={styles.fullWidthButton} icon={<ArrowDownload24Regular />} onClick={() => void downloadBackupFallback()}>
          Exportieren
        </Button>
        <Button className={styles.fullWidthButton} icon={<ArrowUpload24Regular />} onClick={() => importInputRef.current?.click()}>
          Importieren
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => handleImportFileSelected(event.target.files?.[0])}
        />

        <div className={styles.divider}>
          <Button
            appearance="secondary"
            icon={<Delete24Regular />}
            className={mergeClasses(styles.dangerButton, styles.fullWidthButton)}
            onClick={() => setConfirmAction('reset')}
          >
            Alle Daten zurücksetzen
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'import' ? 'Import bestätigen' : 'Zurücksetzen bestätigen'}
        message={
          confirmAction === 'import'
            ? 'Alle aktuellen Projekte, Buchungen und Einstellungen werden durch den Inhalt dieser Datei ersetzt. Fortfahren?'
            : 'Alle Projekte, Buchungen und Jahres-Einstellungen werden unwiderruflich gelöscht. Fortfahren?'
        }
        confirmLabel={confirmAction === 'import' ? 'Importieren' : 'Zurücksetzen'}
        onConfirm={() => void (confirmAction === 'import' ? runImport() : runReset())}
        onCancel={() => {
          setConfirmAction(null);
          setPendingImportFile(null);
        }}
      />
    </DashboardCard>
  );
}
