// Type definitions for the ./random subpath (mirrors random/index.mjs)
import type {
  HttpRequest,
  RandomMethodOptions,
  RandomPathOptions,
  RandomHeadersOptions,
  RandomBodyOptions,
  RandomRequestOptions,
} from '../types.d.ts';

export function randomMethod(options?: RandomMethodOptions): string;
export function randomPath(options?: RandomPathOptions): string;
export function randomHeaders(options?: RandomHeadersOptions): Record<string, string>;
export function randomBody(options?: RandomBodyOptions): string | null;
export function randomRequest(options?: RandomRequestOptions): HttpRequest | HttpRequest[];
