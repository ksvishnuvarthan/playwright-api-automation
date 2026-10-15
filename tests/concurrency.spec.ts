import { randomUUID } from 'crypto';
import { APIRequestContext } from '@playwright/test';
import { CartApi } from '../Apis/CartApi';
import { OrdersApi } from '../Apis/OrdersApi';
import { TestHarnessApi } from '../Apis/TestHarnessApi';
import { knownBugDetails } from '../TestData/KnownBugs';
import { expectDbInvariants } from '../Utils/DbValidations';
import { expect, test } from '../Utils/fixtures';

/**
 * Cases that need requests in flight at the same time, which a list of sequential
 * steps cannot express. Each test starts from the standard fixture.
 */
test.beforeEach(async ({ request }) => {
    expect((await new TestHarnessApi(request, 'TEST_TOKEN').reset({ fixture: 'standard' })).status()).toBe(201);
});

test.afterEach(async ({ db }) => {
    if (db) {
        await expectDbInvariants(db);
    }
});

/** Tags for this test plus the known bugs it fails on (temporary; remove ids once fixed). */
function withBugs(tags: string[], bugs: Parameters<typeof knownBugDetails>[0]) {
    const bugDetails = knownBugDetails(bugs);
    return { tag: [...tags, ...bugDetails.tag], annotation: bugDetails.annotation };
}

async function ordersFromCart(request: APIRequestContext, cartId: string, token: 'CUSTOMER_A_TOKEN' | 'CUSTOMER_B_TOKEN') {
    const response = await new OrdersApi(request, token).listOrders({ limit: 100 });
    return (await response.json()).items.filter((order: any) => order.cartId === cartId);
}

test('Rule 1: the same Idempotency-Key sent twice at once places one order', withBugs(['@concurrency', '@idempotency'], ['BUG-004', 'BUG-005', 'BUG-006', 'BUG-007']), async ({ request }) => {
    const orders = new OrdersApi(request, 'CUSTOMER_A_TOKEN');
    const key = randomUUID();

    const replies = await Promise.all([
        orders.placeOrder({ cartId: 'cart-a' }, { idempotencyKey: key }),
        orders.placeOrder({ cartId: 'cart-a' }, { idempotencyKey: key }),
    ]);
    const statuses = replies.map(reply => reply.status()).sort();
    const bodies = await Promise.all(replies.map(reply => reply.json()));

    // either both replies describe the one order, or the second is told the first is still running
    expect.soft(statuses.every(status => status === 201 || status === 409), `statuses ${statuses}`).toBe(true);
    for (const body of bodies.filter(body => body.code)) {
        expect.soft(body.code).toBe('IDEMPOTENCY_IN_PROGRESS');
    }
    const ids = new Set(bodies.filter(body => body.id).map(body => body.id));
    expect.soft(ids.size, 'one order id across both replies').toBe(1);
    expect.soft(await ordersFromCart(request, 'cart-a', 'CUSTOMER_A_TOKEN'), 'orders placed from cart-a').toHaveLength(1);
});

test('Rule 1: a retry after the first attempt timed out places one order', withBugs(['@concurrency', '@idempotency'], ['BUG-004', 'BUG-005', 'BUG-006', 'BUG-007']), async ({ request }) => {
    const orders = new OrdersApi(request, 'CUSTOMER_A_TOKEN');
    const key = randomUUID();

    // the caller gives up before seeing the answer; the server may or may not have done the work
    await orders.placeOrder({ cartId: 'cart-a' }, { idempotencyKey: key, timeout: 1 }).catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 500));

    const retry = await orders.placeOrder({ cartId: 'cart-a' }, { idempotencyKey: key });
    expect.soft(retry.status(), await retry.text()).toBe(201);
    expect.soft(await ordersFromCart(request, 'cart-a', 'CUSTOMER_A_TOKEN'), 'orders placed from cart-a').toHaveLength(1);
});

test('Flow 3: two checkouts of one cart at once (different keys) give one order', withBugs(['@concurrency'], ['BUG-004', 'BUG-006', 'BUG-007']), async ({ request }) => {
    const orders = new OrdersApi(request, 'CUSTOMER_A_TOKEN');

    const replies = await Promise.all([
        orders.placeOrder({ cartId: 'cart-a' }),
        orders.placeOrder({ cartId: 'cart-a' }),
    ]);
    const statuses = replies.map(reply => reply.status()).sort();

    expect.soft(statuses, 'one checkout wins, the other finds the cart closed').toEqual([201, 409]);
    expect.soft(await ordersFromCart(request, 'cart-a', 'CUSTOMER_A_TOKEN'), 'orders placed from cart-a').toHaveLength(1);
});

test('Flow 2: two customers with the last unit in their carts; whoever checks out first gets it', withBugs(['@concurrency'], ['BUG-004', 'BUG-006', 'BUG-007']), async ({ request }) => {
    // OATS has 1 unit available; a cart does not hold stock, so both can add it
    const cartA = new CartApi(request, 'CUSTOMER_A_TOKEN');
    const cartB = new CartApi(request, 'CUSTOMER_B_TOKEN');
    await cartA.clear();
    expect((await cartA.addItem({ sku: 'OATS', quantity: 1 })).status()).toBe(200);
    const addB = await cartB.addItem({ sku: 'OATS', quantity: 1 });
    expect(addB.status()).toBe(200);
    const cartIdB = (await addB.json()).id;

    const replies = await Promise.all([
        new OrdersApi(request, 'CUSTOMER_A_TOKEN').placeOrder({ cartId: 'cart-a' }),
        new OrdersApi(request, 'CUSTOMER_B_TOKEN').placeOrder({ cartId: cartIdB }),
    ]);
    const statuses = replies.map(reply => reply.status()).sort();
    const refused = (await Promise.all(replies.map(reply => reply.json()))).filter(body => body.code);

    expect.soft(statuses, 'exactly one customer gets the last unit').toEqual([201, 409]);
    expect.soft(refused.map(body => body.code)).toEqual(['INSUFFICIENT_STOCK']);
});
