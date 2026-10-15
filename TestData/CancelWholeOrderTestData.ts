import { ApiTestData } from './ApiTestData';

/**A customer can cancel on their own up to a point. Once the order is with a rider, they cannot; past that only staff can act on it.

Order is | Customer can cancel?
PLACED, PACKING, PACKED| yes
OUT_FOR_DELIVERY| no
DELIVERED| no


Cancelling frees the units it held. Cancelling the same order again with the same key is harmless: stock is not freed twice and the allowance is not spent twice.

A='Authorization: Bearer customer-a-token'
J='Content-Type: application/json'

curl -s -X POST http://localhost:8080/orders/order-placed-a/cancel -H "$A" -H "$J" \
  -H 'Idempotency-Key: k-cancel-1' -d '{"reason":"Changed my mind"}'

Staff can cancel at any point, with no allowance spent:

curl -s -X POST http://localhost:8080/admin/orders/order-placed-a/cancel \
  -H 'Authorization: Bearer staff-token' -H "$J" \
  -H 'Idempotency-Key: k-support-1' -d '{"reason":"Store closed"}'
 */

export const CANCEL_WHOLE_ORDER_TEST_DATA = {
    CWO_001: {
        description: 'Customer A can cancel a PLACED order',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'cwo-cancel-placed-a',
        expectedStatus: 200,
    },
    CWO_002: {
        description: 'Repeating the same cancel with the same Idempotency-Key is harmless',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'cwo-cancel-placed-a',
        expectedStatus: 200,
    },
    CWO_003: {
        description: 'Reusing an Idempotency-Key with a different payload is rejected',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-a', reason: 'Ordered by mistake' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        idempotencyKey: 'cwo-cancel-placed-a',
        expectedStatus: 409,
    },
    CWO_004: {
        description: 'Customer A can cancel a PACKED order',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-packed-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    CWO_005: {
        description: 'Customer A cannot cancel an OUT_FOR_DELIVERY order',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-outbound-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    CWO_006: {
        description: 'Customer A cannot cancel a DELIVERED order',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-delivered-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    CWO_007: {
        description: 'Store staff can cancel an OUT_FOR_DELIVERY order',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-outbound-a', reason: 'Store closed' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
    },
    CWO_008: {
        description: 'Store staff can cancel a PLACED order',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-placed-b', reason: 'Store closed' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
    },
    CWO_009: {
        description: 'Store staff cannot cancel a DELIVERED order',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-delivered-b', reason: 'Store closed' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 409,
    },
    CWO_010: {
        description: 'Cancelling an order that does not exist returns not found',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-does-not-exist', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 404,
    },
    CWO_011: {
        description: 'Cancelling without a reason is rejected',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 400,
    },
    CWO_012: {
        description: 'Cancelling without an Idempotency-Key is rejected',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        sendIdempotencyKey: false,
        expectedStatus: 400,
    },
    CWO_013: {
        description: 'Store staff is forbidden from using the customer cancel',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a', reason: 'Changed my mind' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 403,
    },
    CWO_014: {
        description: 'Cancelling without a token is rejected',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a', reason: 'Changed my mind' },
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    CWO_015: {
        description: 'Staff cancelling an order that does not exist returns not found',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-does-not-exist', reason: 'Store closed' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 404,
    },
    CWO_016: {
        description: 'Staff cancelling without a reason is rejected',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 400,
    },
    CWO_017: {
        description: 'Staff cancelling without an Idempotency-Key is rejected',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a', reason: 'Store closed' },
        tokenEnvKey: 'STAFF_TOKEN',
        sendIdempotencyKey: false,
        expectedStatus: 400,
    },
    CWO_018: {
        description: 'A customer is forbidden from using the staff cancel',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a', reason: 'Store closed' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 403,
    },
    CWO_019: {
        description: 'Staff cancelling without a token is rejected',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-delivered-old-a', reason: 'Store closed' },
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    CWO_020: {
        description: 'Customer A can cancel a newly placed order',
        api: 'orders',
        action: 'cancel',
        input: { orderId: '{orderId}', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    CWO_021: {
        description: 'A fourth cancellation in one store day is refused',
        api: 'orders',
        action: 'cancel',
        input: { orderId: '{orderId}', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    CWO_022: {
        description: 'Customer B cancelling the order of Customer A returns not found',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 404,
    },
    CWO_023: {
        description: 'Cancelling an already cancelled order with a new key is refused',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
    },
    CWO_024: {
        description: 'Store staff cancel an OUT_FOR_DELIVERY order and its units wait for restock',
        api: 'orderOperations',
        action: 'cancel',
        input: { orderId: 'order-outbound-a', reason: 'Store closed' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
        expectedBody: { status: 'CANCELLED', cancellationRestockPendingQuantity: 1 },
    },
    CWO_025: {
        description: 'Cancelling after giving up part of the order cancels what is left',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-a', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
        expectedBody: { status: 'CANCELLED', totalMinor: 36000, remainingTotalMinor: 0, items: [{ quantity: 2, cancelledQuantity: 2, remainingLineTotalMinor: 0 }] },
    },
    CWO_026: {
        description: 'Customer B can cancel their own order while Customer A is at the limit',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-placed-b', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 200,
    },
    CWO_027: {
        description: 'A cancel of an order that does not exist is still not found at the limit',
        api: 'orders',
        action: 'cancel',
        input: { orderId: 'order-does-not-exist', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 404,
        expectedCode: 'ORDER_NOT_FOUND',
    },
    CWO_028: {
        description: 'Customer A can cancel a new order after store midnight',
        api: 'orders',
        action: 'cancel',
        input: { orderId: '{orderId}', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    CWO_029: {
        description: 'A fourth cancel in the same store day is refused, even after UTC midnight',
        api: 'orders',
        action: 'cancel',
        input: { orderId: '{orderId}', reason: 'Changed my mind' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 409,
        expectedCode: 'CANCELLATION_LIMIT_REACHED',
    },
} as const satisfies Record<string, ApiTestData>;

export type CancelWholeOrderTestDataId = keyof typeof CANCEL_WHOLE_ORDER_TEST_DATA;
