import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast, ToastTitle, useToastController } from '@fluentui/react-components';
import { triggerManualBackup } from '../utils/backup';
import { settingsPath } from '../utils/navigation';
import { APP_TOASTER_ID } from '../utils/toaster';

/** Shared "Jetzt sichern"-Aktion für den Header-Button: schreibt zur festgelegten Sicherungsdatei,
 * navigiert zu den Einstellungen falls noch keine festgelegt ist, und zeigt das Ergebnis als Toast. */
export function useManualBackup() {
  const navigate = useNavigate();
  const { dispatchToast } = useToastController(APP_TOASTER_ID);

  return useCallback(async () => {
    const result = await triggerManualBackup();
    if (result === 'no-handle') {
      navigate(settingsPath());
      return;
    }
    if (result === 'success') {
      dispatchToast(
        <Toast>
          <ToastTitle>Sicherung erstellt</ToastTitle>
        </Toast>,
        { intent: 'success' },
      );
    } else {
      dispatchToast(
        <Toast>
          <ToastTitle>Sicherung fehlgeschlagen</ToastTitle>
        </Toast>,
        { intent: 'error' },
      );
    }
  }, [navigate, dispatchToast]);
}
