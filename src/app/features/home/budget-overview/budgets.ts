import { projectColor } from '../../../core/categories';
import { OrderBookings } from '../../../core/data/booking-store';
import { Customer, Project } from '../../../core/data/model';

/** A row of the budget overview. Days are person-days; widths are percent. */
export interface BudgetRow {
  id: string;
  name: string;
  customer: string;
  color: string;
  budget: number;
  booked: number;
  remaining: number;
  /** The budget track, relative to the largest budget or booking of all rows. */
  trackWidth: number;
  /** The booked days within the track, up to 100. */
  fillWidth: number;
  /** The days over budget after the track, relative like the track. */
  overWidth: number;
}

/**
 * The active PO-restricted projects with the budget of all their orders and the days booked on
 * them, by customer order and project name. Open-booking projects have no budget.
 */
export function budgetRows(
  customers: readonly Customer[],
  projects: readonly Project[],
  bookingsOf: (orderId: string) => OrderBookings,
): BudgetRow[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows = projects
    .filter((p) => p.status === 'active' && p.booking === 'po')
    .map((project) => {
      const budget = project.orders.reduce((sum, o) => sum + (o.budget ?? 0), 0);
      const booked = project.orders.reduce((sum, o) => sum + bookingsOf(o.id).total, 0);
      const customer = byId.get(project.customerId);
      return { project, customer, budget, booked };
    })
    .sort(
      (a, b) =>
        (a.customer?.order ?? Infinity) - (b.customer?.order ?? Infinity) ||
        a.project.name.localeCompare(b.project.name, undefined, { sensitivity: 'base' }),
    );
  const scale = Math.max(0, ...rows.map((r) => Math.max(r.budget, r.booked)));
  const percent = (days: number, of: number) => (of > 0 ? (days / of) * 100 : 0);
  return rows.map(({ project, customer, budget, booked }) => ({
    id: project.id,
    name: project.name,
    customer: customer?.name ?? '',
    color: projectColor(project.color),
    budget,
    booked,
    remaining: budget - booked,
    trackWidth: percent(budget, scale),
    fillWidth: Math.min(100, percent(booked, budget)),
    overWidth: percent(Math.max(0, booked - budget), scale),
  }));
}
