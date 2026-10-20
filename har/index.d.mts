// Type definitions for the ./har subpath (mirrors har/index.mjs)
import type { HttpRequest, HttpResponse, HarEntry, HarOptions } from '../types.d.ts';

export function fromRequest(request: HttpRequest | Request, options?: HarOptions): Promise<HarEntry>;
export function fromResponse(response: HttpResponse | Response, request?: HttpRequest | Request | null, options?: HarOptions): Promise<HarEntry>;
export interface HarToRequestOptions {
  /** Keep header names as written instead of lowercasing them. Default false. */
  preserveHeaderCase?: boolean;
  /** Synthesize a cookie header from request.cookies[]. Default true. */
  includeCookies?: boolean;
  /** Entry to convert when given a whole HAR file. Default 0. */
  entryIndex?: number;
}
export function toRequest(harEntry: HarEntry | { log: { entries: HarEntry[] } }, options?: HarToRequestOptions): HttpRequest;
export function toResponse(harEntry: HarEntry): HttpResponse;
