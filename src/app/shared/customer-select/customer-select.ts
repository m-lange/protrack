import {
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { FormValueControl } from '@angular/forms/signals';
import { CustomerStore } from '../../core/data/customer-store';
import { CustomerBadge } from '../customer-badge/customer-badge';
import { Icon } from '../icon/icon';

/**
 * Picks a customer from a dropdown that shows each customer's badge (logo or initials) beside
 * its name, which a native select can't. Works with `[formField]`; its value is the customer id.
 * Built on Angular Aria's combobox and listbox for keyboard use and screen readers.
 */
@Component({
  selector: 'app-customer-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, CustomerBadge, Icon],
  templateUrl: './customer-select.html',
  styleUrl: './customer-select.css',
})
export class CustomerSelect implements FormValueControl<string> {
  protected readonly customers = inject(CustomerStore).customers;

  /** The id of the chosen customer, or '' for none. */
  readonly value = model('');
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Shown while no customer is chosen. */
  readonly placeholder = input('');
  /** The accessible name of the control, usually the field label. */
  readonly label = input('');
  /** The id of a hint that describes the control, such as an error message. */
  readonly describedBy = input<string | null>(null);
  readonly touch = output<void>();

  protected readonly expanded = signal(false);
  protected readonly selected = computed(() =>
    this.customers().find((customer) => customer.id === this.value()),
  );
  /** The listbox selection: the chosen customer. */
  protected readonly selection = computed(() => (this.value() ? [this.value()] : []));

  /** Takes the customer picked in the list (Enter, Space or a click) and closes the list. */
  protected pick(ids: string[]): void {
    const id = ids[0];
    if (id) this.value.set(id);
    this.expanded.set(false);
  }
}
