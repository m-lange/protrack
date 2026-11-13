import { OrderBookings } from '../../core/data/booking-store';
import { Customer, MonthKey, Order, Project, ProjectStatus } from '../../core/data/model';
import { runsIn, timelineOf } from '../../core/data/orders';

/** A date range of ISO dates, both days included. */
export interface DateSpan {
  start: string;
  end: string;
}

export interface ProjectNode {
  project: Project;
  /** The orders shown, by start date. */
  orders: Order[];
  span: DateSpan | null;
}

export interface CustomerNode {
  customer: Customer;
  projects: ProjectNode[];
  span: DateSpan | null;
}

export interface TreeOptions {
  /** Only orders that pass are shown; projects without one are left out. */
  orders?: (order: Order, project: Project) => boolean;
  /** Shows customers without any project, so projects can be added to them. */
  withEmptyCustomers?: boolean;
}

/**
 * The customer › project › order tree of one project group: customers in their order, projects
 * by name, orders by start date. Customers without a project in the group are left out.
 */
export function buildTree(
  customers: Customer[],
  projects: Project[],
  status: ProjectStatus | 'all',
  options: TreeOptions = {},
): CustomerNode[] {
  const byCustomer = new Map<string, Project[]>();
  const customerIds = new Set<string>();
  for (const project of projects) {
    customerIds.add(project.customerId);
    if (status !== 'all' && project.status !== status) continue;
    byCustomer.set(project.customerId, [...(byCustomer.get(project.customerId) ?? []), project]);
  }
  const nodes: CustomerNode[] = [];
  for (const customer of customers) {
    const projectNodes: ProjectNode[] = [];
    for (const project of byCustomer.get(customer.id) ?? []) {
      const filter = options.orders;
      const orders = filter ? project.orders.filter((o) => filter(o, project)) : project.orders;
      if (filter && orders.length === 0) continue;
      projectNodes.push({ project, orders, span: spanOf(orders.flatMap(timelineOrNone)) });
    }
    const empty = projectNodes.length === 0;
    if (empty && !(options.withEmptyCustomers && !customerIds.has(customer.id))) continue;
    nodes.push({
      customer,
      projects: projectNodes,
      span: spanOf(projectNodes.flatMap((p) => (p.span ? [p.span] : []))),
    });
  }
  return nodes;
}

/** An order's timeline as a list of none or one, for flatMap. */
function timelineOrNone(order: Order): DateSpan[] {
  const timeline = timelineOf(order);
  return timeline ? [timeline] : [];
}

/** The range from the earliest start to the latest end, or null for none. */
export function spanOf(spans: readonly DateSpan[]): DateSpan | null {
  if (spans.length === 0) return null;
  let { start, end } = spans[0];
  for (const span of spans) {
    if (span.start < start) start = span.start;
    if (span.end > end) end = span.end;
  }
  return { start, end };
}

/** The numbers of a forecast row. */
export interface ForecastFigures {
  /** Per shown month: booked days before the current month, planned days from it on. */
  months: number[];
  /** The sum of `months`. */
  total: number;
  budget: number;
  /**
   * All days of the order's whole timeline, not only the shown year: booked before the
   * current month plus planned from it on.
   */
  outlook: number;
}

/**
 * The forecast row of an order for the given months, seen from the current month. An order
 * without a budget (open booking) has no outlook either: Budget − forecast leaves it out.
 */
export function orderForecast(
  order: Order,
  booked: OrderBookings,
  months: readonly MonthKey[],
  current: MonthKey,
): ForecastFigures {
  const planned = (month: MonthKey) => (runsIn(order, month) ? (order.forecast[month] ?? 0) : 0);
  const values = months.map((month) =>
    month < current ? (booked.byMonth.get(month) ?? 0) : planned(month),
  );
  let outlook = 0;
  if (order.budget !== null) {
    for (const [month, days] of booked.byMonth) if (month < current) outlook += days;
    for (const month of Object.keys(order.forecast))
      if (month >= current) outlook += planned(month);
  }
  return { months: values, total: sum(values), budget: order.budget ?? 0, outlook };
}

/** Adds up forecast rows, for project, customer and total rows. */
export function sumForecasts(rows: readonly ForecastFigures[], length = 12): ForecastFigures {
  return {
    months: Array.from({ length }, (_, i) => sum(rows.map((r) => r.months[i]))),
    total: sum(rows.map((r) => r.total)),
    budget: sum(rows.map((r) => r.budget)),
    outlook: sum(rows.map((r) => r.outlook)),
  };
}

export function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
