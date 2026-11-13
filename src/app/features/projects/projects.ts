import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CustomerStore } from '../../core/data/customer-store';
import { Shortcuts } from '../../core/shortcuts';
import { STRINGS } from '../../i18n/strings';
import { Icon } from '../../shared/icon/icon';

/** My projects: the page head and the Projects and Forecast tabs around the open tab. */
@Component({
  selector: 'app-projects',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  protected readonly t = inject(STRINGS);
  protected readonly customers = inject(CustomerStore).customers;

  constructor() {
    // "n" makes a new project, as the New project button does once there are accounts.
    const router = inject(Router);
    inject(Shortcuts).use({
      create: () => {
        if (this.customers().length > 0) void router.navigateByUrl('/projects/new');
      },
    });
  }
}
