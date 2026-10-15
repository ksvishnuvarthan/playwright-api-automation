import { randomUUID } from 'crypto';
import { APIRequestContext } from '@playwright/test';
import { CartApi } from '../Apis/CartApi';
import { knownBugDetails } from '../TestData/KnownBugs';
import { expect, test } from '../Utils/fixtures';

/**
 * Flow 10: every failure has a stable code, a request id and details, and
 * INTERNAL_ERROR is never a correct answer to a bad request. These requests are
 * deliberately malformed, so they go straight through Playwright's request context.
 */
const baseUrl = () => process.env.BASE_URL!;

/** Tags for this test plus the known bugs it fails on (temporary; remove ids once fixed). */
function withBugs(tags: string[], bugs: Parameters<typeof knownBugDetails>[0]) {
    const bugDetails = knownBugDetails(bugs);
    return { tag: [...tags, ...bugDetails.tag], annotation: bugDetails.annotation };
}
const auth = { Authorization: `Bearer ${process.env.CUSTOMER_A_TOKEN}` };

/** code undefined: the brief names no code for this failure, so only the shape is checked. */
async function expectFailure(response: Awaited<ReturnType<APIRequestContext['get']>>, status: number, code?: string) {
    const text = await response.text();
    expect.soft(response.status(), text).toBe(status);
    let body: any = null;
    try {
        body = JSON.parse(text);
    } catch {
        // checked below
    }
    expect.soft(body, 'failure has a code, a request id and details').toMatchObject({
        code: code ?? expect.any(String), requestId: expect.any(String), details: expect.any(Array),
    });
    expect.soft(body?.code, 'INTERNAL_ERROR is never a correct answer to a bad request').not.toBe('INTERNAL_ERROR');
}

for (const path of ['/products', '/carts', '/orders/order-placed-a/status', '/admin/catalog']) {
    test(`An unknown route GET ${path} is not found, not a server error`, withBugs(['@robustness', '@negative'], ['BUG-014']), async ({ request }) => {
        await expectFailure(await request.get(`${baseUrl()}${path}`, { headers: auth }), 404);
    });
}

test('Malformed JSON in a write is a validation error', withBugs(['@robustness', '@negative'], ['BUG-014']), async ({ request }) => {
    const response = await request.post(`${baseUrl()}/cart/items`, {
        headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        data: '{"sku":"EGGS","quantity":',
    });
    await expectFailure(response, 400, 'VALIDATION_ERROR');
});

test('A write with a non-JSON content type is a validation error', { tag: ['@robustness', '@negative'] }, async ({ request }) => {
    const response = await request.post(`${baseUrl()}/cart/items`, {
        headers: { ...auth, 'Content-Type': 'text/plain', 'Idempotency-Key': randomUUID() },
        data: 'sku=EGGS&quantity=1',
    });
    await expectFailure(response, 400, 'VALIDATION_ERROR');
});

test('A JSON array as the body of a write is a validation error', { tag: ['@robustness', '@negative'] }, async ({ request }) => {
    const response = await request.post(`${baseUrl()}/cart/items`, {
        headers: { ...auth, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
        data: [{ sku: 'EGGS', quantity: 1 }],
    });
    await expectFailure(response, 400, 'VALIDATION_ERROR');
});

test('A quantity too large for the database is a validation error', withBugs(['@robustness', '@negative'], ['BUG-013']), async ({ request }) => {
    await expectFailure(await new CartApi(request, 'CUSTOMER_A_TOKEN').addItem({ sku: 'EGGS', quantity: 2 ** 31 }), 400, 'VALIDATION_ERROR');
});

test('A whitespace-only Idempotency-Key is refused', { tag: ['@robustness', '@negative', '@idempotency'] }, async ({ request }) => {
    await expectFailure(await new CartApi(request, 'CUSTOMER_A_TOKEN').addItem({ sku: 'EGGS', quantity: 1 }, { idempotencyKey: '   ' }), 400, 'VALIDATION_ERROR');
});

test('A very long Idempotency-Key is handled without a server error', { tag: ['@robustness', '@idempotency'] }, async ({ request }) => {
    const response = await new CartApi(request, 'CUSTOMER_A_TOKEN').addItem({ sku: 'EGGS', quantity: 1 }, { idempotencyKey: 'k'.repeat(5000) });
    expect.soft([200, 400, 413], await response.text()).toContain(response.status());
});

test('The same Idempotency-Key used by two customers does not collide', { tag: ['@robustness', '@idempotency'] }, async ({ request }) => {
    const key = randomUUID();
    const replyA = await new CartApi(request, 'CUSTOMER_A_TOKEN').addItem({ sku: 'EGGS', quantity: 1 }, { idempotencyKey: key });
    const replyB = await new CartApi(request, 'CUSTOMER_B_TOKEN').addItem({ sku: 'EGGS', quantity: 1 }, { idempotencyKey: key });
    expect.soft(replyA.status()).toBe(200);
    expect.soft(replyB.status()).toBe(200);
    expect.soft(replyB.headers()['idempotency-replayed'], 'B is not served A\'s reply').not.toBe('true');
    expect.soft((await replyB.json()).id, 'B gets their own cart').not.toBe((await replyA.json()).id);
});

test('The same Idempotency-Key on two different operations does not collide', { tag: ['@robustness', '@idempotency'] }, async ({ request }) => {
    const cart = new CartApi(request, 'CUSTOMER_A_TOKEN');
    const key = randomUUID();
    expect.soft((await cart.addItem({ sku: 'EGGS', quantity: 1 }, { idempotencyKey: key })).status()).toBe(200);
    const setReply = await cart.setQuantity({ sku: 'EGGS', quantity: 4 }, { idempotencyKey: key });
    expect.soft(setReply.status(), await setReply.text()).toBe(200);
    expect.soft((await setReply.json()).items?.find((item: any) => item.sku === 'EGGS')?.quantity).toBe(4);
});

test('Every failure carries its own request id', { tag: ['@robustness'] }, async ({ request }) => {
    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
        const response = await request.get(`${baseUrl()}/orders/order-does-not-exist`, { headers: auth });
        ids.add((await response.json()).requestId);
    }
    expect(ids.size).toBe(5);
});

test.beforeEach(async ({ request }) => {
    const reset = await request.post(`${baseUrl()}/test/reset`, {
        headers: { Authorization: `Bearer ${process.env.TEST_TOKEN}` }, data: { fixture: 'standard' },
    });
    expect(reset.status()).toBe(201);
});
