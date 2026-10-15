import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';

export interface CartItemInput {
    sku: string;
    quantity: number;
}

/** /cart - the one cart a customer has at a time. */
export class CartApi extends BaseApi{

    async getCart(options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get('/cart', this.readOptions(options));
    }

    /** Adding a SKU that is already in the cart increases that line. */
    async addItem(input: CartItemInput, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.post('/cart/items', this.writeOptions(options, input));
    }

    /** Sets the line to exactly this quantity. */
    async setQuantity(input: CartItemInput, options?: ApiCallOptions): Promise<APIResponse> {
        const { sku, ...body } = input;
        return this.http.put(`/cart/items/${sku}`, this.writeOptions(options, body));
    }

    async removeItem(input: { sku: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.delete(`/cart/items/${input.sku}`, this.writeOptions(options));
    }

    async clear(options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.delete('/cart', this.writeOptions(options));
    }

}
