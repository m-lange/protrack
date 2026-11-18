import { projectColor } from '../../../core/categories';
import { OrderBookings } from '../../../core/data/booking-store';
import { Customer, Project } from '../../../core/data/model';
import { runsBetween } from '../../../core/data/orders';

/** A row of the budget overview. Days are person-days; widths are percent. */
export interface BudgetRow {
  id: string;
  name: string;
  customer: string;
  color: string;
  budget: number;
  booked: number;
  remaining: number;
  /** The budget's bar, relative to the largest budget or booking of all rows. */
  budgetWidth: number;
  /** The booked days' bar on the same scale: longer than the budget's when over budget. */
  bookedWidth: number;
}

/**
 * The active PO-restricted projects with the budget of their orders that run in the year and all
 * days booked on those orders, by customer order and project name. Projects without such an order
 * are left out (user, 2026-11-16). Open-booking projects have no budget.
 */
export function budgetRows(
  year: number,
  customers: readonly Customer[],
  projects: readonly Project[],
  bookingsOf: (orderId: string) => OrderBookings,
): BudgetRow[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const rows = projects
    .filter((p) => p.status === 'active' && p.booking === 'po')
    .map((project) => ({
      project,
      orders: project.orders.filter((o) => runsBetween(o, `${year}-01-01`, `${year}-12-31`)),
    }))
    .filter(({ orders }) => orders.length > 0)
    .map(({ project, orders }) => {
      const budget = orders.reduce((sum, o) => sum + (o.budget ?? 0), 0);
      const booked = orders.reduce((sum, o) => sum + bookingsOf(o.id).total, 0);
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
    budgetWidth: percent(budget, scale),
    bookedWidth: percent(booked, scale),
  }));
}
