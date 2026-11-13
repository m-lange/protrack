import { Injectable, signal } from '@angular/core';

/** Where the browser keeps whether the side navigation is collapsed. */
const STORAGE_KEY = 'protrack.sidebarCollapsed';

/**
 * Whether the side navigation is collapsed to its icons. A setting of this browser, not user data:
 * it stays in localStorage and out of the backup file.
 */
@Injectable({ providedIn: 'root' })
export class SidebarState {
  private readonly state = signal(read());
  readonly collapsed = this.state.asReadonly();

  toggle(): void {
    this.state.update((collapsed) => !collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, String(this.state()));
    } catch {
      // Storage blocked (private window, cleared site data): the state lasts until reload.
    }
  }
}

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}
