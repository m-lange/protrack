import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { order, project } from '../testing/fake-database';
import { ProjectStore } from './data/project-store';
import { SelectedYear } from './selected-year';
import { PageActions, Shortcuts } from './shortcuts';
import { TODAY } from './today';

@Component({ template: '' })
class Blank {}

/** A page that sets its own actions while it shows. */
@Component({ template: '<input class="field" />' })
class Page {
  static actions: PageActions = {};
  constructor() {
    inject(Shortcuts).use(Page.actions);
  }
}

describe('Shortcuts', () => {
  let shortcuts: Shortcuts;
  let router: Router;
  let year: SelectedYear;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        { provide: TODAY, useValue: new Date(2026, 10, 13) },
        // Orders in 2025 and 2027, so the year can step both ways.
        {
          provide: ProjectStore,
          useValue: {
            projects: signal([project('p', 'c', [order('o', '2025-01-01', '2027-12-31')])]),
          },
        },
      ],
    });
    shortcuts = TestBed.inject(Shortcuts);
    router = TestBed.inject(Router);
    year = TestBed.inject(SelectedYear);
    Page.actions = {};
  });

  function press(key: string, init: KeyboardEventInit = {}, target: Element = document.body) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    Object.defineProperty(event, 'target', { value: target });
    shortcuts.handle(event);
    return event;
  }

  it('goes to a page with g and a letter', async () => {
    press('g');
    press('p');
    await new Promise((resolve) => setTimeout(resolve));
    expect(router.url).toBe('/projects');

    year.next();
    press('g');
    press('y');
    await new Promise((resolve) => setTimeout(resolve));
    expect(router.url).toBe('/year');
    expect(year.year()).toBe(2026);
  });

  it('ignores a letter without g before it, and keys typed into fields', async () => {
    press('p');
    const field = document.createElement('input');
    press('g', {}, field);
    press('t', {}, field);
    await new Promise((resolve) => setTimeout(resolve));
    expect(router.url).toBe('/');
  });

  it('steps the year by default', () => {
    press('PageDown');
    expect(year.year()).toBe(2027);
    press('PageUp', { shiftKey: true });
    press('PageUp');
    expect(year.year()).toBe(2025);
  });

  it('opens My timesheet at today with . from any page', async () => {
    press('.');
    await new Promise((resolve) => setTimeout(resolve));
    expect(router.url).toBe('/timesheet');
    expect(shortcuts.takeToday()).toBe(true);
    expect(shortcuts.takeToday()).toBe(false);
  });

  it('lets the page take over its keys while it shows', () => {
    const calls: string[] = [];
    Page.actions = {
      previous: () => calls.push('previous'),
      today: () => calls.push('today'),
      create: () => calls.push('create'),
      save: () => calls.push('save'),
      cancel: () => calls.push('cancel'),
    };
    const fixture = TestBed.createComponent(Page);
    const field = (fixture.nativeElement as HTMLElement).querySelector('input')!;

    press('PageUp');
    press('.');
    press('n');
    // Ctrl+S also saves from inside a field; Escape there keeps its own use.
    expect(press('s', { ctrlKey: true }, field).defaultPrevented).toBe(true);
    press('Escape', {}, field);
    press('Escape');
    expect(calls).toEqual(['previous', 'today', 'create', 'save', 'cancel']);
    expect(year.year()).toBe(2026);

    fixture.destroy();
    press('n');
    expect(press('s', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(calls.length).toBe(5);
  });

  it('opens the list of shortcuts with ?', () => {
    press('?', { shiftKey: true });
    expect(shortcuts.helpOpen()).toBe(true);
  });
});
