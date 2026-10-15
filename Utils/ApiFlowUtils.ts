import { APIRequestContext, APIResponse, expect, test } from '@playwright/test';
import { createApi } from '../Apis/ApiRegistry';
import { ApiCallOptions } from '../Apis/BaseApi';
import { ApiTestData } from '../TestData/ApiTestData';
import { BROWSE_THE_STORE_TEST_DATA } from '../TestData/BrowseTheStoreTestData';
import { BUILD_CART_TEST_DATA } from '../TestData/BuildCartTestData';
import { CANCEL_WHOLE_ORDER_TEST_DATA } from '../TestData/CancelWholeOrderTestData';
import { FOLLOW_ORDER_TEST_DATA } from '../TestData/FollowOrderTestData';
import { GIVE_UP_PART_ORDER_TEST_DATA } from '../TestData/GiveUpPartOrderTestData';
import { INVENTORY_TEST_DATA } from '../TestData/InventoryTestData';
import { PLACE_ORDER_TEST_DATA } from '../TestData/PlaceOrderTestData';
import { RESET_DATA_TEST_DATA } from '../TestData/ResetDataTestData';
import { RESTOCK_PENDING_QUANTITY_TEST_DATA } from '../TestData/RestockPendingQuantityTestData';
import { dbFingerprint, expectDbInvariants, expectOrderMatchesDb } from './DbValidations';
import { PostgresDb } from './PostgresDb';
import { applyVariables, TestDataVariables } from './TestDataUtils';

const TEST_DATA_SETS = [
    BROWSE_THE_STORE_TEST_DATA,
    BUILD_CART_TEST_DATA,
    PLACE_ORDER_TEST_DATA,
    FOLLOW_ORDER_TEST_DATA,
    CANCEL_WHOLE_ORDER_TEST_DATA,
    GIVE_UP_PART_ORDER_TEST_DATA,
    RESTOCK_PENDING_QUANTITY_TEST_DATA,
    INVENTORY_TEST_DATA,
    RESET_DATA_TEST_DATA,
] as const;

const ALL_TEST_DATA = {
    ...BROWSE_THE_STORE_TEST_DATA,
    ...BUILD_CART_TEST_DATA,
    ...PLACE_ORDER_TEST_DATA,
    ...FOLLOW_ORDER_TEST_DATA,
    ...CANCEL_WHOLE_ORDER_TEST_DATA,
    ...GIVE_UP_PART_ORDER_TEST_DATA,
    ...RESTOCK_PENDING_QUANTITY_TEST_DATA,
    ...INVENTORY_TEST_DATA,
    ...RESET_DATA_TEST_DATA,
};

export type ApiTestDataId = keyof typeof ALL_TEST_DATA;

/** API methods that only read; every other method is a write. */
const READ_ACTIONS = new Set(['getCatalog', 'getCart', 'listOrders', 'getOrder', 'getTimeline', 'getInventory', 'getClock']);

// test ids must be distinct across files, or a later file would silently replace an earlier entry
const idCount = TEST_DATA_SETS.reduce((count, set) => count + Object.keys(set).length, 0);
if (idCount !== Object.keys(ALL_TEST_DATA).length) {
    throw new Error('Test data ids are not distinct across the TestData files');
}

export interface ApiResult {
    response: APIResponse;
    /** Parsed JSON body, or null when the response has none. */
    body: any;
}

/**
 * Calls the API method behind a test data id, as a reported step, and
 * checks the response status against the expected status in the test data.
 */
