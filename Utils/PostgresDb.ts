import { Pool, QueryResultRow } from 'pg';

/** Connection to the order-lifecycle Postgres database, configured from .env. */
export class PostgresDb{

    private readonly pool: Pool;

    constructor() {
        this.pool = new Pool({
            host: PostgresDb.env('DB_HOST'),
            port: Number(PostgresDb.env('DB_PORT')),
            user: PostgresDb.env('DB_USER'),
            password: PostgresDb.env('DB_PASSWORD'),
            database: PostgresDb.env('DB_NAME'),
            max: 2,
            connectionTimeoutMillis: 5000,
        });
    }

    /** Runs a parameterised query ($1, $2, ...) and returns its rows. */
    async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
        try {
            const result = await this.pool.query<T>(sql, params);
            return result.rows;
        } catch (error: any) {
            if (error?.code === 'ECONNREFUSED') {
                throw new Error(`Cannot reach Postgres at ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
                    'Is the order-lifecycle db published (docker-compose.override.yml, then docker compose up -d)?');
            }
            throw error;
        }
    }

    async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | undefined> {
        const rows = await this.query<T>(sql, params);
        return rows[0];
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    private static env(name: string): string {
        const value = process.env[name];
        if (!value) {
            throw new Error(`${name} is not set in .env`);
        }
        return value;
    }

}
