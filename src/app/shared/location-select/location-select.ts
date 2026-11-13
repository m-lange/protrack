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
import { LOCATIONS } from '../../core/categories';
import { Location } from '../../core/data/model';
import { STRINGS } from '../../i18n/strings';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Picks a work location in a table row: drawn as the location's chip with its icon (the chip
 * select of InlineInput), the list shows every location as its chip. Works with `[formField]`.
 * The list floats over the page (anchored to the chip), so tables don't cut it off.
 */
@Component({
  selector: 'app-location-select',
  imports: [Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, Icon],
  templateUrl: './location-select.html',
  styleUrl: './location-select.css',
  host: { '[style.--anchor]': 'anchor' },
})
export class LocationSelect implements FormValueControl<Location> {
  protected readonly t = inject(STRINGS);
  protected readonly locations = LOCATIONS;

  readonly value = model<Location>('onsite');
  readonly invalid = input(false);
  /** Shows the location without letting it change, as in a locked timesheet month. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The accessible name of the control, such as "Location of Data model & mapping". */
  readonly label = input('');
  readonly touch = output<void>();

  /** The CSS anchor that ties the list to this chip. */
  protected readonly anchor = `--location-select-${nextId++}`;
  protected readonly expanded = signal(false);
  protected readonly current = computed(
    () => LOCATIONS.find((l) => l.id === this.value()) ?? LOCATIONS[0],
  );
  protected readonly selection = computed(() => [this.value()]);

  /** Takes the location picked in the list (Enter, Space or a click) and closes the list. */
  protected pick(ids: Location[]): void {
    if (ids[0]) this.value.set(ids[0]);
    this.expanded.set(false);
  }
}
