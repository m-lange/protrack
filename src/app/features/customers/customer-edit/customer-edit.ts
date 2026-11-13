import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { FormField, FormRoot, form, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { CustomerStore } from '../../../core/data/customer-store';
import { Shortcuts } from '../../../core/shortcuts';
import { ProjectStore } from '../../../core/data/project-store';
import { STRINGS } from '../../../i18n/strings';
import { CustomerBadge } from '../../../shared/customer-badge/customer-badge';
import { Icon } from '../../../shared/icon/icon';
import { LogoImportDialog } from '../logo-import-dialog/logo-import-dialog';
import { LogoError, LogoProblem, readLogo } from '../logo-file';

/** Adds a customer (no id) or edits one (id from the route): its name and logo. */
@Component({
  selector: 'app-customer-edit',
  imports: [FormField, FormRoot, RouterLink, CustomerBadge, Icon, LogoImportDialog],
  templateUrl: './customer-edit.html',
  styleUrl: './customer-edit.css',
})
export class CustomerEdit {
  private readonly store = inject(CustomerStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly t = inject(STRINGS);

  constructor() {
    // Ctrl+S saves like the Save button; Escape leaves like Cancel.
    inject(Shortcuts).use({
      save: () =>
        this.host.nativeElement.querySelector<HTMLFormElement>('#customer-form')?.requestSubmit(),
      cancel: () => void this.router.navigate(['/customers']),
    });
  }

  /** The customer's id from the route; absent for a new customer. */
  readonly id = input<string>();

  protected readonly isNew = computed(() => !this.id());
  protected readonly customer = computed(() => {
    const id = this.id();
    return id ? this.store.get(id) : undefined;
  });
  protected readonly missing = computed(() => !this.isNew() && !this.customer());
  /** A customer with projects can't be deleted: its projects would lose their customer. */
  protected readonly hasProjects = computed(
    () => (this.projectCounts().get(this.id() ?? '') ?? 0) > 0,
  );
  private readonly projectCounts = inject(ProjectStore).countByCustomer;

  protected readonly model = linkedSignal(() => ({ name: this.customer()?.name ?? '' }));
  protected readonly logo = linkedSignal(() => this.customer()?.logo ?? null);
  protected readonly logoError = signal<LogoProblem | null>(null);
  protected readonly dragging = signal(false);
  protected readonly confirmingDelete = signal(false);

  protected readonly customerForm = form(
    this.model,
    (path) => {
      required(path.name, { message: this.t.customerEdit.nameRequired });
      validate(path.name, ({ value }) => {
        const name = value().trim().toLocaleLowerCase();
        const id = this.id();
        const taken = this.store
          .customers()
          .some((c) => c.id !== id && c.name.toLocaleLowerCase() === name);
        return taken
          ? { kind: 'duplicate', message: this.t.customerEdit.nameTaken(value().trim()) }
          : undefined;
      });
    },
    {
      submission: {
        action: async () => {
          const draft = { name: this.model().name, logo: this.logo() };
          const id = this.id();
          if (id) {
            await this.store.update(id, draft);
          } else {
            await this.store.create(draft);
          }
          await this.router.navigate(['/customers']);
          return undefined;
        },
      },
    },
  );

  /** The name in the header, live as it is typed; else the saved name or "New customer". */
  protected readonly title = computed(
    () => this.model().name.trim() || this.customer()?.name || this.t.customerEdit.newTitle,
  );
  /** The name the initials come from: the typed name, or the saved one while the field is empty. */
  protected readonly badgeName = computed(
    () => this.model().name.trim() || this.customer()?.name || '',
  );

  protected readonly nameError = computed(() => {
    const field = this.customerForm.name();
    return field.touched() ? field.errors()[0]?.message : undefined;
  });

  protected async pickLogo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.useLogo(file);
  }

  protected async dropLogo(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) await this.useLogo(file);
  }

  protected dragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  /** Leaving the drop zone, not just moving onto one of its children. */
  protected dragLeave(event: DragEvent): void {
    const zone = event.currentTarget as HTMLElement;
    if (!zone.contains(event.relatedTarget as Node | null)) this.dragging.set(false);
  }

  /** Takes the logo found on the customer's website. */
  protected importLogo(logo: string): void {
    this.logo.set(logo);
    this.logoError.set(null);
  }

  protected removeLogo(): void {
    this.logo.set(null);
    this.logoError.set(null);
  }

  protected async delete(): Promise<void> {
    const id = this.id();
    if (!id || this.hasProjects()) return;
    await this.store.remove(id);
    await this.router.navigate(['/customers']);
  }

  private async useLogo(file: File): Promise<void> {
    try {
      this.logo.set(await readLogo(file));
      this.logoError.set(null);
    } catch (error) {
      this.logoError.set(error instanceof LogoError ? error.problem : 'unreadable');
    }
  }
}
