import { Component, inject, input } from '@angular/core';
import { STRINGS, Strings } from '../../i18n/strings';

/** A page of the navigation, by its key in the strings file (`nav`). */
export type PageKey = keyof Strings['nav'];

/** Stands in for a page that is not built yet. The page comes from the route's data. */
@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.html',
  styleUrl: './placeholder.css',
})
export class Placeholder {
  protected readonly t = inject(STRINGS);
  readonly page = input.required<PageKey>();
}
