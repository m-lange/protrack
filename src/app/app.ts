import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdate } from './core/app-update';
import { AppDataService } from './core/data/app-data';
import { Icon } from './shared/icon/icon';
import { STRINGS } from './i18n/strings';
import { Shortcuts } from './core/shortcuts';
import { SidebarState } from './core/sidebar-state';
import { ShortcutsDialog } from './layout/shortcuts-dialog/shortcuts-dialog';
import { SideNav } from './layout/side-nav/side-nav';
import { TopBar } from './layout/top-bar/top-bar';

/**
 * The app shell: top bar, a note when the data couldn't be loaded or a new version is ready,
 * side navigation and the page. It takes the keyboard shortcuts (Shortcuts) for the whole app.
 */
@Component({
  imports: [RouterOutlet, Icon, SideNav, TopBar, ShortcutsDialog],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  host: { '(document:keydown)': 'shortcuts.handle($event)' },
})
export class App {
  protected readonly shortcuts = inject(Shortcuts);
  protected readonly sidebar = inject(SidebarState);
  protected readonly update = inject(AppUpdate);
  protected readonly loadFailed = inject(AppDataService).loadFailed;
  protected readonly t = inject(STRINGS);
}
