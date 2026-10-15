import { test } from '../Utils/fixtures';
import { BugId, knownBugDetails } from '../TestData/KnownBugs';
import { ApiTestDataId, executeApi, executeFlow } from '../Utils/ApiFlowUtils';

interface E2ETestData {
    testId: string;
    testDescription: string;
    tags: string[];
    /** API test data ids, executed in order. */
    steps: ApiTestDataId[];
    /** Temporary: known service bugs that make this flow fail. Remove an id once the bug is fixed. */
    bugs?: BugId[];
}

const testData: E2ETestData[] = [
    {
        testId: 'E2E_001',
        testDescription: 'Browse the store, add items to cart, and place an order',
        tags: ['e2e', 'order-flow'],
        // catalog -> cart -> add -> place -> read back -> list -> timeline -> stock adds up
        steps: ['BTS_001', 'BC_001', 'BC_005', 'PO_001', 'PO_014', 'PO_012', 'FO_001', 'INV_001', 'INV_027', 'INV_029'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007'],
    },
    {
        testId: 'E2E_002',
        testDescription: 'Flow 1: every signed-in customer and staff can browse the store, others cannot',
        tags: ['e2e', 'browse'],
        steps: ['BTS_001', 'BTS_002', 'BTS_003', 'BTS_005', 'BTS_006'],
    },
    {
        testId: 'E2E_003',
        testDescription: 'Flow 2: build a cart - add, add again, set quantity, remove, clear',
        tags: ['e2e', 'cart'],
        steps: ['BC_002', 'BC_001', 'BC_005', 'BC_018', 'BC_009', 'BC_011', 'BC_001', 'BC_013', 'BC_001', 'INV_001', 'INV_027', 'INV_029'],
        bugs: ['BUG-006'],
    },
    {
        testId: 'E2E_004',
        testDescription: 'Flow 2: refused cart writes - bad quantity, unknown SKU, missing line, missing key, wrong role',
        tags: ['e2e', 'cart', 'negative'],
        steps: ['BC_015', 'BC_017', 'BC_016', 'BC_007', 'BC_006', 'BC_010', 'BC_012', 'BC_003', 'BC_004', 'BC_008', 'BC_001'],
        bugs: ['BUG-002', 'BUG-003', 'BUG-006'],
    },
    {
        testId: 'E2E_005',
        testDescription: 'Flow 3: same Idempotency-Key places one order, and a placed order closes the cart',
        tags: ['e2e', 'order-flow', 'idempotency'],
        steps: ['BC_001', 'PO_001', 'PO_002', 'PO_003', 'PO_004', 'PO_012', 'INV_001', 'INV_029'],
        bugs: ['BUG-004', 'BUG-005', 'BUG-006', 'BUG-007'],
    },
    {
        testId: 'E2E_006',
        testDescription: 'Flow 3: an order short of stock is refused whole and the cart is untouched',
        tags: ['e2e', 'order-flow', 'negative'],
        steps: ['BC_014', 'PO_015', 'BC_002', 'FO_002', 'INV_030'],
        bugs: ['BUG-006', 'BUG-017'],
    },
    {
        testId: 'E2E_007',
        testDescription: 'Flow 3: refused orders - unknown cart, another customer cart, missing cartId, missing key, wrong role',
        tags: ['e2e', 'order-flow', 'negative'],
        steps: ['PO_005', 'PO_010', 'PO_006', 'PO_007', 'PO_008', 'PO_009', 'BC_001'],
    },
    {
        testId: 'E2E_008',
        testDescription: 'Flow 3: a later catalog price change does not rewrite an existing order',
        tags: ['e2e', 'order-flow'],
        steps: ['PO_001', 'PO_014', 'INV_031', 'PO_014', 'PO_012'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007'],
    },
    {
        testId: 'E2E_009',
        testDescription: 'Flow 4: staff move an order to the door one step at a time',
        tags: ['e2e', 'follow-order'],
        steps: ['FO_036', 'FO_032', 'FO_033', 'FO_034', 'FO_035', 'PO_011', 'FO_036', 'INV_026'],
    },
    {
        testId: 'E2E_010',
        testDescription: 'Flow 4: an order cannot skip a step, go backwards, or be advanced by a customer',
        tags: ['e2e', 'follow-order', 'negative'],
        steps: ['FO_037', 'FO_038', 'FO_022', 'FO_023', 'FO_024', 'FO_025', 'FO_026', 'FO_028', 'PO_011'],
        bugs: ['BUG-008'],
    },
    {
        testId: 'E2E_011',
        testDescription: 'Flow 5: a customer cancels a PLACED and a PACKED order; repeating with the same key is harmless',
        tags: ['e2e', 'cancel'],
        steps: ['CWO_001', 'CWO_002', 'CWO_003', 'PO_011', 'CWO_004', 'INV_026', 'INV_027'],
        bugs: ['BUG-010', 'BUG-012'],
    },
    {
        testId: 'E2E_012',
        testDescription: 'Flow 5: once the order is with a rider the customer cannot cancel, but staff can',
        tags: ['e2e', 'cancel'],
        steps: ['CWO_005', 'CWO_006', 'CWO_007', 'CWO_008', 'INV_001', 'INV_028'],
        bugs: ['BUG-009', 'BUG-010'],
    },
    {
        testId: 'E2E_013',
        testDescription: 'Flow 5: a customer can still cancel an order that staff have moved to PACKING',
        tags: ['e2e', 'cancel', 'follow-order'],
        steps: ['FO_032', 'CWO_001', 'PO_011', 'INV_026'],
        bugs: ['BUG-010', 'BUG-011'],
    },
    {
        testId: 'E2E_014',
        testDescription: 'Flow 5: refused cancels - unknown order, missing reason, missing key, wrong role, no token',
        tags: ['e2e', 'cancel', 'negative'],
        steps: ['CWO_010', 'CWO_011', 'CWO_012', 'CWO_013', 'CWO_014', 'CWO_015', 'CWO_016', 'CWO_017', 'CWO_018', 'CWO_019'],
    },
    {
        testId: 'E2E_015',
        testDescription: 'Flow 6: a customer gives up part of a PLACED order',
        tags: ['e2e', 'give-up'],
        steps: ['GUP_001', 'PO_011', 'GUP_010', 'GUP_011', 'PO_011', 'INV_026'],
    },
    {
        testId: 'E2E_016',
        testDescription: 'Flow 6: units cannot be removed once the order has moved past PLACED',
        tags: ['e2e', 'give-up', 'negative'],
        steps: ['GUP_002', 'GUP_003', 'GUP_004', 'GUP_005', 'GUP_006', 'GUP_007', 'GUP_008', 'GUP_009'],
    },
    {
        testId: 'E2E_017',
        testDescription: 'Flow 7: the fourth whole-order cancellation in a store day is refused',
        tags: ['e2e', 'cancel', 'allowance'],
        // partial removal and a refused cancel do not count; then three cancels succeed and the fourth is refused
        steps: ['GUP_001', 'CWO_011', 'CWO_001', 'CWO_004', 'PO_001', 'CWO_020', 'BC_005', 'PO_013', 'CWO_021', 'PO_014'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-010', 'BUG-012'],
    },
    {
        testId: 'E2E_018',
        testDescription: 'Flow 8: units from a cancelled PACKED order wait for staff to restock them',
        tags: ['e2e', 'restock'],
        steps: ['INV_027', 'CWO_004', 'INV_027', 'RPQ_001', 'RPQ_002', 'RPQ_003', 'RPQ_004', 'INV_027'],
        bugs: ['BUG-012'],
    },
    {
        testId: 'E2E_019',
        testDescription: 'Flow 8: refused restocks - unknown order, missing fields, missing key, wrong role, no token',
        tags: ['e2e', 'restock', 'negative'],
        steps: ['RPQ_005', 'RPQ_006', 'RPQ_007', 'RPQ_008', 'RPQ_009', 'RPQ_010'],
    },
    {
        testId: 'E2E_020',
        testDescription: 'Flow 9: stock adds up across a delivery and a damage adjustment',
        tags: ['e2e', 'inventory'],
        steps: ['INV_001', 'INV_005', 'INV_006', 'INV_001', 'INV_007', 'INV_008', 'INV_009', 'INV_010', 'INV_011', 'INV_012', 'INV_002', 'INV_003', 'INV_004'],
    },
    {
        testId: 'E2E_021',
        testDescription: 'Flow 9: staff add, reprice and remove a catalog item',
        tags: ['e2e', 'inventory', 'catalog'],
        steps: ['INV_013', 'INV_014', 'INV_019', 'INV_020', 'INV_022', 'INV_023', 'INV_025', 'INV_015', 'INV_016', 'INV_017', 'INV_018', 'INV_021', 'INV_024', 'BTS_001'],
    },
    {
        testId: 'E2E_022',
        testDescription: 'Flow 9: stock still adds up after a full shop, order, cancel and restock journey',
        tags: ['e2e', 'inventory', 'order-flow'],
        steps: ['GUP_001', 'BC_005', 'PO_001', 'CWO_020', 'CWO_004', 'RPQ_001', 'INV_001', 'INV_026', 'INV_027', 'INV_028', 'INV_029', 'INV_030'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-012'],
    },
    {
        testId: 'E2E_023',
        testDescription: 'Flow 10: another customer order looks exactly like one that does not exist',
        tags: ['e2e', 'access'],
        steps: ['FO_012', 'FO_030', 'FO_031', 'CWO_022', 'PO_011', 'FO_001', 'FO_002'],
        bugs: ['BUG-001', 'BUG-010'],
    },
    {
        testId: 'E2E_024',
        testDescription: 'Flow 10: each role reaches only what it is allowed to',
        tags: ['e2e', 'access', 'negative'],
        steps: ['FO_003', 'FO_004', 'FO_013', 'FO_014', 'FO_017', 'FO_018', 'BC_003', 'INV_003', 'RD_003', 'RD_004', 'RD_005', 'RD_007', 'RD_008', 'RD_009', 'RD_006'],
    },
    {
        testId: 'E2E_025',
        testDescription: 'Rule 1 / Flow 2: refused quantities and an empty Idempotency-Key leave the cart exactly as it was',
        tags: ['e2e', 'cart', 'negative'],
        steps: ['BC_019', 'BC_020', 'BC_021', 'BC_022', 'BC_023', 'BC_024', 'BC_025', 'BC_026'],
        bugs: ['BUG-002', 'BUG-006', 'BUG-013'],
    },
    {
        testId: 'E2E_026',
        testDescription: 'Flow 2: adding a SKU already in the cart grows that line; an empty cart starts nothing',
        tags: ['e2e', 'cart'],
        steps: ['BC_027', 'BC_028', 'BC_029'],
        bugs: ['BUG-006', 'BUG-015'],
    },
    {
        testId: 'E2E_027',
        testDescription: 'Flow 2 / 3: an item taken off sale stays visible in the cart, can be removed, but cannot be ordered',
        tags: ['e2e', 'cart', 'order-flow'],
        steps: ['INV_032', 'BC_030', 'BC_031', 'PO_017', 'BC_011', 'PO_001'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007'],
    },
    {
        testId: 'E2E_028',
        testDescription: 'Flow 3: an empty cart cannot be ordered',
        tags: ['e2e', 'order-flow', 'negative'],
        steps: ['BC_013', 'PO_016'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-016'],
    },
    {
        testId: 'E2E_029',
        testDescription: 'Flow 3: a cart with one short item is refused whole and left untouched',
        tags: ['e2e', 'order-flow', 'negative'],
        steps: ['BC_032', 'PO_018', 'BC_033', 'FO_001', 'INV_030'],
        bugs: ['BUG-006', 'BUG-017'],
    },
    {
        testId: 'E2E_030',
        testDescription: 'Flow 3: an order keeps the name and price it was bought at',
        tags: ['e2e', 'order-flow'],
        steps: ['PO_001', 'INV_033', 'PO_019'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-018'],
    },
    {
        testId: 'E2E_031',
        testDescription: 'Flow 4: every skip, repeat or move after cancelling is rejected',
        tags: ['e2e', 'follow-order', 'negative'],
        steps: ['FO_039', 'FO_040', 'FO_043', 'FO_032', 'FO_041', 'FO_042', 'CWO_001', 'FO_044'],
        bugs: ['BUG-008'],
    },
    {
        testId: 'E2E_032',
        testDescription: 'Flow 4: a delivered order records when, and the timeline records each step and who did it',
        tags: ['e2e', 'follow-order'],
        steps: ['FO_032', 'FO_033', 'FO_034', 'FO_035', 'FO_045', 'FO_046'],
    },
    {
        testId: 'E2E_033',
        testDescription: 'Flow 5: a cancel replayed with the same key repeats the reply; a second cancel with a new key is refused',
        tags: ['e2e', 'cancel', 'idempotency'],
        steps: ['CWO_001', 'CWO_002', 'CWO_023', 'PO_011', 'INV_026'],
        bugs: ['BUG-010', 'BUG-019'],
    },
    {
        testId: 'E2E_034',
        testDescription: 'Flow 5 / 8: staff cancel an order out for delivery; its unit waits for restock and is restocked',
        tags: ['e2e', 'cancel', 'restock'],
        steps: ['CWO_024', 'RPQ_017', 'INV_028'],
        bugs: ['BUG-020'],
    },
    {
        testId: 'E2E_035',
        testDescription: 'Flow 5 / 6: cancelling after giving up part of an order cancels what is left',
        tags: ['e2e', 'cancel', 'give-up'],
        steps: ['GUP_015', 'CWO_025', 'INV_026'],
        bugs: ['BUG-010'],
    },
    {
        testId: 'E2E_036',
        testDescription: 'Flow 6: give up units once per key, back on sale, down to the last unit',
        tags: ['e2e', 'give-up', 'idempotency'],
        steps: ['GUP_015', 'GUP_015', 'INV_034', 'GUP_013', 'GUP_010'],
        bugs: ['BUG-010'],
    },
    {
        testId: 'E2E_037',
        testDescription: 'Flow 6: units cannot be given up once staff start packing',
        tags: ['e2e', 'give-up', 'negative'],
        steps: ['FO_019', 'GUP_012'],
    },
    {
        testId: 'E2E_038',
        testDescription: 'Flow 7: each customer has their own allowance, and a missing order is still not found at the limit',
        tags: ['e2e', 'cancel', 'allowance'],
        steps: ['CWO_001', 'CWO_004', 'PO_001', 'CWO_020', 'CWO_027', 'CWO_026'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-010', 'BUG-012'],
    },
    {
        testId: 'E2E_039',
        testDescription: 'Flow 7: the allowance resets at store midnight',
        tags: ['e2e', 'cancel', 'allowance', 'clock'],
        steps: ['RD_010', 'CWO_001', 'CWO_004', 'PO_001', 'CWO_020', 'RD_011', 'BC_005', 'PO_013', 'CWO_028'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-010', 'BUG-012'],
    },
    {
        testId: 'E2E_040',
        testDescription: 'Flow 7: the allowance does not reset at UTC midnight',
        tags: ['e2e', 'cancel', 'allowance', 'clock'],
        steps: ['RD_012', 'CWO_001', 'CWO_004', 'PO_001', 'CWO_020', 'RD_013', 'BC_005', 'PO_013', 'CWO_029', 'RD_014'],
        bugs: ['BUG-004', 'BUG-006', 'BUG-007', 'BUG-010', 'BUG-012'],
    },
    {
        testId: 'E2E_041',
        testDescription: 'Flow 8: pending units are restocked in parts; wrong line, uncancelled order and bad quantities are refused',
        tags: ['e2e', 'restock'],
        steps: ['CWO_004', 'RPQ_011', 'RPQ_015', 'RPQ_016', 'RPQ_013', 'RPQ_012', 'RPQ_004', 'RPQ_014', 'INV_027'],
        bugs: ['BUG-012'],
    },
    {
        testId: 'E2E_042',
        testDescription: 'Flow 9: adjustments replay once, cannot reuse an adjustmentId, and cannot take out units that do not exist',
        tags: ['e2e', 'inventory', 'idempotency'],
        steps: ['INV_036', 'INV_036', 'INV_037', 'INV_035', 'INV_001'],
    },
    {
        testId: 'E2E_043',
        testDescription: 'Flow 9: invalid catalog items are refused; a new item has inventory that adds up',
        tags: ['e2e', 'inventory', 'catalog', 'negative'],
        steps: ['INV_038', 'INV_039', 'INV_040', 'INV_013', 'INV_041', 'INV_025', 'INV_041'],
    },
    {
        testId: 'E2E_044',
        testDescription: 'Flow 10: another customer order is indistinguishable from a missing one, everywhere',
        tags: ['e2e', 'access'],
        steps: ['FO_049', 'FO_050', 'GUP_014', 'FO_047', 'FO_048', 'BC_034'],
        bugs: ['BUG-001'],
    },
    {
        testId: 'E2E_045',
        testDescription: 'Flow 10: malformed Authorization headers are rejected',
        tags: ['e2e', 'access', 'negative'],
        steps: ['BTS_007', 'BTS_008', 'BTS_009'],
    },
];

test.beforeEach(async ({ request }) => {
    // every flow starts from the standard fixture
    await executeApi(request, 'RD_001');
});

for (const { testId, testDescription, tags, steps, bugs = [] } of testData) {
    // @bug marks every flow that fails on a known bug; @BUG-xxx finds the flows hit by one bug
    const bugDetails = knownBugDetails(bugs);
    const details = { tag: [...tags.map(tag => `@${tag}`), ...bugDetails.tag], annotation: bugDetails.annotation };
    test(`${testId}: ${testDescription}`, details, async ({ request, db }) => {
        await executeFlow(request, steps, db);
    });
}
