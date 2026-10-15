import { randomUUID } from 'crypto';
import { APIRequestContext } from '@playwright/test';
import { ApiBaseUtils, ApiRequestOptions } from '../Utils/ApiBaseUtils';

/** Name of the .env variable holding the bearer token of each role. */
export type TokenEnvKey = 'CUSTOMER_A_TOKEN' | 'CUSTOMER_B_TOKEN' | 'STAFF_TOKEN' | 'TEST_TOKEN';

export interface ApiCallOptions {
    /** Idempotency-Key for a write. A fresh key is generated when omitted; null sends none. */
    idempotencyKey?: string | null;
    /** Extra headers, applied last (e.g. to send an invalid Authorization header). */
    headers?: Record<string, string>;
    /** Request timeout in milliseconds. */
    timeout?: number;
}

export abstract class BaseApi{

    protected readonly http: ApiBaseUtils;

    /** tokenEnvKey null sends no Authorization header. */
    constructor(request: APIRequestContext, tokenEnvKey: TokenEnvKey | null) {
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('BASE_URL is not set in .env');
        }
        this.http = new ApiBaseUtils(request, baseUrl, BaseApi.authHeader(tokenEnvKey));
    }

    protected readOptions(options?: ApiCallOptions, params?: ApiRequestOptions['params']): ApiRequestOptions {
        return { headers: options?.headers, params, timeout: options?.timeout };
    }

    protected writeOptions(options?: ApiCallOptions, data?: unknown): ApiRequestOptions {
        const idempotencyKey = options?.idempotencyKey === undefined ? randomUUID() : options.idempotencyKey;
        return {
            headers: { ...(idempotencyKey === null ? {} : { 'Idempotency-Key': idempotencyKey }), ...options?.headers },
            data,
            timeout: options?.timeout,
        };
    }

    private static authHeader(tokenEnvKey: TokenEnvKey | null): Record<string, string> {
        if (!tokenEnvKey) {
            return {};
        }
        const token = process.env[tokenEnvKey];
        if (!token) {
            throw new Error(`${tokenEnvKey} is not set in .env`);
        }
        return { Authorization: `Bearer ${token}` };
    }

}
