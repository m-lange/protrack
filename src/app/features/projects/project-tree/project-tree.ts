import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BILLING, LOCATIONS, category, projectColor } from '../../../core/categories';
import { BookingStore } from '../../../core/data/booking-store';
import { CustomerStore } from '../../../core/data/customer-store';
import { Order, ProjectStatus } from '../../../core/data/model';
import { ProjectStore } from '../../../core/data/project-store';
import { CustomerNode, ProjectNode, buildTree, spanOf, sum } from '../../../core/data/tree';
import { STRINGS } from '../../../i18n/strings';
import { CustomerBadge } from '../../../shared/customer-badge/customer-badge';
import { Icon } from '../../../shared/icon/icon';
import { DateRangePipe } from '../../../shared/pipes/date-range-pipe';
import { DaysPipe } from '../../../shared/pipes/days-pipe';
import { DeltaPipe, deltaChip } from '../../../shared/pipes/delta-pipe';
import { openOrder } from '../../../core/data/open-booking';
import { Timeline, timelineOf } from '../../../core/data/orders';
import { TimelinePill } from '../../../shared/timeline-pill/timeline-pill';
import { TreeState, customerKey, projectKey } from '../tree-state';

/**
 * Budget and booked days of a row. `spent` is the part of `booked` on orders with a budget:
 * Remaining counts only that, so open-booking orders leave it out.
 */
interface Figures {
  budget: number;
  booked: number;
  spent: number;
}

interface OrderRow {
  order: Order;
  figures: Figures;
}

interface ProjectRow {
  node: ProjectNode;
  color: string;
  figures: Figures;
  orders: OrderRow[];
}

interface CustomerRow {
  node: CustomerNode;
  figures: Figures;
  projects: ProjectRow[];
}

interface Table {
  customers: CustomerRow[];
  projectCount: number;
  figures: Figures;
  span: Timeline | null;
}

/**
 * The Projects and Archive tabs of My projects: the customer › project › order tree with
 * timeline, location, billing, budget and remaining days, of the active projects (Projects) or the
 * completed ones (Archive, user 2026-11-10). Customers and projects collapse.
 */
@Component({
  selector: 'app-project-tree',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    CustomerBadge,
    DateRangePipe,
    DaysPipe,
    DeltaPipe,
    Icon,
    TimelinePill,
  ],
  templateUrl: './project-tree.html',
  styleUrl: './project-tree.css',
})
export class ProjectTree {
  protected readonly t = inject(STRINGS);
  protected readonly tree = inject(TreeState);
  private readonly customers = inject(CustomerStore).customers;
  private readonly store = inject(ProjectStore);
  private readonly projects = this.store.projects;
  private readonly bookings = inject(BookingStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** The project being dragged (with its customer) and the one it is over. */
  protected readonly dragged = signal<{ id: string; customerId: string } | null>(null);
  protected readonly over = signal<string | null>(null);

  /** Which projects the tab shows; set by the route (Projects: active, Archive: completed). */
  readonly status = input<ProjectStatus>('active');

  protected readonly customerKey = customerKey;
  protected readonly projectKey = projectKey;

  /**
   * The tab's projects. The active ones come with the customers that have no project yet, so
   * projects can be added to them.
   */
  protected readonly table = computed<Table>(() => {
    const status = this.status();
    const nodes = buildTree(this.customers(), this.projects(), status, {
      withEmptyCustomers: status === 'active',
    });
    const customers = nodes.map((node) => this.customerRow(node));
    return {
      customers,
      projectCount: sum(customers.map((c) => c.projects.length)),
      figures: total(customers.map((c) => c.figures)),
      span: spanOf(nodes.flatMap((n) => (n.span ? [n.span] : []))),
    };
  });

  protected readonly timelineOf = timelineOf;
  protected readonly deltaChip = deltaChip;
  protected readonly openOrder = openOrder;

  /** The ids of a customer's projects as the table shows them, the siblings a project moves among. */
  protected siblings(row: CustomerRow): string[] {
    return row.projects.map((p) => p.node.project.id);
  }

  /**
   * Moves a project one place up or down among its customer's projects (user, 2026-11-10, like
   * My customers). The focus stays on the arrow, so it can be moved on with the keyboard.
   */
  protected async move(id: string, step: -1 | 1, row: CustomerRow): Promise<void> {
    await this.store.move(id, step, this.siblings(row));
    const direction = step < 0 ? 'up' : 'down';
    afterNextRender(
      () => {
        const root = this.host.nativeElement.ownerDocument;
        const button =
          root.querySelector<HTMLButtonElement>(
            `[data-move="${id}-${direction}"]:not(:disabled)`,
          ) ?? root.querySelector<HTMLButtonElement>(`[data-move^="${id}-"]:not(:disabled)`);
        button?.focus();
      },
      { injector: this.injector },
    );
  }

  protected dragStart(event: DragEvent, id: string, customerId: string): void {
    this.dragged.set({ id, customerId });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    }
  }

  /** A project drops only among the projects of its own customer. */
  protected dragOver(event: DragEvent, id: string, customerId: string): void {
    if (this.dragged()?.customerId !== customerId) return;
    event.preventDefault();
    this.over.set(id);
  }

  protected async drop(event: DragEvent, id: string, row: CustomerRow): Promise<void> {
    event.preventDefault();
    const dragged = this.dragged();
    this.dragEnd();
    if (dragged && dragged.customerId === row.node.customer.id) {
      await this.store.moveTo(dragged.id, id, this.siblings(row));
    }
  }

  protected dragEnd(): void {
    this.dragged.set(null);
    this.over.set(null);
  }

  protected location(order: Order) {
    return LOCATIONS.find((l) => l.id === order.location) ?? LOCATIONS[0];
  }

  protected billing(row: ProjectRow) {
    return category(BILLING, row.node.project.billing);
  }

  private customerRow(node: CustomerNode): CustomerRow {
    const projects = node.projects.map((projectNode): ProjectRow => {
      const orders = projectNode.orders.map((order) => {
        const booked = this.bookings.of(order.id).total;
        return {
          order,
          figures: {
            budget: order.budget ?? 0,
            booked,
            spent: order.budget === null ? 0 : booked,
          },
        };
      });
      return {
        node: projectNode,
        color: projectColor(projectNode.project.color),
        figures: total(orders.map((o) => o.figures)),
        orders,
      };
    });
    return { node, projects, figures: total(projects.map((p) => p.figures)) };
  }
}

function total(rows: readonly Figures[]): Figures {
  return {
    budget: sum(rows.map((r) => r.budget)),
    booked: sum(rows.map((r) => r.booked)),
    spent: sum(rows.map((r) => r.spent)),
  };
}
