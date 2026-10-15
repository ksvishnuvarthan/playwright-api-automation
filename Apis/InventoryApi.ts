import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';

export interface InventoryAdjustmentInput {
    sku: string;
    adjustmentId: string;
    delta: number;
    reason: string;
}

/** /admin/inventory - the stock buckets of a SKU, and the one door for external stock changes. */
export class InventoryApi extends BaseApi{

    async getInventory(input: { sku: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get(`/admin/inventory/${input.sku}`, this.readOptions(options));
    }

    /** Deliveries, damage and stock counts. */
    async adjust(input: InventoryAdjustmentInput, options?: ApiCallOptions): Promise<APIResponse> {
        const { sku, ...body } = input;
        return this.http.post(`/admin/inventory/${sku}/adjustments`, this.writeOptions(options, body));
    }

}
