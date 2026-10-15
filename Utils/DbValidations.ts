import { expect, test } from '@playwright/test';
import { PostgresDb } from './PostgresDb';

/**
 * Rules from the brief that must hold in the database at any time.
 * Each query returns the rows that break the rule, so an empty result is a pass.
 */
export const DB_INVARIANTS: { rule: string; sql: string }[] = [
    {
        rule: 'Flow 9: every unit of a SKU sits in exactly one bucket (buckets add up to opening + adjustments)',
        sql: `
            select c.sku,
                   c.opening_quantity + c.net_external_adjustment as expected_quantity,
                   i.available + i.cart_held + i.reserved_on_shelf + i.reserved_off_shelf + i.outbound
                     + i.customer_held + i.return_in_transit + i.pending_inspection + i.pending_restock
                     + i.written_off as accounted_quantity
            from catalog_items c
            join inventory i on i.sku = c.sku
            where i.available + i.cart_held + i.reserved_on_shelf + i.reserved_off_shelf + i.outbound
                    + i.customer_held + i.return_in_transit + i.pending_inspection + i.pending_restock
                    + i.written_off
                  <> c.opening_quantity + c.net_external_adjustment`,
    },
    {
        rule: 'Flow 9: no stock bucket is negative',
        sql: `
            select * from inventory
            where least(available, cart_held, reserved_on_shelf, reserved_off_shelf, outbound, customer_held,
                        return_in_transit, pending_inspection, pending_restock, written_off) < 0`,
    },
    {
        rule: 'Flow 2: a cart does not hold stock',
        sql: `select sku, cart_held from inventory where cart_held <> 0`,
    },
    {
        rule: 'Flow 3 / rule 1: one cart becomes at most one order',
        sql: `select cart_id, count(*) as orders from orders group by cart_id having count(*) > 1`,
    },
    {
        rule: 'Flow 3: a placed order closes its cart',
        sql: `
            select o.id as order_id, c.id as cart_id, c.status as cart_status
            from orders o
            join carts c on c.id = o.cart_id
            where c.status <> 'CLOSED'`,
    },
    {
        rule: 'Flow 3: an order total is what was bought, frozen at the moment of ordering',
        sql: `
            select o.id, o.total_minor, sum(l.quantity * l.unit_price_minor) as lines_total
            from orders o
            join order_lines l on l.order_id = o.id
            group by o.id, o.total_minor
            having o.total_minor <> sum(l.quantity * l.unit_price_minor)`,
    },
    {
        rule: 'Flow 4: the timeline runs 1..n with no gaps, and placing the order is entry 1',
        sql: `
            select o.id,
                   count(t.id) as entries,
                   min(t.sequence) as first_sequence,
                   max(t.sequence) as last_sequence,
                   (array_agg(t.type order by t.sequence))[1] as first_type
            from orders o
            left join order_timeline t on t.order_id = o.id
            group by o.id
            having count(t.id) = 0
                or min(t.sequence) <> 1
                or max(t.sequence) <> count(t.id)
                or count(distinct t.sequence) <> count(t.id)
                or (array_agg(t.type order by t.sequence))[1] <> 'PLACED'`,
    },
    {
        // the timeline also records non-status events (e.g. ITEMS_REMOVED), so compare with the last status entry
        rule: 'Flow 4: the order status is the last status recorded on its timeline',
        sql: `
            select o.id, o.status, last_status.type as last_status_entry
            from orders o
            join lateral (
                select t.type from order_timeline t
                where t.order_id = o.id
                  and t.type in ('PLACED', 'PACKING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')
                order by t.sequence desc limit 1
            ) last_status on true
            where o.status <> last_status.type`,
    },
    {
        rule: 'Flow 5 / 6: cancelled units stay between 0 and what was ordered, and a cancelled order has every unit cancelled',
        sql: `
            select o.id, o.status, l.id as line_id, l.quantity, l.cancelled_quantity
            from orders o
            join order_lines l on l.order_id = o.id
            where l.cancelled_quantity < 0
               or l.cancelled_quantity > l.quantity
               or (o.status = 'CANCELLED' and l.cancelled_quantity <> l.quantity)`,
    },
    {
        rule: 'Flow 5: a customer cannot have cancelled an order once it was OUT_FOR_DELIVERY',
        sql: `
            select o.id, t.actor, t.type
            from orders o
            join order_timeline t on t.order_id = o.id
            where t.type = 'CANCELLED' and t.actor = 'customer'
              and exists (select 1 from order_timeline before
                          where before.order_id = o.id and before.sequence < t.sequence
                            and before.type in ('OUT_FOR_DELIVERY', 'DELIVERED'))`,
    },
    {
        rule: 'Flow 7: at most three successful whole-order cancellations per customer per store day',
        sql: `
            select customer_id, local_date, count(*) as cancellations
            from cancellation_events
            group by customer_id, local_date
            having count(*) > 3`,
    },
    {
        rule: 'Flow 5 / rule 1: an order is cancelled at most once (a replayed cancel records nothing new)',
        sql: `select order_id, count(*) as cancellations from cancellation_events group by order_id having count(*) > 1`,
    },
    {
        rule: 'Flow 5 / 7: a staff cancel spends no allowance',
        sql: `
            select e.order_id, t.actor
            from cancellation_events e
            join order_timeline t on t.order_id = e.order_id and t.type = 'CANCELLED'
            where t.actor <> 'customer'`,
    },
    {
        rule: 'Flow 8: restock pending never goes below zero or above what was cancelled',
        sql: `
            select id, order_id, quantity, cancelled_quantity, restock_pending
            from order_lines
            where restock_pending < 0 or restock_pending > cancelled_quantity`,
    },
];

