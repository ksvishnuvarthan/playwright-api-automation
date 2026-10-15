# API test framework

Playwright + TypeScript API tests for the **Order Lifecycle Service**: one store, two customers, a cart, orders, cancellations, restocks and inventory. Expectations come from the service brief (`BRIEF.md`). The suite drives the HTTP API, then validates what the service wrote directly in its Postgres database.

- **62 tests** in 3 spec files, built from **228 data-driven API test cases**
- **14 database rules** from the brief, checked after every flow
- **20 known service bugs**, catalogued and tagged on the tests they break

---

## Contents

1. [Prerequisites](#prerequisites)
2. [Start the service (Docker)](#start-the-service-docker)
3. [Set up the test project](#set-up-the-test-project)
4. [Run the tests](#run-the-tests)
5. [How the framework works](#how-the-framework-works)
6. [Project structure](#project-structure)
7. [Writing tests](#writing-tests)
8. [Known bugs](#known-bugs)
9. [Parallel execution](#parallel-execution)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version used |
|---|---|
| Docker Desktop (running) | with Docker Compose v2 |
| Node.js | 24.x (any current LTS works) |
| npm | comes with Node.js |
| The service pack | `order-lifecycle-pack-1.0.0.zip`, provided with the brief |

> **CPU architecture:** both images in the pack are built for `linux/arm64` only. They run natively on Apple Silicon Macs and other ARM machines. On Intel/AMD (x86-64) machines they need emulation:
> - Docker Desktop on Windows, or on an Intel Mac, includes emulation; expect slower start-up.
> - On Linux with plain Docker Engine, install QEMU binfmt first: `docker run --privileged --rm tonistiigi/binfmt --install arm64`.

---

## Start the service (Docker)

The service ships as an offline pack (`order-lifecycle-pack-1.0.0.zip`). It contains a `docker-compose.yml` and both images as tar files, so nothing is pulled from a registry.

### Docker images

| Service | Image | Port | Notes |
|---|---|---|---|
| `api` | `ofx/order-lifecycle-service:1.0.0` | `8080` | Node.js API; `pull_policy: never`, so it must be loaded from the pack |
| `db` | `postgres:16-alpine` | `5432` inside the network; **`5433` on your machine** with the override below | user, password and database are all `orders`; data lives on `tmpfs`, so it is wiped whenever the container is recreated |

### 1. Unzip the pack and load the images

```bash
unzip order-lifecycle-pack-1.0.0.zip
cd order-lifecycle

docker load -i order-lifecycle-service-1.0.0-image.tar.gz
docker load -i postgres-16-alpine-image.tar.gz
```

### 2. Publish the database for the tests

The pack's `docker-compose.yml` does not expose Postgres to your machine, and the tests need it for database validation. Copy the override from this repo next to the pack's compose file. Compose picks it up automatically and publishes the database on `localhost:5433`.

```bash
cp <path-to-this-repo>/docker/docker-compose.override.yml .
```

```yaml
# docker/docker-compose.override.yml
services:
  db:
    ports:
      - "5433:5432"
```

### 3. Start, check, stop

```bash
docker compose up -d                  # start (first run takes a minute)
docker compose ps                     # both services should be healthy
curl -s http://localhost:8080/health  # {"status":"ok","contractVersion":"1.0.0","fixtureVersion":"1.0.0"}

docker compose down                   # stop
docker compose down -v                # stop and wipe the database
docker compose logs api               # why the API did not start
```

**If the API exits after the database is recreated, restart it.** Recreating the `db` container (for example when adding the override to a running stack) drops the API's connections, and it exits:

```bash
docker compose restart api
```

### Reset the data

You don't need to restart anything to get back to clean data. The suite resets the fixtures before every test; to reset by hand:

```bash
curl -s -X POST http://localhost:8080/test/reset \
  -H 'Authorization: Bearer test-token' -H 'Content-Type: application/json' \
  -d '{"fixture":"standard"}'
```

---

## Set up the test project

```bash
npm ci
cp .env.example .env
```

`.env` (git-ignored) holds the API URL, one token per role, and the database connection:

| Variable | Default | Used for |
|---|---|---|
| `BASE_URL` | `http://localhost:8080` | API under test |
| `CUSTOMER_A_TOKEN`, `CUSTOMER_B_TOKEN` | `customer-a-token`, `customer-b-token` | the two customers |
| `STAFF_TOKEN` | `staff-token` | store staff (`/internal`, `/admin`) |
| `TEST_TOKEN` | `test-token` | test harness (`/test/reset`, `/test/clock`) |
| `DB_HOST`, `DB_PORT` | `localhost`, `5433` | Postgres published by the override |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | `orders` | Postgres credentials from the pack |

The tests only call the API, so no browser install is needed.

---

## Run the tests

| Command | What it runs |
|---|---|
| `npx playwright test` | everything in `tests/` (62 tests) |
| `npx playwright test tests/orderFlow.spec.ts` | one spec file |
| `npx playwright test -g "E2E_017"` | tests whose title matches |
| `npx playwright test --grep-invert @bug` | only the tests expected to pass |
| `npx playwright test --grep @bug` | only the tests that fail on known bugs |
| `npx playwright test --grep @BUG-004` | the tests broken by one bug |
| `npx playwright test --grep @cancel` | by feature tag (`@cart`, `@order-flow`, `@follow-order`, `@cancel`, `@give-up`, `@allowance`, `@restock`, `@inventory`, `@access`, `@idempotency`, `@concurrency`, `@robustness`, `@negative`, `@clock`) |
| `npx playwright test --list` | list tests without running them |
| `npx playwright show-report` | open the HTML report of the last run |

**Reading the report:**

- Each API call appears as a step named `<test id> - <description>`.
- Database checks appear as a `DB: ...` step.
- Failing tests carry one annotation per known bug, with the full description.
- If the database was unreachable, each test carries a `db-validation: Skipped ...` note, and the API checks still run.

**What to expect today:** 22 tests pass. The other 40 all carry `@bug` and fail on known service bugs, which are described in `TestData/KnownBugs.ts`.

---

## How the framework works

```
tests/*.spec.ts                       flows: lists of test ids, or hand-written scenarios
      │
Utils/ApiFlowUtils.ts                 executeFlow / executeApi: runs ids, checks status,
      │                               code and body, replays, refused writes, DB rules
      ├── TestData/*TestData.ts       one entry per test id: api + action + input + role + expected result
      ├── Apis/*Api.ts                one class per API, named methods, built on BaseApi
      │      └── Utils/ApiBaseUtils.ts    HTTP: get / post / put / patch / delete
      └── Utils/DbValidations.ts      SQL rules from the brief, via Utils/PostgresDb.ts
```

### API layer: one class per API (`Apis/`)

| Class | Methods | Endpoints |
|---|---|---|
| `CatalogApi` | `getCatalog` | `GET /catalog` |
| `CartApi` | `getCart`, `addItem`, `setQuantity`, `removeItem`, `clear` | `/cart`, `/cart/items[/{sku}]` |
| `OrdersApi` | `placeOrder`, `listOrders`, `getOrder`, `getTimeline`, `cancel`, `removeUnits` | `/orders/...`, what a customer does with their own orders |
| `OrderOperationsApi` | `advance`, `cancel`, `restock` | `/internal/orders/...`, `/admin/orders/...`, what staff do to orders |
| `InventoryApi` | `getInventory`, `adjust` | `/admin/inventory/{sku}[/adjustments]` |
| `CatalogAdminApi` | `addItem`, `updateItem`, `removeItem` | `/admin/catalog[/{sku}]` |
| `TestHarnessApi` | `reset`, `setClock`, `getClock` | `/test/reset`, `/test/clock` |

`BaseApi` handles what every call shares:

- the base URL from `.env`;
- the bearer token for a role (`'CUSTOMER_A_TOKEN'`, …, or `null` for none);
- a fresh `Idempotency-Key` on every write, unless you pass a fixed key, or `null` to send none;
- extra headers and a request timeout.

A spec can use an API directly:

```ts
const cart = new CartApi(request, 'CUSTOMER_A_TOKEN');
const response = await cart.addItem({ sku: 'EGGS', quantity: 1 });
```

`Apis/ApiRegistry.ts` maps an API name (`'cart'`, `'orders'`, …) to its class. TypeScript checks that every test case names a method its API really has, so `api: 'cart', action: 'placeOrder'` fails to compile.

### Test data: one entry per API call (`TestData/`)

Each file groups the cases for one flow of the brief, with the brief's text for that flow at the top of the file. Every case has a **unique id across all files** (enforced when the suite loads):

```ts
BC_009: {
    description: 'Customer A can change the quantity of an item in the cart',
    api: 'cart',
    action: 'setQuantity',
    input: { sku: 'MILK', quantity: 2 },     // path params, query and body together
    tokenEnvKey: 'CUSTOMER_A_TOKEN',         // role, or null for no token
    expectedStatus: 200,
    expectedCode: 'VALIDATION_ERROR',        // optional: error code on a failure
    expectedBody: { items: [...] },          // optional: partial match on the response
    idempotencyKey: 'fixed-key',             // optional: fixed key, to test replays
    sendIdempotencyKey: false,               // optional: send no key
    headers: { Authorization: 'Bearer x' },  // optional: override headers
},
```

| File | Prefix | Flow in the brief |
|---|---|---|
| `BrowseTheStoreTestData.ts` | `BTS_` | 1: browse the store, and Authorization header checks |
| `BuildCartTestData.ts` | `BC_` | 2: build a cart |
| `PlaceOrderTestData.ts` | `PO_` | 3: place the order |
| `FollowOrderTestData.ts` | `FO_` | 4: follow it to the door, and reading orders |
| `CancelWholeOrderTestData.ts` | `CWO_` | 5: cancel the whole order, and 7: daily allowance |
| `GiveUpPartOrderTestData.ts` | `GUP_` | 6: give up part of an order |
| `RestockPendingQuantityTestData.ts` | `RPQ_` | 8: cancelled stock goes back on the shelf |
| `InventoryTestData.ts` | `INV_` | 9: stock adds up, and catalog admin |
| `ResetDataTestData.ts` | `RD_` | test harness: reset and clock |

**Run-time values:** `input` can use `{orderId}` and `{cartId}`. `executeFlow` fills them from the last order or cart seen in a response, so a flow can place an order and then cancel *that* order.

### Flow runner (`Utils/ApiFlowUtils.ts`)

`executeApi(request, id)` calls the API behind a test id as a reported step. It checks `expectedStatus`, `expectedCode` and `expectedBody` with soft assertions, so one failure doesn't hide the rest of the flow.

`executeFlow(request, ids, db)` runs a list of ids in order and adds checks from the brief's global rules:

| Check | Rule from the brief |
|---|---|
| Every failure has `code`, `requestId` and `details`, and is never `INTERNAL_ERROR` | Flow 10 |
| Every inventory response has `reconciles: true` | Flow 9 |
| A replay with the same fixed key returns `Idempotency-Replayed: true` and the same reply | Rule 1 |
| A refused write changes nothing: the database is snapshotted before and after | Rule 2 |
| Every order the API returns matches its row and lines in the database | Data integrity |
| All database rules hold when the flow ends | See below |

### Database validation layer (`Utils/PostgresDb.ts`, `Utils/DbValidations.ts`, `Utils/fixtures.ts`)

- **`PostgresDb`:** a `pg` connection pool configured from `.env`, with `query`, `queryOne` and `close`.
- **`fixtures.ts`:** extends Playwright's `test` with a `db` fixture, one pool per worker. If the database can't be reached, `db` is `undefined`, the API checks still run, and the report notes that the database checks were skipped.
- **`DB_INVARIANTS`:** each rule is a SQL query that returns the rows breaking it, so an empty result is a pass.

| # | Rule |
|---|---|
| 1 | Every unit of a SKU sits in exactly one bucket (buckets add up to opening stock + adjustments) |
| 2 | No stock bucket is negative |
| 3 | A cart does not hold stock (`cart_held` is 0) |
| 4 | One cart becomes at most one order |
| 5 | A placed order closes its cart |
| 6 | An order total is what was bought, frozen at the moment of ordering |
| 7 | The timeline runs 1..n with no gaps, and placing the order is entry 1 |
| 8 | The order status is the last status recorded on its timeline |
| 9 | Cancelled units stay between 0 and what was ordered; a cancelled order has every unit cancelled |
| 10 | A customer cannot have cancelled an order once it was OUT_FOR_DELIVERY |
| 11 | At most three successful whole-order cancellations per customer per store day |
| 12 | An order is cancelled at most once (a replayed cancel records nothing new) |
| 13 | A staff cancel spends no allowance |
| 14 | Restock pending never goes below zero or above what was cancelled |

### Spec files (`tests/`)

| Spec | Style | Covers |
|---|---|---|
| `orderFlow.spec.ts` | data-driven: 45 flows (`E2E_001`–`E2E_045`), each a list of test ids | all ten flows of the brief, the allowance across store and UTC midnight (`setClock`), access rules |
| `concurrency.spec.ts` | hand-written with the API classes | same key sent twice at once, a retry after a timeout, two checkouts of one cart, two customers racing for the last unit |
| `robustness.spec.ts` | hand-written, raw requests | unknown routes, malformed or non-JSON bodies, oversized quantities, odd idempotency keys, keys shared between customers and operations, unique request ids |

Every test starts from the standard fixture (`RD_001` / `TestHarnessApi.reset`).

---

## Project structure

```
Apis/                    one class per API + BaseApi + ApiRegistry
TestData/                test cases per flow, ApiTestData type, KnownBugs catalogue
Utils/
  ApiBaseUtils.ts        HTTP wrapper over Playwright's APIRequestContext
  ApiFlowUtils.ts        executeApi / executeFlow
  TestDataUtils.ts       {orderId}/{cartId} substitution
  PostgresDb.ts          Postgres connection
  DbValidations.ts       database rules, refused-write snapshot, API-vs-DB order check
  fixtures.ts            Playwright test with the db fixture
tests/                   spec files
docker/                  docker-compose.override.yml for the service pack
playwright.config.ts     one project ("api"), 1 worker, HTML report, loads .env
.env.example             copy to .env
```

---

## Writing tests

**A new API call.** Add an entry with a new unique id to the matching `TestData/*TestData.ts` file. TypeScript checks that the `api`/`action` pair exists.

**A new flow.** Add an entry to `testData` in `tests/orderFlow.spec.ts`:

```ts
{
    testId: 'E2E_046',
    testDescription: 'Flow 3: ...',
    tags: ['e2e', 'order-flow'],
    steps: ['BC_005', 'PO_001', 'PO_014', 'INV_001'],
    bugs: ['BUG-004'],   // only while a known bug makes it fail
},
```

**A scenario steps can't express** (parallel requests, raw requests). Write it by hand with the API classes, and import `test` from `Utils/fixtures` to get `db`:

```ts
import { CartApi } from '../Apis/CartApi';
import { expect, test } from '../Utils/fixtures';

test('...', async ({ request, db }) => {
    const reply = await new CartApi(request, 'CUSTOMER_A_TOKEN').getCart();
    expect(reply.status()).toBe(200);
});
```

**A new database rule.** Add `{ rule, sql }` to `DB_INVARIANTS`. The query should return the rows that break the rule.

---

## Known bugs

`TestData/KnownBugs.ts` catalogues every bug found against the brief. Each entry gives the expected behaviour, the actual behaviour, and the test ids or database rule that catch it.

- **Tagging a test:** list the bug ids on the test (`bugs: [...]` in a flow, or `withBugs(...)` in the hand-written specs). The test gets the tags `@bug` and `@BUG-xxx` and a report annotation per bug.
- **Temporary:** the tags exist only while the bug does. Once it is fixed, remove the id from the tests and the catalogue.

---

## Parallel execution

The suite runs on **one worker, on purpose** (`workers: 1`, `fullyParallel: false`), because the service holds one shared state:

- `/test/reset` wipes everything for every test, not just the caller's data.
- Tests share fixture orders and carts, and each customer has a single cart and daily allowance.
- Stock and the server clock are global.
- The database checks look at the whole database.

Parallel workers would reset and change each other's data mid-test. The full run takes about 20 seconds. To parallelise, run one service stack per worker (`docker compose -p olc-<n>` on separate ports) and pick `BASE_URL` and `DB_PORT` from Playwright's `workerIndex`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Report shows `db-validation: Skipped: Cannot reach Postgres at localhost:5433` | The database isn't published. Add `docker/docker-compose.override.yml` to the pack folder and run `docker compose up -d`. |
| API `curl` fails after `docker compose up -d` | The API lost its database connection. Run `docker compose restart api`. |
| `BASE_URL is not set in .env` | Run `cp .env.example .env`. |
| `pull access denied for ofx/order-lifecycle-service` | Load the images from the pack (`docker load -i ...`). |
| A test passes on its own but fails in the full run | Data from another test. Every test must start with a reset, and the suite must run on one worker. |
| CI (`.github/workflows/playwright.yml`) fails on every test | The workflow runs `npx playwright test` but doesn't start the service. Add steps to load the images and run `docker compose up -d` with the override first. |
