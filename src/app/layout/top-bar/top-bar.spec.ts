import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Backup, BackupStatus } from '../../core/backup/backup';
import { ProjectStore } from '../../core/data/project-store';
import { Project } from '../../core/data/model';
import { order, project } from '../../testing/fake-database';
import { TODAY } from '../../core/today';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  const status = signal<BackupStatus>({ kind: 'off' });
  const projects = signal<Project[]>([]);

  beforeEach(async () => {
    status.set({ kind: 'off' });
    projects.set([]);
    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        provideRouter([]),
        { provide: TODAY, useValue: new Date(2026, 10, 6) },
        { provide: Backup, useValue: { status } },
        { provide: ProjectStore, useValue: { projects } },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('offers only this year while no order runs in another', async () => {
    const { element } = await render();
    const arrows = element.querySelectorAll<HTMLButtonElement>('.pt-stepper__btn');
    expect([...arrows].map((b) => b.disabled)).toEqual([true, true]);
  });

  it('steps through every year from the first order to the last, not beyond', async () => {
    projects.set([
      project('a', 'c', [order('a1', '2023-03-01', '2023-06-30')]),
      project('b', 'c', [order('b1', '2025-11-01', '2025-12-31')]),
    ]);
    const { fixture, element } = await render();
    const value = () => element.querySelector('.pt-stepper__value')?.textContent;
    const [previous, next] = element.querySelectorAll<HTMLButtonElement>('.pt-stepper__btn');
    // The current year 2026 is the last one, after the last order's year.
    expect(next.disabled).toBe(true);
    const seen: string[] = [];
    while (!previous.disabled) {
      previous.click();
      await fixture.whenStable();
      seen.push(value()!);
    }
    // 2024 has no order but lies between.
    expect(seen).toEqual(['2025', '2024', '2023']);
  });

  it('steps through the years and jumps back to this year', async () => {
    projects.set([project('a', 'c', [order('a1', '2026-11-01', '2027-03-31')])]);
    const { fixture, element } = await render();
    const value = () => element.querySelector('.pt-stepper__value')?.textContent;
    const thisYear = element.querySelector<HTMLButtonElement>('.pt-btn--link')!;
    expect(value()).toBe('2026');
    expect(thisYear.disabled).toBe(true);

    element.querySelector<HTMLButtonElement>('button[aria-label="Next year"]')!.click();
    await fixture.whenStable();
    expect(value()).toBe('2027');
    expect(thisYear.disabled).toBe(false);

    thisYear.click();
    await fixture.whenStable();
    expect(value()).toBe('2026');
  });

  it('shows the backup status on the save icon', async () => {
    const { fixture, element } = await render();
    const link = () => element.querySelector('a.backup')!;
    expect(link().getAttribute('aria-label')).toBe('No backup');
    expect(link().getAttribute('data-tone')).toBe('error');

    status.set({ kind: 'saved', at: '2026-11-06T10:00:00.000Z' });
    await fixture.whenStable();
    expect(link().getAttribute('aria-label')).toBe('Backup up to date');
    expect(link().getAttribute('data-tone')).toBe('ok');

    status.set({ kind: 'paused' });
    await fixture.whenStable();
    expect(link().getAttribute('data-tone')).toBe('pending');

    status.set({ kind: 'error', problem: 'writeFailed' });
    await fixture.whenStable();
    expect(link().getAttribute('data-tone')).toBe('error');
  });

  it('labels the icon-only settings link', async () => {
    const { element } = await render();
    expect(element.querySelector('a[aria-label="Settings"]')).toBeTruthy();
  });
});
