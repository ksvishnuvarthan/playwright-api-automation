import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';

export type Category = 'DAIRY' | 'PRODUCE' | 'CHILLED' | 'FROZEN' | 'SHELF_STABLE';

export interface CatalogItemInput {
    sku: string;
    name: string;
    category: Category;
    priceMinor: number;
    initialStock: number;
}

/** /admin/catalog - staff manage what is for sale. */
export class CatalogAdminApi extends BaseApi{

    async addItem(input: CatalogItemInput, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.post('/admin/catalog', this.writeOptions(options, input));
    }

    async updateItem(input: { sku: string } & Partial<Omit<CatalogItemInput, 'sku' | 'initialStock'>>, options?: ApiCallOptions): Promise<APIResponse> {
        const { sku, ...body } = input;
        return this.http.patch(`/admin/catalog/${sku}`, this.writeOptions(options, body));
    }

    async removeItem(input: { sku: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.delete(`/admin/catalog/${input.sku}`, this.writeOptions(options));
    }

}
