import { Component, DestroyRef, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CustomerStore } from '../../core/data/customer-store';
import { ProjectStore } from '../../core/data/project-store';
import { Shortcuts } from '../../core/shortcuts';
import { TODAY } from '../../core/today';
import { STRINGS } from '../../i18n/strings';
import { Icon } from '../../shared/icon/icon';
import { forecastCopy } from './forecast/forecast-copy';

/** How long the Copy button says "Copied". */
const COPIED_MS = 2000;

/**
 * My projects: the page head and the Projects and Forecast tabs around the open tab. On the
 * Forecast tab the head also has Copy (see forecastCopy).
 */
@Component({
  selector: 'app-projects',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  protected readonly t = inject(STRINGS);
  protected readonly customers = inject(CustomerStore).customers;
  private readonly projects = inject(ProjectStore).projects;
  private readonly today = inject(TODAY);
  private readonly router = inject(Router);

  /** Whether the Forecast tab is open. */
  protected readonly onForecast = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.isForecast()),
    ),
    { initialValue: this.isForecast() },
  );

  /** Whether the Copy button says "Copied" for a moment. */
  protected readonly copied = signal(false);
  private copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // "n" makes a new project, as the New project button does once there are accounts.
    inject(Shortcuts).use({
      create: () => {
        if (this.customers().length > 0) void this.router.navigateByUrl('/projects/new');
      },
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimer));
  }

  private isForecast(): boolean {
    return this.router.url.startsWith('/projects/forecast');
  }

  /**
   * Puts the planned days of this month and the next two on the clipboard, as HTML for an email
   * and as text. Without any planned days there is nothing to copy.
   */
  protected async copyForecast(): Promise<void> {
    const copy = forecastCopy(this.customers(), this.projects(), this.today, {
      project: this.t.forecast.copyProject,
      row: this.t.forecast.copyRow,
      month: (month) => `${this.t.monthsShort[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`,
    });
    if (!copy) return;
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([copy.html], { type: 'text/html' }),
        'text/plain': new Blob([copy.text], { type: 'text/plain' }),
      }),
    ]);
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), COPIED_MS);
  }
}
