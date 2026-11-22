import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SelectedYear } from './selected-year';

/**
 * What a page does on its keys. A page that sets an action replaces the default; without one,
 * Page up / Page down step the year from the top bar and "." opens My timesheet at today.
 */
export interface PageActions {
  /** Page up: the year before; My timesheet shows the month before. */
  previous?: () => void;
  /** Page down: the year after; My timesheet shows the month after. */
  next?: () => void;
  /** ".": today's month in My timesheet, from any page; nothing selected (user, 2026-11-19). */
  today?: () => void;
  /** "n": a new account or project. */
  create?: () => void;
  /** "+": My timesheet copies the month's last booked day to its first free one. */
  copy?: () => void;
  /** Ctrl+S: saves the edit page, also while typing in it. */
  save?: () => void;
  /** Escape: leaves the edit page without saving; My timesheet deselects everything. */
  cancel?: () => void;
  /** Page up and Page down work in text fields too (the hours of My timesheet). */
  stepFromFields?: boolean;
  /** Escape works in text fields too (the hours of My timesheet). */
  cancelFromFields?: boolean;
}

/** The pages "g" and a letter go to (user, 2026-11-13). */
const GO_TO: Record<string, { link: string; resetYear?: boolean }> = {
  h: { link: '/' },
  t: { link: '/timesheet' },
  y: { link: '/year', resetYear: true },
  p: { link: '/projects' },
  f: { link: '/projects/forecast' },
  r: { link: '/projects/archive' },
  a: { link: '/customers' },
  s: { link: '/settings' },
};

/** How long "g" waits for its letter. */
const SEQUENCE_MS = 1500;

/**
 * The keyboard shortcuts of the app (user, 2026-11-13): "g" then a letter goes to a page, "?"
 * lists the shortcuts, the other keys act on the page (see PageActions). Single keys only count
 * outside text fields, lists and open dialogs, so they never get in the way of typing.
 */
@Injectable({ providedIn: 'root' })
export class Shortcuts {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly selectedYear = inject(SelectedYear);

  /** The pages that set actions, the latest last. */
  private readonly pages: PageActions[] = [];
  private goPressedAt = 0;

  /** Whether the list of shortcuts shows. */
  readonly helpOpen = signal(false);

  /** Sets the actions of a page while it shows. Call it in the page's constructor. */
  use(actions: PageActions): void {
    this.pages.push(actions);
    inject(DestroyRef).onDestroy(() => {
      const index = this.pages.indexOf(actions);
      if (index >= 0) this.pages.splice(index, 1);
    });
  }

  /** The app's keydown handler, on the document. */
  handle(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    const page = this.pages.at(-1) ?? {};
    const dialogOpen = !!this.document.querySelector('dialog[open]');

    // Ctrl+S saves the edit page, also from inside its fields.
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
      if (page.save && !dialogOpen) {
        event.preventDefault();
        page.save();
      }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || dialogOpen) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      this.step(event, page, target);
      return;
    }
    if (
      event.key === 'Escape' &&
      page.cancel &&
      page.cancelFromFields &&
      target instanceof HTMLInputElement &&
      !inList(target)
    ) {
      event.preventDefault();
      page.cancel();
      return;
    }
    if (isField(target) || inList(target) || event.repeat) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    const afterGo = this.goPressedAt > 0 && Date.now() - this.goPressedAt < SEQUENCE_MS;
    this.goPressedAt = 0;
    if (afterGo) this.goTo(event, key);
    else this.pageKey(event, key, page);
  }

  /**
   * Page up and Page down: the page's own step, else the year before or after; with Shift always
   * the year. From a text field only where the page asks for it.
   */
  private step(event: KeyboardEvent, page: PageActions, target: HTMLElement | null): void {
    if (inList(target) || target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLSelectElement || target?.isContentEditable) return;
    if (target instanceof HTMLInputElement) {
      if (!page.stepFromFields) return;
      target.blur();
    }
    event.preventDefault();
    const back = event.key === 'PageUp';
    const year = back ? () => this.selectedYear.previous() : () => this.selectedYear.next();
    const own = back ? page.previous : page.next;
    (event.shiftKey ? year : (own ?? year))();
  }

  /** The letter after "g": goes to its page. */
  private goTo(event: KeyboardEvent, key: string): void {
    const to = GO_TO[key];
    if (!to) return;
    event.preventDefault();
    if (to.resetYear) this.selectedYear.reset();
    void this.router.navigateByUrl(to.link);
  }

  /** The single keys: "g" starts a sequence, "?" lists the shortcuts, the rest act on the page. */
  private pageKey(event: KeyboardEvent, key: string, page: PageActions): void {
    switch (key) {
      case 'g':
        if (event.shiftKey) return;
        this.goPressedAt = Date.now();
        event.preventDefault();
        return;
      case '?':
        event.preventDefault();
        this.helpOpen.set(true);
        return;
      case '.':
        event.preventDefault();
        if (page.today) page.today();
        else void this.router.navigateByUrl('/timesheet');
        return;
      case 'n':
        if (!page.create || event.shiftKey) return;
        event.preventDefault();
        page.create();
        return;
      case '+':
        if (!page.copy) return;
        event.preventDefault();
        page.copy();
        return;
      case 'Escape':
        if (!page.cancel) return;
        event.preventDefault();
        page.cancel();
        return;
    }
  }
}

/** Fields that take typed text or choices. */
function isField(target: HTMLElement | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    !!target?.isContentEditable
  );
}

/** Lists and menus that use the keys themselves. */
function inList(target: HTMLElement | null): boolean {
  return !!target?.closest('[role="combobox"], [role="listbox"], [role="menu"], [role="slider"]');
}
