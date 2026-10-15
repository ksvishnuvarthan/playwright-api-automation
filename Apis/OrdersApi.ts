import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';

export type OrderStatus = 'PLACED' | 'PACKING' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface ListOrdersQuery {
    status?: OrderStatus;
    page?: number;
    limit?: number;
}

/** /orders - what a customer does with their own orders. */
export class OrdersApi extends BaseApi{

    async placeOrder(input: { cartId: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.post('/orders', this.writeOptions(options, input));
    }

    async listOrders(query: ListOrdersQuery, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get('/orders', this.readOptions(options, { ...query }));
    }

    async getOrder(input: { orderId: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get(`/orders/${input.orderId}`, this.readOptions(options));
    }

    async getTimeline(input: { orderId: string }, options?: ApiCallOptions): Promise<APIResponse> {
        return this.http.get(`/orders/${input.orderId}/timeline`, this.readOptions(options));
    }

    /** Customer cancels the whole order. */
    async cancel(input: { orderId: string; reason: string }, options?: ApiCallOptions): Promise<APIResponse> {
        const { orderId, ...body } = input;
        return this.http.post(`/orders/${orderId}/cancel`, this.writeOptions(options, body));
    }

    /** Customer gives up some units of one line while the order is still PLACED. */
    async removeUnits(input: { orderId: string; orderLineId: string; quantity: number }, options?: ApiCallOptions): Promise<APIResponse> {
        const { orderId, orderLineId, ...body } = input;
        return this.http.post(`/orders/${orderId}/items/${orderLineId}/remove`, this.writeOptions(options, body));
    }

}
