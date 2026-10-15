import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';

/** /test - reset the data, and read or move the server clock. Needs the test harness token. */
export class TestHarnessApi extends BaseApi{

    async reset(input: { fixture: 'standard' | 'empty' }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.post('/test/reset', { headers: options?.headers, data: input });
    }

    /** Moves the server clock, e.g. across store midnight. */
    async setClock(input: { now: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.put('/test/clock', { headers: options?.headers, data: input });
    }

    async getClock(options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get('/test/clock', this.readOptions(options));
    }

}
