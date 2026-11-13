import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, validate } from '@angular/forms/signals';
import { STRINGS } from '../../../i18n/strings';
import { CustomerBadge } from '../../../shared/customer-badge/customer-badge';
import { Icon } from '../../../shared/icon/icon';
import { LogoError } from '../logo-file';
import { SiteIconError, fetchSiteIcon, imageSize, siteHost } from '../site-icon';

/** Icons below this width look blurry in the logo preview and page headers. */
const SHARP_WIDTH = 96;

/**
 * A dialog that finds a customer's logo on its website (app icon or favicon), shows it and hands
 * it over with `picked` once the user takes it. Open it with `open()`.
 */
@Component({
  selector: 'app-logo-import-dialog',
  imports: [FormField, FormRoot, CustomerBadge, Icon],
  templateUrl: './logo-import-dialog.html',
  styleUrl: './logo-import-dialog.css',
})
export class LogoImportDialog {
  protected readonly t = inject(STRINGS);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** The customer's name, for the initials while there is no icon. */
  readonly name = input.required<string>();
  /** The logo the user took, as a data URL. */
  readonly picked = output<string>();

  protected readonly model = signal({ website: '' });
  protected readonly icon = signal<string | null>(null);
  /** The icon's pixel size, to judge how sharp it is. */
  protected readonly size = signal<{ width: number; height: number } | undefined>(undefined);
  protected readonly sharpWidth = SHARP_WIDTH;
  protected readonly finding = signal(false);
  protected readonly problem = signal<string | null>(null);

  protected readonly lookupForm = form(
    this.model,
    (path) => {
      validate(path.website, ({ value }) =>
        siteHost(value())
          ? undefined
          : { kind: 'address', message: this.t.logoImport.errors.address },
      );
    },
    {
      submission: {
        action: async () => {
          const host = siteHost(this.model().website);
          if (!host) return undefined;
          this.icon.set(null);
          this.size.set(undefined);
          this.problem.set(null);
          this.finding.set(true);
          try {
            const icon = await fetchSiteIcon(host);
            this.size.set(await imageSize(icon));
            this.icon.set(icon);
          } catch (error) {
            this.problem.set(
              error instanceof LogoError
                ? this.t.customerEdit.logoErrors[error.problem]
                : this.t.logoImport.errors[
                    error instanceof SiteIconError ? error.problem : 'unreachable'
                  ],
            );
          } finally {
            this.finding.set(false);
          }
          return undefined;
        },
      },
    },
  );

  protected addressError(): string | undefined {
    const field = this.lookupForm.website();
    return field.touched() ? field.errors()[0]?.message : undefined;
  }

  open(): void {
    this.model.set({ website: '' });
    this.lookupForm().reset();
    this.icon.set(null);
    this.problem.set(null);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  protected use(): void {
    const icon = this.icon();
    if (!icon) return;
    this.picked.emit(icon);
    this.close();
  }
}
