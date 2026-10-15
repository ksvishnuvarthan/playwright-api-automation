import { APIRequestContext, APIResponse } from '@playwright/test';
import { TokenEnvKey } from './BaseApi';
import { CartApi } from './CartApi';
import { CatalogAdminApi } from './CatalogAdminApi';
import { CatalogApi } from './CatalogApi';
import { InventoryApi } from './InventoryApi';
import { OrderOperationsApi } from './OrderOperationsApi';
import { OrdersApi } from './OrdersApi';
import { TestHarnessApi } from './TestHarnessApi';

/** Every API, by the name test data uses to refer to it. */
export const API_CLIENTS = {
    catalog: CatalogApi,
    cart: CartApi,
    orders: OrdersApi,
    orderOperations: OrderOperationsApi,
    inventory: InventoryApi,
    catalogAdmin: CatalogAdminApi,
    testHarness: TestHarnessApi,
} as const;

export type ApiName = keyof typeof API_CLIENTS;

type ApiInstance<N extends ApiName> = InstanceType<(typeof API_CLIENTS)[N]>;

/** Public methods of an API that make a call. */
export type ApiActionOf<N extends ApiName> = {
    [K in keyof ApiInstance<N>]: ApiInstance<N>[K] extends (...args: any[]) => Promise<APIResponse> ? K : never;
}[keyof ApiInstance<N>];

/** A valid { api, action } pair, e.g. { api: 'cart', action: 'addItem' }. */
export type ApiActionRef = { [N in ApiName]: { api: N; action: ApiActionOf<N> } }[ApiName];

export function createApi<N extends ApiName>(api: N, request: APIRequestContext, tokenEnvKey: TokenEnvKey | null): ApiInstance<N> {
    return new API_CLIENTS[api](request, tokenEnvKey) as ApiInstance<N>;
}
