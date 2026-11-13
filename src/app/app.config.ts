import {
  ApplicationConfig,
  Injector,
  LOCALE_ID,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { Backup } from './core/backup/backup';
import { AppDataService } from './core/data/app-data';
import { Snapshots } from './core/data/snapshots';
import { Language } from './i18n/language';

/**
 * Loads the data from IndexedDB before the first page renders, takes the language from it,
 * then reconnects the backup. When the data can't be loaded, AppDataService.loadFailed tells
 * the shell, and neither restore points nor the backup file are touched.
 */
async function loadData(): Promise<void> {
  const injector = inject(Injector);
  const appData = inject(AppDataService);
  const backup = inject(Backup);
  const snapshots = inject(Snapshots);
  try {
    await appData.load();
  } catch (error) {
    console.error('ProTrack could not load its data from IndexedDB.', error);
    return;
  } finally {
    // After the load, so the language is the stored one; texts and LOCALE_ID come from it.
    injector.get(Language);
  }
  void navigator.storage?.persist?.();
  snapshots
    .takeDaily()
    .catch((error) => console.error('ProTrack could not take a restore point.', error));
  backup.init().catch((error) => console.error('ProTrack could not reconnect the backup.', error));
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(loadData),
    // Date formats, month and day names follow the language from Settings.
    { provide: LOCALE_ID, useFactory: () => inject(Language).locale },
    // Works offline and offers new versions (AppUpdate); production builds only.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
