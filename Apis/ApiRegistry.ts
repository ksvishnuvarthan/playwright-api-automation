import { APIRequestContext } from '@playwright/test';
import { BaseApi, TokenEnvKey } from './BaseApi';
import { CartApi } from './CartApi';
import { CatalogAdminApi } from './CatalogAdminApi';
import { CatalogApi } from './CatalogApi';
import { InventoryApi } from './InventoryApi';
import { OrderOperationsApi } from './OrderOperationsApi';
import { OrdersApi } from './OrdersApi';
import { TestHarnessApi } from './TestHarnessApi';

/** Every API class, by the name test data uses for it (`api: 'cart'`). */
const APIS = {
    catalog: CatalogApi,
    cart: CartApi,
    orders: OrdersApi,
    orderOperations: OrderOperationsApi,
    inventory: InventoryApi,
    catalogAdmin: CatalogAdminApi,
    testHarness: TestHarnessApi,
};

export type ApiName = keyof typeof APIS;

/** The method names of one API, e.g. ApiMethod<'cart'> is 'getCart' | 'addItem' | 'setQuantity' | 'removeItem' | 'clear'. */
type ApiMethod<Name extends ApiName> = keyof InstanceType<(typeof APIS)[Name]>;

/**
 * Which API and which of its methods a test case calls.
 * Pairing them here lets TypeScript reject a method the API does not have,
 * e.g. { api: 'cart', action: 'placeOrder' }. Add a line when you add an API.
 */
export type ApiCall =
    | { api: 'catalog'; action: ApiMethod<'catalog'> }
    | { api: 'cart'; action: ApiMethod<'cart'> }
    | { api: 'orders'; action: ApiMethod<'orders'> }
    | { api: 'orderOperations'; action: ApiMethod<'orderOperations'> }
    | { api: 'inventory'; action: ApiMethod<'inventory'> }
    | { api: 'catalogAdmin'; action: ApiMethod<'catalogAdmin'> }
    | { api: 'testHarness'; action: ApiMethod<'testHarness'> };

/** Creates the API class for a name, sending the given role's token. */
export function createApi(name: ApiName, request: APIRequestContext, tokenEnvKey: TokenEnvKey | null): BaseApi {
    return new APIS[name](request, tokenEnvKey);
}
