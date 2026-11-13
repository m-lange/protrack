import { Component, booleanAttribute, computed, input, model, signal } from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { Icon } from '../../../shared/icon/icon';

/** An order a timesheet row can be booked on. */
export interface OrderOption {
  id: string;
  /** The project's id: a thin line sets the orders of one project apart from the next. */
  projectId: string;
  /** The project's name, shown before the order's. */
  project: string;
  /** The order's name; empty for an open-booking project, which shows only the project. */
  order: string;
  customer: string;
  /** The project color as a CSS value (see `projectColor`). */
  color: string;
}

let nextId = 0;

/**
 * Picks the order of a timesheet row: shows the project and the order name on one line, after
 * the project's color dot. The list floats over the page (anchored to the control), so the
 * table's frame doesn't cut it off.
 */
@Component({
  selector: 'app-order-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, Icon],
  templateUrl: './order-select.html',
  styleUrl: './order-select.css',
  host: { '[style.--anchor]': 'anchor' },
})
export class OrderSelect {
  /**
   * The orders to choose from, those of one project together; the chosen one should be among
   * them.
   */
  readonly options = input.required<readonly OrderOption[]>();
  /** The id of the chosen order, or null for none. */
  readonly value = model<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shown while no order is chosen. */
  readonly placeholder = input('');
  /** Shown in the list when there is nothing to choose. */
  readonly empty = input('');
  /** The accessible name of the control. */
  readonly label = input('');

  protected readonly anchor = `--order-select-${nextId++}`;
  protected readonly expanded = signal(false);
  protected readonly selected = computed(() => this.options().find((o) => o.id === this.value()));
  protected readonly selection = computed(() => (this.value() ? [this.value()!] : []));

  /** Takes the order picked in the list (Enter, Space or a click) and closes the list. */
  protected pick(ids: string[]): void {
    const id = ids[0];
    if (id && id !== this.value()) this.value.set(id);
    this.expanded.set(false);
  }
}