/**
 * A snapshot of everything a write can change (idempotency keys excluded, since a refused
 * write may legitimately record its reply). Equal snapshots mean nothing was written.
 */
export async function dbFingerprint(db: PostgresDb): Promise<unknown> {
    return db.queryOne(`
        select
            (select count(*) from carts) as carts,
            (select json_agg(c order by c.id) from (select id, status from carts) c) as cart_states,
            (select json_agg(l order by l.id) from (select id, cart_id, sku, quantity from cart_lines) l) as cart_lines,
            (select json_agg(o order by o.id) from (select id, status, total_minor from orders) o) as orders,
            (select json_agg(l order by l.id) from (select id, cancelled_quantity, restock_pending from order_lines) l) as order_lines,
            (select count(*) from order_timeline) as timeline_entries,
            (select count(*) from cancellation_events) as cancellations,
            (select json_agg(i order by i.sku) from inventory i) as inventory,
            (select json_agg(c order by c.sku) from (select sku, name, price_minor, is_active, net_external_adjustment from catalog_items) c) as catalog,
            (select count(*) from inventory_adjustments) as adjustments`);
}

/** Checks every database invariant and reports each broken rule with the offending rows. */
export async function expectDbInvariants(db: PostgresDb): Promise<void> {
    await test.step('DB: rules from the brief hold in the database', async () => {
        for (const { rule, sql } of DB_INVARIANTS) {
            const violations = await db.query(sql);
            expect.soft(violations, `${rule}\n${JSON.stringify(violations)}`).toEqual([]);
        }
    });
}

/** Checks an order returned by the API against what the database holds for it. */
export async function expectOrderMatchesDb(db: PostgresDb, apiOrder: any, label: string): Promise<void> {
    const row = await db.queryOne<{ status: string; total_minor: number; cart_id: string; customer_id: string }>(
        'select status, total_minor, cart_id, customer_id from orders where id = $1', [apiOrder.id]);
    expect.soft(row, `${label}: order ${apiOrder.id} exists in the database`).toBeDefined();
    if (!row) {
        return;
    }
    expect.soft({ status: row.status, totalMinor: row.total_minor, cartId: row.cart_id, customerId: row.customer_id },
        `${label}: API order matches the database`).toEqual({
        status: apiOrder.status, totalMinor: apiOrder.totalMinor, cartId: apiOrder.cartId, customerId: apiOrder.customerId,
    });

    const lines = await db.query<{ id: string; quantity: number; cancelled_quantity: number; unit_price_minor: number }>(
        'select id, quantity, cancelled_quantity, unit_price_minor from order_lines where order_id = $1 order by position', [apiOrder.id]);
    expect.soft(lines.map(line => ({ id: line.id, quantity: line.quantity, cancelledQuantity: line.cancelled_quantity, unitPriceMinor: line.unit_price_minor })),
        `${label}: API order lines match the database`).toEqual(
        (apiOrder.items ?? []).map((item: any) => ({ id: item.id, quantity: item.quantity, cancelledQuantity: item.cancelledQuantity, unitPriceMinor: item.unitPriceMinor })));
}
