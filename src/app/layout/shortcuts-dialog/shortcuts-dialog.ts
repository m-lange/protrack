import { Component, ElementRef, afterRenderEffect, inject, viewChild } from '@angular/core';
import { Shortcuts } from '../../core/shortcuts';
import { STRINGS } from '../../i18n/strings';
import { Icon } from '../../shared/icon/icon';

/** One line of the list: keys held together (mods, joined by "+"), then the keys, any one of them. */
interface Line {
  mods: string[];
  keys: string[];
  text: string;
}

/**
 * The list of keyboard shortcuts, opened with "?" (user, 2026-11-13). A modal card like the note
 * dialog; Escape or the close button closes it.
 */
@Component({
  selector: 'app-shortcuts-dialog',
  imports: [Icon],
  templateUrl: './shortcuts-dialog.html',
  styleUrl: './shortcuts-dialog.css',
})
export class ShortcutsDialog {
  protected readonly t = inject(STRINGS);
  protected readonly shortcuts = inject(Shortcuts);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** "g" then a letter, with the pages named as in the navigation. */
  protected readonly goTo = [
    { key: 'H', text: this.t.nav.home },
    { key: 'T', text: this.t.nav.timesheet },
    { key: 'Y', text: this.t.nav.year },
    { key: 'P', text: this.t.nav.projects },
    { key: 'F', text: this.t.projects.tabForecast },
    { key: 'R', text: this.t.projects.tabArchive },
    { key: 'A', text: this.t.nav.customers },
    { key: 'S', text: this.t.nav.settings },
  ];

  protected readonly onPage: Line[] = [
    {
      mods: [],
      keys: [this.t.shortcuts.keys.pageUp, this.t.shortcuts.keys.pageDown],
      text: this.t.shortcuts.step,
    },
    {
      mods: [this.t.shortcuts.keys.shift],
      keys: [this.t.shortcuts.keys.pageUp, this.t.shortcuts.keys.pageDown],
      text: this.t.shortcuts.stepYear,
    },
    { mods: [], keys: ['.'], text: this.t.shortcuts.today },
    { mods: [], keys: ['+'], text: this.t.shortcuts.copy },
    { mods: [], keys: ['N'], text: this.t.shortcuts.create },
    { mods: [this.t.shortcuts.keys.ctrl], keys: ['S'], text: this.t.shortcuts.save },
    { mods: [], keys: [this.t.shortcuts.keys.escape], text: this.t.shortcuts.cancel },
    { mods: [], keys: ['?'], text: this.t.shortcuts.help },
  ];

  constructor() {
    afterRenderEffect({
      write: () => {
        const dialog = this.dialog().nativeElement;
        const open = this.shortcuts.helpOpen();
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
      },
    });
  }

  protected close(): void {
    this.shortcuts.helpOpen.set(false);
  }
}
