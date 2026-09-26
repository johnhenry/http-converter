// Type definitions for the ./curl subpath (mirrors curl/index.mjs)
import type { HttpRequest, CurlOptions } from '../types.d.ts';

export function fromRequest(request: HttpRequest | Request, options?: CurlOptions): Promise<string>;
export function toRequest(curlCommand: string): HttpRequest;
export function toFetchCode(curlCommand: string): string;
