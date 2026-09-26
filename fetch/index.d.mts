// Type definitions for the ./fetch subpath (mirrors fetch/index.mjs)
import type { HttpRequest, HttpResponse, FetchOptions } from '../types.d.ts';

export function fromRequest(request: HttpRequest | Request): Promise<{ url: string; options: RequestInit }>;
export function toRequest(url: string, options?: RequestInit): HttpRequest;
export function fromResponse(response: HttpResponse | Response, body?: string | null): any;
export function toResponse(fetchResponse: Response, includeBody?: boolean): Promise<HttpResponse>;
export function toCode(request: HttpRequest | Request, options?: FetchOptions): Promise<string>;
export function createMockResponse(httpResponse: HttpResponse): Response;
