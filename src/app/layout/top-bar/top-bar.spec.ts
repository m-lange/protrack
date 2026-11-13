import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Backup, BackupStatus } from '../../core/backup/backup';
import { TODAY } from '../../core/today';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  const status = signal<BackupStatus>({ kind: 'off' });

  beforeEach(async () => {
    status.set({ kind: 'off' });
    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        provideRouter([]),
        { provide: TODAY, useValue: new Date(2026, 10, 6) },
        { provide: Backup, useValue: { status } },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('steps through the years and jumps back to this year', async () => {
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