export async function executeApi(request: APIRequestContext, testDataId: ApiTestDataId, variables?: TestDataVariables): Promise<ApiResult> {
    const testData: ApiTestData = applyVariables<ApiTestData>(ALL_TEST_DATA[testDataId], variables);

    return test.step(`${testDataId} - ${testData.description}`, async () => {
        const api = createApi(testData.api, request, testData.tokenEnvKey);
        const action = (api as any)[testData.action] as (...args: unknown[]) => Promise<APIResponse>;
        const options: ApiCallOptions = {
            headers: testData.headers,
            idempotencyKey: testData.sendIdempotencyKey === false ? null : testData.idempotencyKey,
        };
        const response = testData.input === undefined
            ? await action.call(api, options)
            : await action.call(api, testData.input, options);

        const text = await response.text();
        expect.soft(response.status(), `${testDataId} - ${testData.description}: ${text}`).toBe(testData.expectedStatus);

        let body: any = null;
        try {
            body = JSON.parse(text);
        } catch {
            // not every response carries JSON
        }
        if (testData.expectedCode) {
            expect.soft(body?.code, `${testDataId}: error code`).toBe(testData.expectedCode);
        }
        if (testData.expectedBody) {
            expect.soft(body, `${testDataId}: response body`).toMatchObject(testData.expectedBody);
        }
        return { response, body };
    });
}

/**
 * Executes several test data ids in order, as one flow.
 *
 * The id of the last order and cart seen in a response is carried forward, so later
 * steps can use {orderId} and {cartId} in their input. Two rules from the brief are
 * checked on every step: inventory must reconcile, and every failure must have a
 * code, a request id and details.
 *
 * With a database connection, every order the API returns is compared with its row in
 * the database, and the database rules from the brief are checked when the flow ends.
 */
export async function executeFlow(request: APIRequestContext, testDataIds: readonly ApiTestDataId[], db?: PostgresDb): Promise<void> {
    const variables: TestDataVariables = {};
    // first reply per fixed Idempotency-Key, to check that a replay repeats it
    const firstReplies = new Map<string, { request: string; status: number; body: any }>();

    for (const testDataId of testDataIds) {
        const testData: ApiTestData = ALL_TEST_DATA[testDataId];
        const isWrite = !READ_ACTIONS.has(testData.action);
        // rule 2: a refused write leaves nothing behind
        const before = db && isWrite && testData.expectedStatus >= 400 ? await dbFingerprint(db) : undefined;

        const { response, body } = await executeApi(request, testDataId, variables);

        if (before && db && response.status() >= 400) {
            expect.soft(await dbFingerprint(db), `${testDataId}: a refused write leaves nothing behind`).toEqual(before);
        }
        if (testData.idempotencyKey && isWrite) {
            const requestKey = JSON.stringify([testData.api, testData.action, testData.tokenEnvKey, testData.input]);
            const first = firstReplies.get(testData.idempotencyKey);
            if (!first) {
                firstReplies.set(testData.idempotencyKey, { request: requestKey, status: response.status(), body });
            } else if (first.request === requestKey) {
                // rule 1: the second reply repeats the first and carries Idempotency-Replayed: true
                expect.soft(response.headers()['idempotency-replayed'], `${testDataId}: Idempotency-Replayed header on a replay`).toBe('true');
                expect.soft({ status: response.status(), body }, `${testDataId}: a replay repeats the first reply`).toEqual({ status: first.status, body: first.body });
            }
        }

        if (typeof body?.id === 'string') {
            if ('customerId' in body) {
                variables.orderId = body.id;
                if (db && response.ok()) {
                    await expectOrderMatchesDb(db, body, testDataId);
                }
            } else if ('items' in body) {
                variables.cartId = body.id;
            }
        }
        if (typeof body?.reconciles === 'boolean') {
            expect.soft(body.reconciles, `${testDataId}: ${body.sku} inventory reconciles: ${JSON.stringify(body)}`).toBe(true);
        }
        if (response.status() >= 400) {
            expect.soft(body, `${testDataId}: failure has a code, a request id and details`).toMatchObject({
                code: expect.any(String),
                requestId: expect.any(String),
                details: expect.any(Array),
            });
            expect.soft(body?.code, `${testDataId}: INTERNAL_ERROR is never a correct answer`).not.toBe('INTERNAL_ERROR');
        }
    }

    if (db) {
        await expectDbInvariants(db);
    }
}
