import { InjectionToken, inject } from '@angular/core';
import { en } from './en';
import { Language } from './language';

/** The shape every language file must have: the English file is the reference. */
export type Strings = typeof en;

/**
 * The texts of the app in the language picked in Settings (see Language). Components use
 * `protected readonly t = inject(STRINGS)` and read `t.settings.title` in templates.
 */
export const STRINGS = new InjectionToken<Strings>('STRINGS', {
  providedIn: 'root',
  factory: () => inject(Language).strings,
});
