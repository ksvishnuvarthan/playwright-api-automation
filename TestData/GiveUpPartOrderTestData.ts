import { ApiTestData } from './ApiTestData';

/** 
 Instead of losing the whole order, a customer can drop some units off one line. This is only allowed while the order is still PLACED.

The order then shows both numbers: what was ordered, and what is left.

curl -s -X POST \
  http://localhost:8080/orders/order-placed-a/items/line-placed-a-rice/remove \
  -H 'Authorization: Bearer customer-a-token' -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: k-remove-1' -d '{"quantity":1}'

cancelledQuantity goes up, remainingLineTotalMinor goes down, lineTotalMinor does not move.
* 
*/

export const GIVE_UP_PART_ORDER_TEST_DATA = {
    GUP_001: {
        description: 'Customer A can remove a unit from a PLACED order',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-a', orderLineId: 'line-placed-a-rice', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    GUP_002: {
        description: 'Removing units from an order that is no longer PLACED is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    GUP_003: {
        description: 'Removing units from an order that does not exist returns not found',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-does-not-exist', orderLineId: 'line-placed-a-rice', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 404,
    },
    GUP_004: {
        description: 'Removing units without a quantity is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 400,
    },
    GUP_005: {
        description: 'Removing zero units is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: 0 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 400,
    },
    GUP_006: {
        description: 'Removing a negative number of units is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: -1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 400,
    },
    GUP_007: {
        description: 'Removing units without an Idempotency-Key is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        sendIdempotencyKey: false,
        expectedStatus: 400,
    },
    GUP_008: {
        description: 'Store staff is forbidden from removing units from a customer order',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 403,
    },
    GUP_009: {
        description: 'Removing units without a token is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: 1 },
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    GUP_010: {
        description: 'Removing more units than remain on the line is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-a', orderLineId: 'line-placed-a-rice', quantity: 5 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    GUP_011: {
        description: 'Removing units from a line that is not on the order returns not found',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-a', orderLineId: 'line-does-not-exist', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 404,
    },
    GUP_012: {
        description: 'Removing units from an order that is PACKING is rejected',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-b', orderLineId: 'line-placed-b-bread', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 409,
        expectedCode: 'ITEM_REMOVAL_NOT_ALLOWED',
    },
    GUP_013: {
        description: 'Removing the last remaining unit of a line',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-a', orderLineId: 'line-placed-a-rice', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
        expectedBody: { items: [{ quantity: 2, cancelledQuantity: 2, lineTotalMinor: 36000, remainingLineTotalMinor: 0 }], remainingTotalMinor: 0 },
    },
    GUP_014: {
        description: 'Customer B removing units from the order of Customer A returns not found',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-a', orderLineId: 'line-placed-a-rice', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 404,
        expectedCode: 'ORDER_NOT_FOUND',
    },
    GUP_015: {
        description: 'Customer A removes one unit; ordered stays, remaining goes down',
        api: 'orders',
        action: 'removeUnits',
        input: { orderId: 'order-placed-a', orderLineId: 'line-placed-a-rice', quantity: 1 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'gup-remove-one-rice',
        expectedStatus: 200,
        expectedBody: { status: 'PLACED', totalMinor: 36000, remainingTotalMinor: 18000, items: [{ quantity: 2, cancelledQuantity: 1, lineTotalMinor: 36000, remainingLineTotalMinor: 18000 }] },
    },
} as const satisfies Record<string, ApiTestData>;

export type GiveUpPartOrderTestDataId = keyof typeof GIVE_UP_PART_ORDER_TEST_DATA;
