import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { TODAY } from './core/today';
import { Home } from './features/home/home';
import { STRINGS, Strings } from './i18n/strings';

const customerEdit = () =>
  import('./features/customers/customer-edit/customer-edit').then((m) => m.CustomerEdit);
const projectEdit = () =>
  import('./features/projects/project-edit/project-edit').then((m) => m.ProjectEdit);
/** The Projects and Archive tabs of My projects: one tree, by project status. */
const projectTree = () =>
  import('./features/projects/project-tree/project-tree').then((m) => m.ProjectTree);

/** The browser tab title of a page, from the strings file. */
const title = (page: (t: Strings) => string) => () => {
  const t = inject(STRINGS);
  return t.app.pageTitle(page(t));
};

/** The URL of a timesheet month: /timesheet/2026/11. */
const monthRoute = (date: Date) => `/timesheet/${date.getFullYear()}/${date.getMonth() + 1}`;

export const routes: Routes = [
  { path: '', component: Home, title: () => inject(STRINGS).app.name },
  {
    path: 'customers',
    loadComponent: () =>
      import('./features/customers/customers-page/customers-page').then((m) => m.CustomersPage),
    title: title((t) => t.nav.customers),
  },
  {
    path: 'customers/new',
    loadComponent: customerEdit,
    title: title((t) => t.customerEdit.pageTitleNew),
  },
  {
    path: 'customers/:id',
    loadComponent: customerEdit,
    title: title((t) => t.customerEdit.pageTitleEdit),
  },
  {
    path: 'projects/new',
    loadComponent: projectEdit,
    title: title((t) => t.projectEdit.pageTitleNew),
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/projects').then((m) => m.Projects),
    children: [
      {
        path: '',
        loadComponent: projectTree,
        data: { status: 'active' },
        title: title((t) => t.nav.projects),
      },
      {
        path: 'forecast',
        loadComponent: () =>
          import('./features/projects/forecast/forecast').then((m) => m.Forecast),
        title: title((t) => t.projects.tabForecast),
      },
      {
        // The completed projects (user, 2026-11-10); `status` binds to ProjectTree's input.
        path: 'archive',
        loadComponent: projectTree,
        data: { status: 'completed' },
        title: title((t) => t.projects.tabArchive),
      },
    ],
  },
  {
    path: 'projects/:id',
    loadComponent: projectEdit,
    title: title((t) => t.projectEdit.pageTitleEdit),
  },
  {
    path: 'year',
    loadComponent: () => import('./features/year/year').then((m) => m.Year),
    title: title((t) => t.nav.year),
  },
  {
    path: 'timesheet',
    pathMatch: 'full',
    redirectTo: () => monthRoute(inject(TODAY)),
  },
  {
    path: 'timesheet/:year/:month',
    loadComponent: () => import('./features/timesheet/timesheet').then((m) => m.Timesheet),
    title: title((t) => t.nav.timesheet),
  },
  {
    // The weekly timesheet before 2026-11-10: a week's link opens its month.
    path: 'timesheet/:year/:month/:week',
    redirectTo: ({ params }) => `/timesheet/${params['year']}/${params['month']}`,
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
    title: title((t) => t.nav.settings),
  },
  { path: '**', redirectTo: '' },
];
