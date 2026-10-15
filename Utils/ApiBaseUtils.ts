import { APIRequestContext, APIResponse } from '@playwright/test';

export interface ApiRequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    data?: unknown;
    /** Request timeout in milliseconds. */
    timeout?: number;
}

export class ApiBaseUtils{

    constructor(private readonly request: APIRequestContext,
        private readonly baseUrl: string,
        private readonly optionalHeaders?: Record<string, string>
    ) {
    }

    async get(endpoint: string, options?: Omit<ApiRequestOptions, 'data'>): Promise<APIResponse> {
        return this.request.get(this.buildUrl(endpoint), this.buildOptions(options));
    }

    async post(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
        return this.request.post(this.buildUrl(endpoint), this.buildOptions(options));
    }

    async put(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
        return this.request.put(this.buildUrl(endpoint), this.buildOptions(options));
    }

    async patch(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
        return this.request.patch(this.buildUrl(endpoint), this.buildOptions(options));
    }

    async delete(endpoint: string, options?: ApiRequestOptions): Promise<APIResponse> {
        return this.request.delete(this.buildUrl(endpoint), this.buildOptions(options));
    }

    private buildUrl(endpoint: string): string {
        return `${this.baseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    }

    private buildOptions(options?: ApiRequestOptions) {
        return {
            ...options,
            headers: { ...this.optionalHeaders, ...options?.headers },
        };
    }

}
