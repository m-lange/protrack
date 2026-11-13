import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** How often a running app looks for a new version, besides each time it comes to the front. */
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Watches the service worker for a new version of ProTrack. Once it is downloaded, `ready` turns
 * true and the app offers a reload, so no tab keeps running an old version, which could write an
 * older data model to the backup file. Only production builds have a service worker.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  /** Missing where no service worker is provided, as in tests. */
  private readonly sw = inject(SwUpdate, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly readyState = signal(false);
  private readonly brokenState = signal(false);

  /** A new version is downloaded and starts with the next reload. */
  readonly ready = this.readyState.asReadonly();
  /** The running version can't load its files anymore; only a reload helps. */
  readonly broken = this.brokenState.asReadonly();

  constructor() {
    const sw = this.sw;
    if (!sw?.isEnabled) return;
    sw.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') this.readyState.set(true);
    });
    sw.unrecoverable.subscribe(() => this.brokenState.set(true));
    const check = () => {
      if (!this.readyState()) sw.checkForUpdate().catch(() => undefined);
    };
    setInterval(check, CHECK_INTERVAL_MS);
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') check();
    });
  }

  /** Starts the new version. */
  reload(): void {
    this.document.location.reload();
  }
}
