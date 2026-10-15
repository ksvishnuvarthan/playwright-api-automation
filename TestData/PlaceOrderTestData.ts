import { ApiTestData } from './ApiTestData';

/*
Checkout takes the whole cart at once. Either all of it becomes an order, or none of it does and the cart is untouched.

This is the moment stock is actually checked and claimed.
If anything is short, the whole thing is refused and the customer is told which items were short and how many were really available.
A placed order closes the cart. The next cart action starts a fresh one.
The order freezes what was bought: the name and the price at that moment. A later price change in the catalog does not rewrite an order that already exists.

A='Authorization: Bearer customer-a-token'
J='Content-Type: application/json'

curl -s -X POST http://localhost:8080/orders -H "$A" -H "$J" \
  -H 'Idempotency-Key: k-order-1' -d '{"cartId":"cart-a"}'
# 201 Created

Read it back. totalMinor is what was originally ordered. remainingTotalMinor is what is left after any cancelling.

curl -s http://localhost:8080/orders/order-placed-a -H "$A"
curl -s 'http://localhost:8080/orders?status=PLACED&page=1&limit=20' -H "$A"

{"id":"order-placed-a","status":"PLACED",
 "items":[{"id":"line-placed-a-rice","sku":"RICE","name":"Basmati Rice 1 kg",
           "quantity":2,"cancelledQuantity":0,
           "unitPriceMinor":18000,"lineTotalMinor":36000,
           "remainingLineTotalMinor":36000}],
 "totalMinor":36000,"remainingTotalMinor":36000,
 "createdAt":"2026-09-17T09:00:00.000Z","deliveredAt":null,
 "cancellationRestockPendingQuantity":0}

The list and the detail describe the same order, so they report the same totals.

*/

export const PLACE_ORDER_TEST_DATA = {
    PO_001: {
        description: 'Customer A can place an order from their active cart',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'po-place-cart-a',
        expectedStatus: 201,
    },
    PO_002: {
        description: 'Repeating the same order with the same Idempotency-Key is harmless',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'po-place-cart-a',
        expectedStatus: 201,
    },
    PO_003: {
        description: 'Reusing an Idempotency-Key with a different payload is rejected',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-other' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'po-place-cart-a',
        expectedStatus: 409,
    },
    PO_004: {
        description: 'Placing an order from a cart that is no longer active is rejected',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    PO_005: {
        description: 'Placing an order from a cart that does not exist is rejected',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-does-not-exist' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    PO_006: {
        description: 'Placing an order without a cartId is rejected',
        api: 'orders',
        action: 'placeOrder',
        input: {},
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 400,
    },
    PO_007: {
        description: 'Placing an order without an Idempotency-Key is rejected',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        sendIdempotencyKey: false,
        expectedStatus: 400,
    },
    PO_008: {
        description: 'Store staff is forbidden from placing an order',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 403,
    },
    PO_009: {
        description: 'Placing an order without a token is rejected',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    PO_010: {
        description: 'Customer B cannot place an order from the cart of Customer A',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 409,
    },
    PO_011: {
        description: 'Customer A can read a placed order back',
        api: 'orders',
        action: 'getOrder',
        input: { orderId: 'order-placed-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    PO_012: {
        description: 'Customer A can list their PLACED orders',
        api: 'orders',
        action: 'listOrders',
        input: { status: 'PLACED', page: 1, limit: 20 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    PO_013: {
        description: 'Customer A can place an order from a fresh cart',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: '{cartId}' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 201,
    },
    PO_014: {
        description: 'Customer A can read a newly placed order back',
        api: 'orders',
        action: 'getOrder',
        input: { orderId: '{orderId}' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    PO_015: {
        description: 'An order is refused whole when an item is short of stock',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: '{cartId}' },
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 409,
    },
    PO_016: {
        description: 'Placing an order from an empty cart is refused',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
        expectedCode: 'CART_EMPTY',
    },
    PO_017: {
        description: 'Placing an order with an item no longer for sale is refused',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
        expectedCode: 'SKU_UNAVAILABLE',
    },
    PO_018: {
        description: 'An order with one short item is refused whole, naming the short item',
        api: 'orders',
        action: 'placeOrder',
        input: { cartId: 'cart-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
        expectedCode: 'INSUFFICIENT_STOCK',
        // the customer is told which items were short
        expectedBody: { details: [{ sku: 'OATS' }] },
    },
    PO_019: {
        description: 'The order keeps the name and price it was bought at',
        api: 'orders',
        action: 'getOrder',
        input: { orderId: '{orderId}' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
        expectedBody: { totalMinor: 15600, items: [{ sku: 'BREAD', name: 'Sandwich Bread 400 g', unitPriceMinor: 4500, lineTotalMinor: 9000 }, { sku: 'MILK', name: 'Toned Milk 1 L', unitPriceMinor: 6600 }] },
    },
} as const satisfies Record<string, ApiTestData>;

export type PlaceOrderTestDataId = keyof typeof PLACE_ORDER_TEST_DATA;
