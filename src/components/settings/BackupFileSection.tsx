import { useEffect, useState } from 'react';
import {
  Body1,
  Button,
  Text,
  Title3,
  Toast,
  ToastTitle,
  useToastController,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { DocumentAdd24Regular, Save24Regular } from '@fluentui/react-icons';
import { DashboardCard } from '../dashboard/DashboardCard';
import { isFileSystemAccessSupported, requestBackupFile, triggerManualBackup } from '../../utils/backup';
import { getBackupHandle } from '../../db/database';
import { APP_TOASTER_ID } from '../../utils/toaster';

const useStyles = makeStyles({
  card: {
    alignSelf: 'stretch',
    width: '380px',
    boxSizing: 'border-box',
    gap: tokens.spacingVerticalM,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'auto auto',
    rowGap: tokens.spacingVerticalM,
    columnGap: tokens.spacingHorizontalM,
    alignItems: 'center',
    justifyContent: 'start',
  },
  colSpan: {
    gridColumn: '1 / -1',
  },
  noWrapButton: {
    whiteSpace: 'nowrap',
  },
  status: {
    color: tokens.colorNeutralForeground3,
  },
  persistRow: {
    marginTop: tokens.spacingVerticalL,
  },
});

export function BackupFileSection() {
  const styles = useStyles();
  const { dispatchToast } = useToastController(APP_TOASTER_ID);
  const [backupFileName, setBackupFileName] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    getBackupHandle().then((handle) => setBackupFileName(handle?.name ?? null));
    navigator.storage?.persisted().then(setPersisted);
  }, []);

  const notify = (title: string, intent: 'success' | 'error') => {
    dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
      </Toast>,
      { intent },
    );
  };

  const handleChooseFile = async () => {
    try {
      const handle = await requestBackupFile();
      setBackupFileName(handle.name);
      notify('Sicherungsdatei festgelegt und Sicherung erstellt', 'success');
    } catch {
      // Der Nutzer hat den Datei-Dialog abgebrochen - kein Fehler.
    }
  };

  const handleManualBackup = async () => {
    const result = await triggerManualBackup();
    notify(result === 'success' ? 'Sicherung erstellt' : 'Sicherung fehlgeschlagen', result === 'success' ? 'success' : 'error');
  };

  const handlePersistRetry = async () => {
    const granted = await navigator.storage?.persist();
    setPersisted(granted ?? null);
  };

  return (
    <DashboardCard className={styles.card}>
      <Title3>Sicherung</Title3>

      <div className={styles.grid}>
        {isFileSystemAccessSupported() ? (
          <>
            <Button className={styles.noWrapButton} icon={<DocumentAdd24Regular />} onClick={handleChooseFile}>
              Sicherungsdatei festlegen
            </Button>
            <Button className={styles.noWrapButton} icon={<Save24Regular />} onClick={handleManualBackup} disabled={!backupFileName}>
              Jetzt sichern
            </Button>
          </>
        ) : (
          <Body1 className={mergeClasses(styles.colSpan, styles.status)}>
            Dieser Browser unterstützt keine dauerhaft festgelegte Sicherungsdatei - nutze stattdessen "Exportieren" für
            einen manuellen Download.
          </Body1>
        )}

        <Text className={mergeClasses(styles.colSpan, styles.status)}>
          {backupFileName ? `Sicherungsdatei: ${backupFileName}` : 'Noch keine Sicherungsdatei festgelegt.'}
        </Text>

        <Text className={mergeClasses(styles.status, styles.persistRow)}>
          Dauerhafter Speicher: {persisted === null ? 'unbekannt' : persisted ? 'aktiv' : 'inaktiv'}
        </Text>
        {persisted === false && (
          <Button className={styles.persistRow} onClick={handlePersistRetry}>
            Erneut anfragen
          </Button>
        )}
      </div>
    </DashboardCard>
  );
}
