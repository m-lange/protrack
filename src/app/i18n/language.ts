import { DOCUMENT, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { Injectable, effect, inject, untracked } from '@angular/core';
import { Backup } from '../core/backup/backup';
import { LanguageCode } from '../core/data/model';
import { SettingsStore } from '../core/data/settings-store';
import { setDecimalSeparator } from '../shared/pipes/days';
import { de } from './de';
import { en } from './en';
import type { Strings } from './strings';

/** What each language brings: its texts, the locale of Angular's date pipes, its decimal sign. */
const LANGUAGES: Record<LanguageCode, { strings: Strings; locale: string; decimal: string }> = {
  en: { strings: en, locale: 'en-US', decimal: '.' },
  de: { strings: de, locale: 'de', decimal: ',' },
};

registerLocaleData(localeDe);

/**
 * The language of the UI, from Settings. It is fixed while the app runs: texts, LOCALE_ID and
 * the decimal sign are taken once, and a change of language in Settings (or by an import or a
 * restore) saves the backup and reloads the app.
 *
 * Created by the app initializer right after the data is loaded (app.config.ts), so it reads
 * the stored language, not the default.
 */
@Injectable({ providedIn: 'root' })
export class Language {
  private readonly settings = inject(SettingsStore).settings;
  private readonly backup = inject(Backup);
  private readonly document = inject(DOCUMENT);

  readonly code: LanguageCode = untracked(this.settings).language;
  readonly strings = LANGUAGES[this.code].strings;
  /** For LOCALE_ID: date formats, month and day names. */
  readonly locale = LANGUAGES[this.code].locale;

  constructor() {
    setDecimalSeparator(LANGUAGES[this.code].decimal);
    this.document.documentElement.lang = this.code;

    // Reload when the language changes. Only a change counts: should the stored language
    // differ from the running one from the start, reloading would not help and would loop.
    let previous: LanguageCode | null = null;
    effect(() => {
      const wanted = this.settings().language;
      const changed = previous !== null && wanted !== previous;
      previous = wanted;
      if (changed && wanted !== this.code) untracked(() => void this.reload());
    });
  }

  /** Saves the backup file first, so the reload doesn't drop the change of language. */
  private async reload(): Promise<void> {
    if (this.backup.connected()) {
      await this.backup.saveNow().catch((error) => console.error(error));
    }
    this.document.defaultView?.location.reload();
  }
}
