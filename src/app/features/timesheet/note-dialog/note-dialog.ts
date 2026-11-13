import {
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { STRINGS } from '../../../i18n/strings';
import { Icon } from '../../../shared/icon/icon';
import { renderMarkdown } from '../../../shared/markdown';

/** A day's note as the dialog hands it back: blank text deletes the note. */
export interface NoteChange {
  /** ISO date. */
  date: string;
  text: string;
}

/**
 * Writes or reads the note of a day in My timesheet, in a modal dialog (user, 2026-11-10). The
 * note is Markdown: it opens rendered; a click into it switches to its text, a click outside
 * renders it again. OK saves, Cancel (or Escape) leaves it as it was; Ctrl+Enter saves too. In a
 * locked month it only shows the note.
 */
@Component({
  selector: 'app-note-dialog',
  imports: [Icon],
  templateUrl: './note-dialog.html',
  styleUrl: './note-dialog.css',
})
export class NoteDialog {
  protected readonly t = inject(STRINGS);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly field = viewChild<ElementRef<HTMLTextAreaElement>>('field');

  readonly saved = output<NoteChange>();

  protected readonly date = signal('');
  /** The day as the title shows it: "Tue, Nov 3". */
  protected readonly label = signal('');
  /** The note as it is being written; saved only with OK. */
  protected readonly draft = signal('');
  protected readonly readOnly = signal(false);
  /** Writing the text (true) or reading it rendered (false). */
  protected readonly editing = signal(false);

  /**
   * The note rendered from Markdown, line breaks kept. [innerHTML] runs it through Angular's
   * sanitizer, so scripts and handlers in a note never run.
   */
  protected readonly html = computed(() => renderMarkdown(this.draft()));

  open(date: string, label: string, text: string, readOnly: boolean): void {
    this.date.set(date);
    this.label.set(label);
    this.draft.set(text);
    this.readOnly.set(readOnly);
    this.editing.set(false);
    this.dialog().nativeElement.showModal();
  }

  /** A click (or Enter) on the rendered note shows its text to write in. */
  protected edit(): void {
    if (this.readOnly()) return;
    this.editing.set(true);
    afterNextRender(
      () => {
        const field = this.field()?.nativeElement;
        if (!field) return;
        field.focus();
        field.setSelectionRange(field.value.length, field.value.length);
      },
      { injector: this.injector },
    );
  }

  /** Leaving the text renders it again; the text stays as typed until OK or Cancel. */
  protected render(field: HTMLTextAreaElement): void {
    this.draft.set(field.value);
    this.editing.set(false);
  }

  protected cancel(): void {
    this.dialog().nativeElement.close();
  }

  protected ok(): void {
    const field = this.field()?.nativeElement;
    if (field) this.draft.set(field.value);
    if (!this.readOnly()) this.saved.emit({ date: this.date(), text: this.draft() });
    this.dialog().nativeElement.close();
  }

  /** Ctrl+Enter (Cmd+Enter) saves; Enter starts a new line. */
  protected keys(event: KeyboardEvent): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.ok();
    }
  }
}
