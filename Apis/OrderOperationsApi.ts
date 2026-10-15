import { APIResponse } from '@playwright/test';
import { ApiCallOptions, BaseApi } from './BaseApi';
import { OrderStatus } from './OrdersApi';

/** /internal/orders and /admin/orders - what store staff do to orders. */
export class OrderOperationsApi extends BaseApi{

    /** Moves the order one step along PLACED -> PACKING -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED. */
    async advance(input: { orderId: string; status: OrderStatus }, options?: ApiCallOptions): Promise<APIResponse> {
        const { orderId, ...body } = input;
        return this.http.post(`/internal/orders/${orderId}/advance`, this.writeOptions(options, body));
    }

    /** Staff cancel at any point, with no allowance spent. */
    async cancel(input: { orderId: string; reason: string }, options?: ApiCallOptions): Promise<APIResponse> {
        const { orderId, ...body } = input;
        return this.http.post(`/admin/orders/${orderId}/cancel`, this.writeOptions(options, body));
    }

    /** Puts units from a cancelled order back on the shelf. */
    async restock(input: { orderId: string; orderLineId: string; quantity: number }, options?: ApiCallOptions): Promise<APIResponse> {
        const { orderId, ...body } = input;
        return this.http.post(`/internal/orders/${orderId}/restock`, this.writeOptions(options, body));
    }

}
