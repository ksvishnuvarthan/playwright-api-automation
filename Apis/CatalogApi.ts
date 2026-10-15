import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';

/** GET /catalog - what is for sale, what it costs, and how much is buyable right now. */
export class CatalogApi extends BaseApi{

    async getCatalog(options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get('/catalog', this.readOptions(options));
    }

}
