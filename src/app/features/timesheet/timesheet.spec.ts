import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { BookingStore } from '../../core/data/booking-store';
import { CustomerStore } from '../../core/data/customer-store';
import { DayNoteStore } from '../../core/data/day-note-store';
import { ProjectStore } from '../../core/data/project-store';
import { SettingsStore } from '../../core/data/settings-store';
import { SelectedYear } from '../../core/selected-year';
import { Shortcuts } from '../../core/shortcuts';
import { TODAY } from '../../core/today';
import {
  FakeDatabase,
  customer,
  order,
  project,
  provideFakeDatabase,
} from '../../testing/fake-database';

/** The text of an element, its innermost parts joined by a space. */
function text(element: Element): string {
  const parts = [...element.querySelectorAll('*')]
    .filter((e) => e.children.length === 0)
    .map((e) => e.textContent?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(' ') : (element.textContent?.trim() ?? '');
}

describe('Timesheet', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideFakeDatabase(),
        // Saturday, November 7, 2026.
        { provide: TODAY, useValue: new Date(2026, 10, 7) },
      ],
    });
    TestBed.inject(CustomerStore).set([customer('Silberbach Bank', 's', 0)]);
    TestBed.inject(SettingsStore).set({
      ...TestBed.inject(SettingsStore).settings(),
      region: 'HB',
    });
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [
        order('mapping', '2026-09-14', '2026-11-04', { forecast: { '2026-11': 2 } }),
        order('review', '2026-11-01', '2026-12-31', { location: 'home' }),
      ]),
      project('audit', 's', [order('old', '2025-01-01', '2025-03-31')], { status: 'completed' }),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2026-11-02', days: 1 },
      { id: 'b2', orderId: 'mapping', date: '2026-11-03', days: 0.5 },
    ]);
  });

  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    const element = harness.routeNativeElement!;
    const hours = (day: string) => [
      ...element.querySelectorAll<HTMLInputElement>(`input[aria-label="Hours, ${day}"]`),
    ];
    const row = (day: string, index = 0) => hours(day)[index].closest<HTMLElement>('.entry')!;
    /** The texts of a row's cells, the parts of a cell joined by a space. */
    const cells = (day: string, index = 0) =>
      [...row(day, index).querySelectorAll('.pt-cell')].map(text);
    const stable = () => harness.fixture.whenStable();
    /** Opens a row's order list and picks the option that starts with `name`. */
    const pickOrder = async (day: string, name: string, index = 0) => {
      row(day, index).querySelector<HTMLElement>('app-order-select [ngCombobox]')!.click();
      await stable();
      const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
      options.find((o) => text(o.querySelector('.names')!) === name)!.click();
      await stable();
    };
    /** A day's open order list: its orders, and "—" for the line between two projects. */
    const listOf = async (day: string, index = 0) => {
      const trigger = row(day, index).querySelector<HTMLElement>('app-order-select [ngCombobox]')!;
      trigger.click();
      await stable();
      const items = [...document.querySelectorAll('[role="listbox"] > li')].map((item) =>
        item.classList.contains('divider') ? '—' : text(item.querySelector('.names')!),
      );
      trigger.click();
      await stable();
      return items;
    };
    const type = async (input: HTMLInputElement, text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('change'));
      await stable();
    };
    return { harness, element, hours, row, cells, stable, pickOrder, listOf, type };
  }

  it('shows the whole month, a row per day, and opens weeks of old links as their month', async () => {
    const { element } = await open('/timesheet/2026/11/45');
    expect(TestBed.inject(Router).url).toBe('/timesheet/2026/11');
    expect(element.querySelector('.month-name')?.textContent?.trim()).toBe('November 2026');
    const days = [...element.querySelectorAll('.entry.first .day')];
    expect(days.length).toBe(30);
    expect(text(days[0])).toBe('Sun 1');
    expect(text(days[29])).toBe('Mon 30');
    // Today, and a line above each Monday after the 1st.
    expect(element.querySelector('.entry.today .date')?.textContent).toBe('7');
    expect(element.querySelectorAll('.entry.week-start').length).toBe(5);
    // The first test also loads the page's code, which can take a while in a full run.
  }, 15_000);

  it('shows a booked day with its hours, project and order, location and the month figures', async () => {
    const { cells, row } = await open('/timesheet/2026/11');
    // Booked 1 d on Nov 2 and 0.5 d on Nov 3 of the 2 d planned for November.
    // Hours, order, location, Total, Forecast, Remaining, then the note icon and the actions.
    expect(cells('Mon, Nov 2').slice(1)).toEqual([
      '',
      'risk mapping',
      'On-site',
      '1',
      '2',
      '+9 d',
      '',
      '',
    ]);
    // Remaining is the budget (10 d) less the days booked on the order up to the row's day.
    expect(cells('Tue, Nov 3').slice(-5, -2)).toEqual(['1.5', '2', '+8.5 d']);
    expect(row('Mon, Nov 2').querySelector('input')!.value).toBe('8');
    // The project's color in front.
    expect(row('Mon, Nov 2').style.getPropertyValue('--row-color')).toBe('var(--project-indigo)');
    // A day without bookings: one empty row, nothing more.
    expect(cells('Wed, Nov 4').slice(2)).toEqual(['Choose order', '', '', '', '', '', '']);
  });

  it('books a row once it has an order and hours, in the order’s location', async () => {
    const { hours, pickOrder, type, cells } = await open('/timesheet/2026/11');
    await type(hours('Wed, Nov 4')[0], '4,2');
    expect(TestBed.inject(BookingStore).onDate('2026-11-04')).toBe(0);
    await pickOrder('Wed, Nov 4', 'risk review');
    const store = TestBed.inject(BookingStore);
    expect(store.onDay('review', '2026-11-04')).toBe(4.5 / 8);
    expect(store.find('review', '2026-11-04')?.location).toBeUndefined();
    expect(cells('Wed, Nov 4')[3]).toBe('Home office');
    expect(hours('Wed, Nov 4')[0].value).toBe('4.5');
  });

  it('offers only the orders of active projects running on the day, not booked on it yet', async () => {
    const { row, stable } = await open('/timesheet/2026/11');
    const optionsOf = async (day: string) => {
      row(day).querySelector<HTMLElement>('app-order-select [ngCombobox]')!.click();
      await stable();
      const names = [...document.querySelectorAll('[role="option"] .names')].map(text);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      row(day).querySelector<HTMLElement>('app-order-select [ngCombobox]')!.click();
      await stable();
      return names;
    };
    expect(await optionsOf('Mon, Nov 2')).toEqual(['risk mapping', 'risk review']);
    expect(await optionsOf('Thu, Nov 5')).toEqual(['risk review']);
  });

  it('lists the orders project by project, the project booked last before the day first, with a line between', async () => {
    const running = (id: string) => order(id, '2026-10-01', '2026-12-31');
    TestBed.inject(ProjectStore).set([
      project('ada', 's', [running('a1')]),
      project('bit', 's', [running('b1'), running('b2')]),
      project('cog', 's', [running('c1')]),
      project('dot', 's', [running('d1')]),
      project('eel', 's', [running('e1')]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: '1', orderId: 'e1', date: '2026-10-30', days: 1 },
      { id: '2', orderId: 'a1', date: '2026-11-02', days: 1 },
      { id: '3', orderId: 'd1', date: '2026-11-03', days: 1 },
      { id: '4', orderId: 'c1', date: '2026-11-04', days: 1 },
      { id: '5', orderId: 'b2', date: '2026-11-04', days: 1 },
    ]);
    const { pickOrder, listOf } = await open('/timesheet/2026/11');
    const list = async (day: string) => (await listOf(day)).join(' ');
    // Nov 2: the last day booked before it is in October; the rest as in My projects.
    expect(await list('Mon, Nov 2')).toBe('eel e1 — ada a1 — bit b1 bit b2 — cog c1 — dot d1');
    // Nov 6, after a day without bookings: the two projects of Nov 4 (as in My projects, each
    // with all its orders), then those of Nov 3, Nov 2 and October.
    expect(await list('Fri, Nov 6')).toBe('bit b1 bit b2 — cog c1 — dot d1 — ada a1 — eel e1');
    // A booking leads the days after it, not its own day.
    await pickOrder('Fri, Nov 6', 'eel e1');
    expect(await list('Fri, Nov 6')).toBe('bit b1 bit b2 — cog c1 — dot d1 — ada a1 — eel e1');
    expect(await list('Mon, Nov 9')).toBe('eel e1 — bit b1 bit b2 — cog c1 — dot d1 — ada a1');
  });

  it('keeps a row in its place when it is booked, above or below the day’s other rows', async () => {
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'review', date: '2026-11-02', days: 1 },
    ]);
    const { row, hours, stable, pickOrder, type } = await open('/timesheet/2026/11');
    row('Mon, Nov 2')
      .querySelector<HTMLButtonElement>('.action-cell button[aria-label^="Add entry"]')!
      .click();
    await stable();
    // "mapping" comes before "review" in My projects, but stays the second row.
    await pickOrder('Mon, Nov 2', 'risk mapping', 1);
    await type(hours('Mon, Nov 2')[1], '2');
    const store = TestBed.inject(BookingStore);
    expect(store.onDay('mapping', '2026-11-02')).toBe(0.25);
    // Picking the second order split the full day in two.
    expect(store.onDay('review', '2026-11-02')).toBe(0.5);
    expect(text(row('Mon, Nov 2', 1).querySelector('app-order-select')!)).toBe('risk mapping');
  });

  it('books 8 hours when an order is picked for an empty row', async () => {
    const { hours, pickOrder } = await open('/timesheet/2026/11');
    await pickOrder('Wed, Nov 4', 'risk review');
    expect(TestBed.inject(BookingStore).onDay('review', '2026-11-04')).toBe(1);
    expect(hours('Wed, Nov 4')[0].value).toBe('8');
  });

  it('splits a full day in half when a second order is picked, and only then', async () => {
    const { hours, pickOrder, row, stable } = await open('/timesheet/2026/11');
    const store = TestBed.inject(BookingStore);
    const add = (day: string, index = 0) => {
      row(day, index)
        .querySelector<HTMLButtonElement>('.action-cell button[aria-label^="Add entry"]')!
        .click();
      return stable();
    };
    // Nov 2: 8 h on "mapping"; a second order makes it 4 h and 4 h.
    await add('Mon, Nov 2');
    await pickOrder('Mon, Nov 2', 'risk review', 1);
    expect(store.onDay('mapping', '2026-11-02')).toBe(0.5);
    expect(store.onDay('review', '2026-11-02')).toBe(0.5);
    expect(hours('Mon, Nov 2').map((h) => h.value)).toEqual(['4', '4']);
    // Nov 3: 4 h only, not a full day; the second order gets a full day as before.
    await add('Tue, Nov 3');
    await pickOrder('Tue, Nov 3', 'risk review', 1);
    expect(store.onDay('mapping', '2026-11-03')).toBe(0.5);
    expect(store.onDay('review', '2026-11-03')).toBe(1);
  });

  it('adds rows for further orders with +, and deletes rows', async () => {
    const { element, row, hours, stable, pickOrder, type } = await open('/timesheet/2026/11');
    const store = TestBed.inject(BookingStore);
    const button = (day: string, label: string, index = 0) =>
      row(day, index).querySelector<HTMLButtonElement>(
        `.action-cell button[aria-label^="${label}"]`,
      )!;
    // An empty day: nothing to delete, and its empty row first needs an order.
    expect(button('Wed, Nov 4', 'Delete').disabled).toBe(true);
    expect(button('Wed, Nov 4', 'Add entry').disabled).toBe(true);
    expect(button('Wed, Nov 4', 'Add entry').title).toBe('Fill the empty row');

    const add = button('Mon, Nov 2', 'Add entry');
    expect(add.getAttribute('aria-label')).toBe('Add entry, Mon, Nov 2');
    add.click();
    await stable();
    expect(hours('Mon, Nov 2').length).toBe(2);
    expect(button('Mon, Nov 2', 'Add entry').disabled).toBe(true);
    // An added row goes again with Delete.
    expect(button('Mon, Nov 2', 'Delete', 1).getAttribute('aria-label')).toBe(
      'Delete entry, Mon, Nov 2',
    );
    button('Mon, Nov 2', 'Delete', 1).click();
    await stable();
    expect(hours('Mon, Nov 2').length).toBe(1);

    // Any number of orders on one day.
    button('Mon, Nov 2', 'Add entry').click();
    await stable();
    await pickOrder('Mon, Nov 2', 'risk review', 1);
    await type(hours('Mon, Nov 2')[1], '6');
    expect(store.onDate('2026-11-02')).toBe(1.25);
    button('Mon, Nov 2', 'Add entry', 1).click();
    await stable();
    expect(hours('Mon, Nov 2').length).toBe(3);
    // More than 8 hours on the day: its number is marked.
    expect(row('Mon, Nov 2').querySelector('.day.over')?.getAttribute('title')).toBe('10 h booked');
    expect(element.querySelectorAll('.entry.first').length).toBe(30);

    // Deleting a booking removes it; the day's only row starts over empty.
    button('Mon, Nov 2', 'Delete').click();
    await stable();
    expect(store.onDay('mapping', '2026-11-02')).toBe(0);
    button('Tue, Nov 3', 'Delete').click();
    await stable();
    expect(store.onDate('2026-11-03')).toBe(0);
    expect(hours('Tue, Nov 3').length).toBe(1);
    expect(hours('Tue, Nov 3')[0].value).toBe('');
  });

  it('removes a booking when its hours are cleared', async () => {
    const { hours, type, cells } = await open('/timesheet/2026/11');
    await type(hours('Tue, Nov 3')[0], '');
    expect(TestBed.inject(BookingStore).onDay('mapping', '2026-11-03')).toBe(0);
    expect(TestBed.inject(BookingStore).bookings().length).toBe(1);
    expect(cells('Tue, Nov 3')[2]).toBe('Choose order');
  });

  it('moves a booking to another order, and lets its location differ from the order', async () => {
    const { pickOrder, row, stable, cells } = await open('/timesheet/2026/11');
    const store = TestBed.inject(BookingStore);
    row('Tue, Nov 3').querySelector<HTMLElement>('app-location-select [ngCombobox]')!.click();
    await stable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((o) => o.textContent?.trim() === 'Reply')!
      .click();
    await stable();
    expect(store.find('mapping', '2026-11-03')?.location).toBe('reply');

    await pickOrder('Tue, Nov 3', 'risk review');
    expect(store.onDay('mapping', '2026-11-03')).toBe(0);
    expect(store.find('review', '2026-11-03')).toMatchObject({ days: 0.5, location: 'reply' });
    expect(cells('Tue, Nov 3')[3]).toBe('Reply');
  });

  it('keeps a note per day behind an icon, written in a dialog; holidays show in the order picker', async () => {
    // The test DOM has no modal dialogs: opening and closing only set `open`.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
      this.open = false;
    };
    TestBed.inject(DayNoteStore).set([
      { date: '2026-12-01', text: 'Kick-off', updatedAt: '2026-11-07T10:00:00.000Z' },
    ]);
    const { element, row, stable } = await open('/timesheet/2026/12');
    const icon = (day: string) => row(day).querySelector<HTMLButtonElement>('button.note')!;
    // A day with a note: the icon is filled, its tooltip shows the note.
    expect(icon('Tue, Dec 1').classList.contains('has-note')).toBe(true);
    // Hovering it shows the note, rendered from Markdown, in a tooltip.
    icon('Tue, Dec 1').dispatchEvent(new MouseEvent('mouseenter'));
    await stable();
    expect(element.querySelector('.note-tip')?.textContent?.trim()).toBe('Kick-off');
    icon('Tue, Dec 1').dispatchEvent(new MouseEvent('mouseleave'));
    await stable();
    expect(element.querySelector('.note-tip')).toBeNull();
    expect(icon('Wed, Dec 2').classList.contains('has-note')).toBe(false);
    // A click opens the dialog; Ctrl+Enter saves.
    icon('Wed, Dec 2').click();
    await stable();
    const dialog = element.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    // It opens rendered; a click into the note shows its text.
    expect(dialog.querySelector('textarea')).toBeNull();
    dialog.querySelector<HTMLElement>('.rendered')!.click();
    await stable();
    const field = dialog.querySelector('textarea')!;
    field.value = 'Workshop';
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
    await stable();
    expect(TestBed.inject(FakeDatabase).dayNotes.get('2026-12-02')?.text).toBe('Workshop');
    expect(dialog.open).toBe(false);
    expect(icon('Wed, Dec 2').classList.contains('has-note')).toBe(true);
    // The note renders as Markdown.
    icon('Tue, Dec 1').click();
    await stable();
    TestBed.inject(DayNoteStore).set([
      { date: '2026-12-01', text: '**Kick-off**', updatedAt: '2026-11-07T10:00:00.000Z' },
    ]);
    icon('Tue, Dec 1').click();
    await stable();
    expect(dialog.querySelector('.pt-markdown strong')?.textContent).toBe('Kick-off');
    // A public holiday's name stands in the empty order picker.
    expect(
      row('Fri, Dec 25').querySelector('app-order-select .placeholder')?.textContent?.trim(),
    ).toBe('Christmas Day');
  });

  it('books only the working part of December 24 and 31 when an order is picked', async () => {
    const { pickOrder, hours } = await open('/timesheet/2026/12');
    const store = TestBed.inject(BookingStore);
    // Half days off by default: 4 h on the 24th, a full day on the 23rd.
    await pickOrder('Thu, Dec 24', 'risk review');
    await pickOrder('Wed, Dec 23', 'risk review');
    expect(store.onDay('review', '2026-12-24')).toBe(0.5);
    expect(hours('Thu, Dec 24')[0].value).toBe('4');
    expect(store.onDay('review', '2026-12-23')).toBe(1);
  });

  it('greys out weekends and public holidays', async () => {
    const { row } = await open('/timesheet/2026/12');
    // Christmas Day is a Friday.
    const off = ['Thu, Dec 24', 'Fri, Dec 25', 'Sat, Dec 26', 'Sun, Dec 27', 'Mon, Dec 28'].map(
      (day) => row(day).classList.contains('off'),
    );
    expect(off).toEqual([false, true, true, true, false]);
  });

  it('locks a month against changes and unlocks it again', async () => {
    const { element, hours, type, stable } = await open('/timesheet/2026/11');
    const lock = element.querySelector<HTMLButtonElement>('button.lock')!;
    expect(lock.getAttribute('aria-pressed')).toBe('false');

    lock.click();
    await stable();
    expect(lock.getAttribute('aria-pressed')).toBe('true');
    expect(TestBed.inject(FakeDatabase).settings.lockedMonths).toEqual(['2026-11']);
    const monday = hours('Mon, Nov 2')[0];
    expect(monday.readOnly).toBe(true);
    expect(element.querySelector('.row-action')).toBeNull();
    // Even a change that slips through is undone while the month is locked.
    await type(monday, '4');
    expect(TestBed.inject(BookingStore).onDay('mapping', '2026-11-02')).toBe(1);
    expect(monday.value).toBe('8');

    lock.click();
    await stable();
    expect(TestBed.inject(FakeDatabase).settings.lockedMonths).toEqual([]);
    expect(monday.readOnly).toBe(false);
  });

  it('sums up the month below the days', async () => {
    const { element } = await open('/timesheet/2026/11');
    const cells = [...element.querySelectorAll('.pt-row--total .pt-cell')].map((c) =>
      c.textContent?.trim(),
    );
    expect(cells).toEqual(['Σ', '12', '', '', '1.5', '2', '+8.5 d', '', '']);
  });

  it('steps to the month before and after, across the turn of the year', async () => {
    const { harness, element } = await open('/timesheet/2026/1');
    const router = TestBed.inject(Router);
    element.querySelector<HTMLAnchorElement>('a[aria-label="Previous: December 2025"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/timesheet/2025/12');
    expect(TestBed.inject(SelectedYear).year()).toBe(2025);
  });

  it('steps only within the years the year switcher offers', async () => {
    // The orders run from 2025 to 2026, so January 2027 is out of reach.
    const { element } = await open('/timesheet/2026/12');
    const next = element.querySelector<HTMLButtonElement>('[aria-label="Next: January 2027"]')!;
    expect(next.tagName).toBe('BUTTON');
    expect(next.disabled).toBe(true);
  });

  it('jumps from a typed month outside the years on offer to the closest one', async () => {
    const { harness } = await open('/timesheet/2030/6');
    await harness.fixture.whenStable();
    const router = TestBed.inject(Router);
    expect(router.url).toBe('/timesheet/2026/12');
    expect(TestBed.inject(SelectedYear).year()).toBe(2026);

    await harness.navigateByUrl('/timesheet/2019/6');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/timesheet/2025/1');
  });

  it('goes back to this month, and offers it only from another month', async () => {
    const { harness, element } = await open('/timesheet/2025/2');
    const button = () => element.querySelector<HTMLButtonElement>('button.this-month')!;
    expect(button().textContent?.trim()).toBe('This month');
    expect(button().disabled).toBe(false);
    button().click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/timesheet/2026/11');
    expect(button().disabled).toBe(true);
  });

  it('shows the same month of the year picked in the top bar', async () => {
    const { harness } = await open('/timesheet/2026/11');
    const selected = TestBed.inject(SelectedYear);
    selected.previous();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/timesheet/2025/11');
  });

  it('marks today’s day blue, and its stripe while no project is chosen', async () => {
    const { row } = await open('/timesheet/2026/11');
    const today = row('Sat, Nov 7');
    expect(today.classList).toContain('today');
    expect(today.style.getPropertyValue('--row-color')).toBe('');
  });

  it('shows the project color lighter on days after today', async () => {
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'review', date: '2026-11-06', days: 1 },
      { id: 'b2', orderId: 'review', date: '2026-11-07', days: 1 },
      { id: 'b3', orderId: 'review', date: '2026-11-09', days: 1 },
    ]);
    const { row } = await open('/timesheet/2026/11');
    expect(row('Fri, Nov 6').classList).not.toContain('future');
    expect(row('Sat, Nov 7').classList).not.toContain('future');
    expect(row('Mon, Nov 9').classList).toContain('future');
    // A day without a project has no color to lighten.
    expect(row('Tue, Nov 10').classList).not.toContain('future');
  });

  it('opens the current month from the timesheet link', async () => {
    await open('/timesheet');
    expect(TestBed.inject(Router).url).toBe('/timesheet/2026/11');
  });

  it('copies the last booked day to the first free working day with +', async () => {
    const { stable } = await open('/timesheet/2026/11');
    const plus = () =>
      TestBed.inject(Shortcuts).handle(
        new KeyboardEvent('keydown', { key: '+', cancelable: true }),
      );
    const store = TestBed.inject(BookingStore);
    await store.book('mapping', '2026-11-03', 0.5, 'onsite');
    await stable();

    plus();
    await stable();
    expect(store.find('mapping', '2026-11-04')).toMatchObject({ days: 0.5, location: 'onsite' });
    // No field takes the cursor, so + can be pressed again.
    expect(document.activeElement).not.toBeInstanceOf(HTMLInputElement);

    // Nov 4 is now the last booked day; its order ends that day, so there is nothing to copy.
    plus();
    await stable();
    expect(store.bookings().filter((b) => b.date === '2026-11-05')).toEqual([]);
  });

  it('deselects everything with Escape, also from the hours', async () => {
    const { hours, stable } = await open('/timesheet/2026/11');
    const shortcuts = TestBed.inject(Shortcuts);
    const escape = (target: EventTarget) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true,
        bubbles: true,
      });
      const handle = (e: Event) => shortcuts.handle(e as KeyboardEvent);
      document.addEventListener('keydown', handle);
      target.dispatchEvent(event);
      document.removeEventListener('keydown', handle);
      return event;
    };
    const field = hours('Wed, Nov 4')[0];
    field.focus();
    await stable();
    expect(document.activeElement).toBe(field);

    expect(escape(field).defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(field);
    expect(document.getSelection()?.rangeCount ?? 0).toBe(0);
  });
});
