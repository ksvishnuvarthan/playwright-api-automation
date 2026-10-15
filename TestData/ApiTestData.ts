import { ApiCall } from '../Apis/ApiRegistry';
import { TokenEnvKey } from '../Apis/BaseApi';

/** One API call and the status it should return: which API method, as which role, with what input. */
export type ApiTestData = ApiCall & {
    description: string;
    /** First argument of the API method (path params, query and body fields together). Omit for methods that take none. */
    input?: Record<string, unknown>;
    /** Role whose token is sent; null sends no token. */
    tokenEnvKey: TokenEnvKey | null;
    headers?: Record<string, string>;
    /** Writes send a fresh Idempotency-Key; false sends none. */
    sendIdempotencyKey?: false;
    /** Fixed Idempotency-Key, for replaying the same request. */
    idempotencyKey?: string;
    expectedStatus: number;
    /** Expected error code on a failure (e.g. CART_EMPTY), checked on top of the status. */
    expectedCode?: string;
    /** Fields the response body must contain (partial match; arrays must match in length). */
    expectedBody?: Record<string, unknown>;
};
