import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CustomerStore } from '../../../core/data/customer-store';
import { ProjectStore } from '../../../core/data/project-store';
import { STRINGS } from '../../../i18n/strings';
import { CustomerBadge } from '../../../shared/customer-badge/customer-badge';
import { Icon } from '../../../shared/icon/icon';

/**
 * The customers as tree table rows, in the user's order. Only Settings shows it `editable`:
 * with edit links, an "Add customer" row and a way to change the order, by drag and drop or
 * with the arrow buttons. Customers are added and changed there and nowhere else.
 */
@Component({
  selector: 'app-customer-list',
  imports: [RouterLink, CustomerBadge, Icon],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.css',
})
export class CustomerList {
  private readonly store = inject(CustomerStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly t = inject(STRINGS);

  readonly editable = input(false, { transform: booleanAttribute });

  protected readonly customers = this.store.customers;
  protected readonly projectCounts = inject(ProjectStore).countByCustomer;
  /** The customer being dragged and the one it is over. */
  protected readonly dragged = signal<string | null>(null);
  protected readonly over = signal<string | null>(null);

  protected async move(id: string, step: -1 | 1): Promise<void> {
    await this.store.move(id, step);
    // Keep the focus on the arrow, so the customer can be moved on with the keyboard.
    const direction = step < 0 ? 'up' : 'down';
    afterNextRender(
      () => {
        const button = this.host.nativeElement.querySelector<HTMLButtonElement>(
          `[data-move="${id}-${direction}"]:not(:disabled)`,
        );
        (
          button ??
          this.host.nativeElement.querySelector<HTMLButtonElement>(
            `[data-move^="${id}-"]:not(:disabled)`,
          )
        )?.focus();
      },
      { injector: this.injector },
    );
  }

  protected dragStart(event: DragEvent, id: string): void {
    this.dragged.set(id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  }

  protected dragOver(event: DragEvent, id: string): void {
    if (!this.dragged()) return;
    event.preventDefault();
    this.over.set(id);
  }

  protected async drop(event: DragEvent, id: string): Promise<void> {
    event.preventDefault();
    const dragged = this.dragged();
    this.dragEnd();
    if (dragged) await this.store.moveTo(dragged, id);
  }

  protected dragEnd(): void {
    this.dragged.set(null);
    this.over.set(null);
  }
}
