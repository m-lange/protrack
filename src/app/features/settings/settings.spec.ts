import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FileAccess } from '../../core/backup/file-access';
import { CustomerStore } from '../../core/data/customer-store';
import { emptyData } from '../../core/data/model';
import { SettingsStore } from '../../core/data/settings-store';
import { serializeSyncFile, toSyncFile } from '../../core/data/sync-file';
import { FakeDatabase, customer, provideFakeDatabase } from '../../testing/fake-database';
import { Settings } from './settings';

describe('Settings', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        provideFakeDatabase(),
        { provide: FileAccess, useValue: { supported: false } },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function button(element: HTMLElement, text: string): HTMLButtonElement {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;
  }

  it('saves the federal state', async () => {
    const { fixture, element } = await render();
    const select = element.querySelector('select')!;
    select.value = 'HE';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(TestBed.inject(FakeDatabase).settings.region).toBe('HE');
    expect(element.textContent).not.toContain('Pick your federal state');
  });

  it('sets the chargeability target as a split of chargeable and non-chargeable time', async () => {
    const { fixture, element } = await render();
    const handle = element.querySelector<HTMLElement>(
      '[aria-label="Split between Chargeable and Non-chargeable"]',
    )!;
    const before = TestBed.inject(SettingsStore).settings().chargeabilityTarget;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await fixture.whenStable();
    expect(TestBed.inject(SettingsStore).settings().chargeabilityTarget).toBe(before + 5);
    expect(handle.getAttribute('aria-valuetext')).toBe(
      `Chargeable ${before + 5}%, Non-chargeable ${95 - before}%`,
    );
  });

  it('splits the location targets in the order On-site, Reply, Home office', async () => {
    const { fixture, element } = await render();
    const handles = element.querySelectorAll<HTMLElement>(
      '[aria-label^="Split between On-site"], [aria-label^="Split between Reply"]',
    );
    expect(handles.length).toBe(2);
    expect(handles[0].getAttribute('aria-label')).toBe('Split between On-site and Reply');
    expect(handles[1].getAttribute('aria-label')).toBe('Split between Reply and Home office');
    expect(handles[1].getAttribute('aria-valuetext')).toBe('Reply 25%, Home office 45%');

    handles[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await fixture.whenStable();
    expect(TestBed.inject(SettingsStore).settings().locationTargets).toEqual({
      onsite: 30,
      home: 50,
      reply: 20,
    });
    expect(element.textContent).toContain('Home office 50%');
  });

  it('explains when the browser cannot keep a backup file', async () => {
    const { element } = await render();
    expect(element.textContent).toContain('Your browser can’t keep a backup file.');
  });

  it('imports a file only after confirmation and replaces all data', async () => {
    const customers = TestBed.inject(CustomerStore);
    customers.set([customer('Kranich Logistik')]);
    const { fixture, element } = await render();
    const data = emptyData();
    data.customers.push(customer('Brennwald Retail'));
    const text = serializeSyncFile(toSyncFile(data));
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File([text], 'backup.json')] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
    expect(element.textContent).toContain('backup.json');
    expect(customers.customers().map((c) => c.name)).toEqual(['Kranich Logistik']);

    button(element, 'Replace my data').click();
    await fixture.whenStable();
    expect(customers.customers().map((c) => c.name)).toEqual(['Brennwald Retail']);
    expect(element.textContent).toContain('Your data was imported.');
  });

  it('deletes all data after confirmation', async () => {
    const customers = TestBed.inject(CustomerStore);
    customers.set([customer('Kranich Logistik')]);
    const { fixture, element } = await render();
    button(element, 'Delete all data').click();
    await fixture.whenStable();
    expect(customers.customers().length).toBe(1);
    button(element, 'Delete everything').click();
    await fixture.whenStable();
    expect(customers.customers()).toEqual([]);
    expect(element.textContent).toContain('All data was deleted.');
  });
});
