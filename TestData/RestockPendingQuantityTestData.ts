import { ApiTestData } from './ApiTestData';

/**Flow 8: cancelled stock goes back on the shelf
Freed units are not instantly sellable again. Where a unit goes depends on how far the order had got.

The order was
The units
PLACED or PACKING
go straight back to sellable
PACKED or later
wait to be put back on the shelf by hand


The order tells you which case you are in: cancellationRestockPendingQuantity is how many units are still waiting. Staff clear it:

curl -s -X POST http://localhost:8080/internal/orders/order-placed-a/restock \
  -H 'Authorization: Bearer staff-token' -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: k-restock-1' \
  -d '{"orderLineId":"line-placed-a-rice","quantity":2}'

  */

export const RESTOCK_PENDING_QUANTITY_TEST_DATA = {
    RPQ_001: {
        description: 'Store staff can restock the units pending from a cancelled PACKED order',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: 'STAFF_TOKEN',
        idempotencyKey: 'rpq-restock-packed-a',
        expectedStatus: 200,
    },
    RPQ_002: {
        description: 'Repeating the same restock with the same Idempotency-Key is harmless',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: 'STAFF_TOKEN',
        idempotencyKey: 'rpq-restock-packed-a',
        expectedStatus: 200,
    },
    RPQ_003: {
        description: 'Reusing an Idempotency-Key with a different payload is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        idempotencyKey: 'rpq-restock-packed-a',
        expectedStatus: 409,
    },
    RPQ_004: {
        description: 'Restocking more units than are pending is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 409,
    },
    RPQ_005: {
        description: 'Restocking an order that does not exist returns not found',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-does-not-exist', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 404,
    },
    RPQ_006: {
        description: 'Restocking without an orderLineId and quantity is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 400,
    },
    RPQ_007: {
        description: 'Restocking without an Idempotency-Key is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: 'STAFF_TOKEN',
        sendIdempotencyKey: false,
        expectedStatus: 400,
    },
    RPQ_008: {
        description: 'A customer is forbidden from restocking',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 403,
    },
    RPQ_009: {
        description: 'The test harness token is forbidden from restocking',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 403,
    },
    RPQ_010: {
        description: 'Restocking without a token is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 3 },
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    RPQ_011: {
        description: 'Store staff restock 1 of the 3 pending units',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
        expectedBody: { cancellationRestockPendingQuantity: 2 },
    },
    RPQ_012: {
        description: 'Store staff restock the remaining 2 pending units',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 2 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
        expectedBody: { cancellationRestockPendingQuantity: 0 },
    },
    RPQ_013: {
        description: 'Restocking a line that is not on the order returns not found',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-placed-a-rice', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 404,
        expectedCode: 'ORDER_LINE_NOT_FOUND',
    },
    RPQ_014: {
        description: 'Restocking an order that was not cancelled is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-delivered-a', orderLineId: 'line-delivered-a-bread', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 409,
    },
    RPQ_015: {
        description: 'Restocking zero units is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 0 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 400,
        expectedCode: 'VALIDATION_ERROR',
    },
    RPQ_016: {
        description: 'Restocking a fractional number of units is rejected',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-packed-a', orderLineId: 'line-packed-a-eggs', quantity: 1.5 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 400,
        expectedCode: 'VALIDATION_ERROR',
    },
    RPQ_017: {
        description: 'Store staff restock the unit from the cancelled OUT_FOR_DELIVERY order',
        api: 'orderOperations',
        action: 'restock',
        input: { orderId: 'order-outbound-a', orderLineId: 'line-outbound-a-coffee', quantity: 1 },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
        expectedBody: { cancellationRestockPendingQuantity: 0 },
    },
} as const satisfies Record<string, ApiTestData>;

export type RestockPendingQuantityTestDataId = keyof typeof RESTOCK_PENDING_QUANTITY_TEST_DATA;
