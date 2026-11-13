import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SelectedYear } from '../../core/selected-year';
import { SidebarState } from '../../core/sidebar-state';
import { TODAY } from '../../core/today';
import { STRINGS } from '../../i18n/strings';
import { Icon, IconName } from '../../shared/icon/icon';

interface NavMonth {
  name: string;
  /** 1–12, as used in the timesheet URL. */
  number: number;
  isNow: boolean;
  isFuture: boolean;
}

interface NavItem {
  link: string;
  icon: IconName;
  label: string;
}

/**
 * The left navigation with the twelve timesheet months of the year picked in the top bar.
 * Collapsed, it shows only the icons of its pages; the button beside Home switches.
 */
@Component({
  selector: 'app-side-nav',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.css',
  host: { '[class.collapsed]': 'collapsed()' },
})
export class SideNav {
  private readonly today = inject(TODAY);
  protected readonly t = inject(STRINGS);
  protected readonly sidebar = inject(SidebarState);
  protected readonly collapsed = this.sidebar.collapsed;

  protected readonly year = inject(SelectedYear).year;

  /** Home, in one row with the collapse button. */
  protected readonly home: NavItem = { link: '/', icon: 'home', label: this.t.nav.home };

  /** The pages between Home and My timesheet, which has its months underneath. */
  protected readonly items: NavItem[] = [
    { link: '/customers', icon: 'customer', label: this.t.nav.customers },
    { link: '/projects', icon: 'projects', label: this.t.nav.projects },
    { link: '/year', icon: 'year', label: this.t.nav.year },
  ];

  protected readonly months = computed<NavMonth[]>(() => {
    const year = this.year();
    const nowYear = this.today.getFullYear();
    const nowMonth = this.today.getMonth();
    return this.t.months.map((name, index) => ({
      name,
      number: index + 1,
      isNow: year === nowYear && index === nowMonth,
      isFuture: year > nowYear || (year === nowYear && index > nowMonth),
    }));
  });
}
