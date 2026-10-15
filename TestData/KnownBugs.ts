/**
 * Service bugs found by the flows, against the brief (BRIEF.md).
 * Temporary: a flow lists the bugs that make it fail; remove the id from the flow
 * (and the entry here) once the service is fixed and the flow passes.
 */
export const KNOWN_BUGS = {
    'BUG-001': {
        title: 'A customer can read, follow and cancel another customer\'s order',
        description: 'Flow 10: another customer\'s order must look exactly like one that does not exist (404 ORDER_NOT_FOUND). ' +
            'Actual: with Customer B\'s token, GET /orders/order-placed-a and its /timeline return 200 with Customer A\'s data, ' +
            'POST /orders/order-placed-a/cancel returns 200 and cancels Customer A\'s order, and POST .../items/line-placed-a-rice/remove returns 200 and removes units from it. ' +
            '(FO_030, FO_031, FO_050, CWO_022, GUP_014)',
    },
    'BUG-002': {
        title: 'Invalid cart quantities are accepted: zero, negative, and numbers sent as text',
        description: 'Flow 2: quantity must be a whole number of at least 1; anything else is refused (400 VALIDATION_ERROR) and the cart is left as it was. ' +
            'Actual: POST /cart/items with quantity 0 returns 200 and adds a second MILK line with quantity 0; ' +
            'PUT /cart/items/MILK with quantity 0 returns 200 and sets the line to 0; quantity -1 and quantity "2" (a string) are also accepted with 200. ' +
            '(BC_015, BC_017, BC_020, BC_022)',
    },
    'BUG-003': {
        title: 'Adding an unknown SKU to the cart returns 500',
        description: 'Flow 2 / Flow 10: an unknown SKU should be refused with 404 SKU_NOT_FOUND; INTERNAL_ERROR is never a correct answer to a bad request. ' +
            'Actual: POST /cart/items with sku NOPE returns 500 INTERNAL_ERROR. (BC_016)',
    },
    'BUG-004': {
        title: 'Placing an order does not close the cart, so one cart can be ordered again',
        description: 'Flow 3: a placed order closes the cart; the next cart action starts a fresh one. ' +
            'Actual: after POST /orders, cart-a stays ACTIVE in the carts table, and a second POST /orders for cart-a with a new key returns 201 ' +
            'and creates another order from the same cart. Two checkouts of one cart at the same time both return 201, so the row lock the team describes does not hold. ' +
            '(PO_004; concurrency spec; DB rules "one cart becomes at most one order", "a placed order closes its cart")',
    },
    'BUG-005': {
        title: 'Placing an order is not idempotent',
        description: 'Rule 1: the same Idempotency-Key sent twice means the work happens once; the second reply repeats the first with Idempotency-Replayed: true. ' +
            'Actual: replaying POST /orders with the same key returns 201 with a different order id, creating a duplicate order. ' +
            'The same happens when the two requests arrive at once, and when the first attempt timed out and is retried. ' +
            'The status check passes, so this is caught by the DB rule "one cart becomes at most one order". (PO_002)',
    },
    'BUG-006': {
        title: 'Cart actions move stock, and placing an order loses units',
        description: 'Flow 2 / Flow 9: a cart does not hold stock, and every unit of a SKU sits in exactly one bucket. ' +
            'Actual: cart writes drive the cartHeld bucket negative (e.g. BREAD -2, MILK -3), and after an order is placed ' +
            'the buckets no longer add up (e.g. BREAD 21 of 23, MILK 17 of 18, EGGS 14 of 15), so reconciles is false. ' +
            '(INV_001, INV_027, INV_029; DB rules "a cart does not hold stock", "no stock bucket is negative", "buckets add up")',
    },
    'BUG-007': {
        title: 'Placing an order writes no timeline entry',
        description: 'Flow 4: every order keeps a record of what happened to it, and placing the order is the first entry. ' +
            'Actual: orders placed through POST /orders have no PLACED entry in order_timeline; when such an order is later cancelled, ' +
            'its first entry is CANCELLED. (DB rule "the timeline runs 1..n with no gaps, and placing the order is entry 1")',
    },
    'BUG-008': {
        title: 'Staff can advance an order more than one step at a time',
        description: 'Flow 4: an order moves one step at a time, in order (409 INVALID_TRANSITION otherwise). ' +
            'Actual: every skip is accepted with 200 - PLACED to PACKED, PLACED to OUT_FOR_DELIVERY, PLACED to DELIVERED, PACKED to DELIVERED - ' +
            'and skipping drives stock buckets negative (e.g. RICE reservedOffShelf -2). (FO_037, FO_039, FO_040, FO_042)',
    },
    'BUG-009': {
        title: 'A customer can cancel an order that is out for delivery or delivered',
        description: 'Flow 5: once the order is with a rider the customer cannot cancel (409 CANCELLATION_NOT_ALLOWED). ' +
            'Actual: POST /orders/order-outbound-a/cancel returns 200 and the OUT_FOR_DELIVERY order becomes CANCELLED; ' +
            'POST /orders/order-delivered-a/cancel returns 200 and leaves the order DELIVERED. ' +
            '(CWO_005, CWO_006; DB rule "a customer cannot have cancelled an order once it was OUT_FOR_DELIVERY")',
    },
    'BUG-010': {
        title: 'Cancelling an order frees more units than it held',
        description: 'Flow 5 / Flow 9: cancelling frees the units the order held, once. ' +
            'Actual: after cancelling a PLACED order the SKU has more units than exist, e.g. RICE 22 of 20 after cancelling order-placed-a ' +
            '(2 units), BREAD 24 of 23 after staff cancel order-placed-b (1 unit). (INV_001, INV_026; DB rule "buckets add up")',
    },
    'BUG-011': {
        title: 'Units from an order cancelled in PACKING wait for restock instead of going back on sale',
        description: 'Flow 8: units from an order cancelled while PLACED or PACKING go straight back to sellable. ' +
            'Actual: cancelling order-placed-a after it was advanced to PACKING puts its 2 RICE units in pendingRestock, ' +
            'and RICE no longer adds up (22 of 20). (E2E_013: FO_032, CWO_001, INV_026)',
    },
    'BUG-012': {
        title: 'Units from a cancelled PACKED order are counted twice',
        description: 'Flow 8 / Flow 9: units from an order cancelled once PACKED wait for staff to restock them, and stock must still add up. ' +
            'Actual: cancelling order-packed-a adds its 3 EGGS to pendingRestock without taking them out of their previous bucket (EGGS 18 of 15), ' +
            'and restocking them adds 3 more to available. (CWO_004, RPQ_001, INV_027)',
    },
    'BUG-013': {
        title: 'Malformed cart quantities crash the service with 500',
        description: 'Flow 2 / Flow 10: a quantity that is not a whole number of at least 1 is refused with 400 VALIDATION_ERROR; INTERNAL_ERROR is never a correct answer to a bad request. ' +
            'Actual: POST /cart/items with quantity 1.5, null, or 2147483648, and PUT /cart/items/MILK with quantity 1.5 or with no quantity, ' +
            'all return 500 INTERNAL_ERROR. (BC_019, BC_021, BC_023, BC_024; robustness spec)',
    },
    'BUG-014': {
        title: 'Unknown routes and malformed JSON return 500',
        description: 'Flow 10: INTERNAL_ERROR is never a correct answer to a bad request, and every failure carries a request id. ' +
            'Actual: GET /products, /carts, /orders/{id}/status and /admin/catalog return 500 INTERNAL_ERROR instead of 404; ' +
            'a write with malformed JSON returns 500 with requestId "unknown". (robustness spec)',
    },
    'BUG-015': {
        title: 'Adding a SKU that is already in the cart adds a second line',
        description: 'Flow 2: adding a SKU that is already in the cart increases that line. ' +
            'Actual: with BREAD x2 in cart-a, POST /cart/items with BREAD x1 returns a cart with two BREAD lines (2 and 1) instead of one line of 3. (BC_027)',
    },
    'BUG-016': {
        title: 'An empty cart can be ordered',
        description: 'Flow 3: placing an order from an empty cart is refused with 409 CART_EMPTY. ' +
            'Actual: after DELETE /cart, POST /orders for cart-a returns 201 and creates an order with no items and a total of 0. (PO_016)',
    },
    'BUG-017': {
        title: 'A refused checkout still claims stock, and does not say which items were short',
        description: 'Flow 3 / rule 2: if anything is short the whole checkout is refused, the cart and stock are untouched, and the customer is told which items were short ' +
            'and how many were really available. Actual: with OATS x5 (1 in stock) in cart-a, POST /orders returns 409 INSUFFICIENT_STOCK with empty details, ' +
            'and BREAD and MILK have already moved from available to reservedOnShelf, so stock no longer adds up. ' +
            'With only OATS in the cart, the refused checkout still moves its units between buckets (cartHeld 5 -> 0, available -4 -> 1). ' +
            '(PO_015, PO_018; DB check "a refused write leaves nothing behind")',
    },
    'BUG-018': {
        title: 'An order does not keep the price it was bought at',
        description: 'Flow 3: the order freezes the name and price at the moment it was placed; a later catalog price change does not rewrite it. ' +
            'Actual: after staff change BREAD from 4500 to 5000, GET /orders/{id} shows BREAD at 5000 and a total of 16600, ' +
            'while the database still holds 4500 and 15600 - the response is rebuilt from the catalog, as the team notes describe. (PO_019)',
    },
    'BUG-019': {
        title: 'An order that is already cancelled can be cancelled again',
        description: 'Flow 5: cancelling the same order again with the same key is harmless; a cancelled order cannot be cancelled again with a new key. ' +
            'Actual: POST /orders/order-placed-a/cancel with a new key on an already CANCELLED order returns 200. (CWO_023)',
    },
    'BUG-020': {
        title: 'Units from an order cancelled out for delivery go straight back on sale',
        description: 'Flow 8: units from an order cancelled once it was PACKED or later wait to be put back on the shelf by hand. ' +
            'Actual: staff cancelling order-outbound-a (OUT_FOR_DELIVERY) returns cancellationRestockPendingQuantity 0, ' +
            'and restocking its COFFEE unit is refused with QUANTITY_EXCEEDED. (CWO_024, RPQ_017)',
    },
} as const;

export type BugId = keyof typeof KNOWN_BUGS;

/** Test details for a test that fails on known bugs: @bug and @BUG-xxx tags, and one report annotation per bug. */
export function knownBugDetails(bugs: readonly BugId[]): { tag: string[]; annotation: { type: string; description: string }[] } {
    return {
        tag: bugs.length ? ['@bug', ...bugs.map(bug => `@${bug}`)] : [],
        annotation: bugs.map(bug => ({ type: bug, description: `${KNOWN_BUGS[bug].title}. ${KNOWN_BUGS[bug].description}` })),
    };
}
