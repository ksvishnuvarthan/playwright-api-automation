import { ApiTestData } from './ApiTestData';

export const BROWSE_THE_STORE_TEST_DATA = {
    BTS_001: {
        description: 'Customer A can browse the catalog',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: 'CUSTOMER_A_TOKEN',
        expectedStatus: 200,
    },
    BTS_002: {
        description: 'Customer B can browse the catalog',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: 'CUSTOMER_B_TOKEN',
        expectedStatus: 200,
    },
    BTS_003: {
        description: 'Store staff can browse the catalog',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: 'STAFF_TOKEN',
        expectedStatus: 200,
    },
    BTS_004: {
        description: 'Test harness token is forbidden from browsing the catalog',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: 'TEST_TOKEN',
        expectedStatus: 403,
    },
    BTS_005: {
        description: 'Browsing the catalog without a token is rejected',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: null,
        expectedStatus: 401,
    },
    BTS_006: {
        description: 'Browsing the catalog with an invalid token is rejected',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: null,
        headers: { Authorization: 'Bearer invalid-token' },
        expectedStatus: 401,
    },
    BTS_007: {
        description: 'A bearer token in lowercase "bearer" is rejected',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: null,
        headers: { Authorization: 'bearer customer-a-token' },
        expectedStatus: 401,
        expectedCode: 'UNAUTHENTICATED',
    },
    BTS_008: {
        description: 'A token without the Bearer prefix is rejected',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: null,
        headers: { Authorization: 'customer-a-token' },
        expectedStatus: 401,
        expectedCode: 'UNAUTHENTICATED',
    },
    BTS_009: {
        description: 'An empty bearer token is rejected',
        api: 'catalog',
        action: 'getCatalog',
        tokenEnvKey: null,
        headers: { Authorization: 'Bearer ' },
        expectedStatus: 401,
        expectedCode: 'UNAUTHENTICATED',
    },
} as const satisfies Record<string, ApiTestData>;

export type BrowseTheStoreTestDataId = keyof typeof BROWSE_THE_STORE_TEST_DATA;
