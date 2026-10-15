import { ApiTestData } from './ApiTestData';

/**Reset the data to a known state at any time, without restarting anything:

curl -s -X POST http://localhost:8080/test/reset \
  -H 'Authorization: Bearer test-token' \
  -H 'Content-Type: application/json' \
  -d '{"fixture":"standard"}'

curl -s http://localhost:8080/test/clock -H 'Authorization: Bearer test-token'
# {"now":"2026-09-17T10:00:00.000Z","storeTimezone":"Asia/Kolkata"}
 */

export const RESET_DATA_TEST_DATA = {
    RD_001: {
        description: 'The test harness can reset the data to the standard fixture',
        api: 'testHarness',
        action: 'reset',
        input: { fixture: 'standard' },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 201,
    },
    RD_002: {
        description: 'Resetting to an unknown fixture is rejected',
        api: 'testHarness',
        action: 'reset',
        input: { fixture: 'does-not-exist' },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 400,
    },
    RD_003: {
        description: 'A customer is forbidden from resetting the data',
        api: 'testHarness',
        action: 'reset',
        input: { fixture: 'standard' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 403,
    },
    RD_004: {
        description: 'Store staff is forbidden from resetting the data',
        api: 'testHarness',
        action: 'reset',
        input: { fixture: 'standard' },
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 403,
    },
    RD_005: {
        description: 'Resetting the data without a token is rejected',
        api: 'testHarness',
        action: 'reset',
        input: { fixture: 'standard' },
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    RD_006: {
        description: 'The test harness can read the clock',
        api: 'testHarness',
        action: 'getClock',
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 200,
    },
    RD_007: {
        description: 'A customer is forbidden from reading the clock',
        api: 'testHarness',
        action: 'getClock',
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 403,
    },
    RD_008: {
        description: 'Store staff is forbidden from reading the clock',
        api: 'testHarness',
        action: 'getClock',
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 403,
    },
    RD_009: {
        description: 'Reading the clock without a token is rejected',
        api: 'testHarness',
        action: 'getClock',
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    RD_010: {
        description: 'Set the clock to 23:30 store time on 17 September',
        api: 'testHarness',
        action: 'setClock',
        input: { now: '2026-09-17T18:00:00.000Z' },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 200,
    },
    RD_011: {
        description: 'Set the clock to 00:00 store time on 18 September (store midnight)',
        api: 'testHarness',
        action: 'setClock',
        input: { now: '2026-09-17T18:30:00.000Z' },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 200,
    },
    RD_012: {
        description: 'Set the clock to 00:30 store time on 18 September',
        api: 'testHarness',
        action: 'setClock',
        input: { now: '2026-09-17T19:00:00.000Z' },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 200,
    },
    RD_013: {
        description: 'Set the clock to UTC midnight (05:30 store time, same store day)',
        api: 'testHarness',
        action: 'setClock',
        input: { now: '2026-09-18T00:00:00.000Z' },
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 200,
    },
    RD_014: {
        description: 'A customer is forbidden from moving the clock',
        api: 'testHarness',
        action: 'setClock',
        input: { now: '2026-09-18T00:00:00.000Z' },
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 403,
        expectedCode: 'FORBIDDEN',
    },
} as const satisfies Record<string, ApiTestData>;

export type ResetDataTestDataId = keyof typeof RESET_DATA_TEST_DATA;
