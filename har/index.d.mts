// Type definitions for the ./har subpath (mirrors har/index.mjs)
import type { HttpRequest, HttpResponse, HarEntry, HarOptions } from '../types.d.ts';

export function fromRequest(request: HttpRequest | Request, options?: HarOptions): Promise<HarEntry>;
export function fromResponse(response: HttpResponse | Response, request?: HttpRequest | Request | null, options?: HarOptions): Promise<HarEntry>;
export function toRequest(harEntry: HarEntry): HttpRequest;
export function toResponse(harEntry: HarEntry): HttpResponse;
