import { test as base } from '@playwright/test';
import { PostgresDb } from './PostgresDb';

/**
 * Playwright test with a `db` fixture: one Postgres connection pool per worker, closed when the worker ends.
 * When the database cannot be reached, `db` is undefined so the API checks still run; every test then
 * carries a "db-validation" annotation saying the database checks were skipped and why.
 */
export const test = base.extend<{ db: PostgresDb | undefined }, { workerDb: { db?: PostgresDb; unavailableReason?: string } }>({
    workerDb: [async ({}, use) => {
        const db = new PostgresDb();
        try {
            await db.query('select 1');
        } catch (error: any) {
            await db.close();
            await use({ unavailableReason: error?.message ?? String(error) });
            return;
        }
        await use({ db });
        await db.close();
    }, { scope: 'worker' }],

    db: async ({ workerDb }, use, testInfo) => {
        if (!workerDb.db) {
            testInfo.annotations.push({ type: 'db-validation', description: `Skipped: ${workerDb.unavailableReason}` });
        }
        await use(workerDb.db);
    },
});

export { expect } from '@playwright/test';
