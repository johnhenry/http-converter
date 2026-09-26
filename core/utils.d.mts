// Type definitions for the ./core/utils subpath (mirrors core/utils.mjs)
import type { HarQueryParam } from '../types.d.ts';

export function detectType(input: string | object): 'request' | 'response' | 'curl' | 'har' | 'unknown';
export function normalizeHeaders(headers: any): Record<string, string | string[]>;
export function parseQueryString(url: string): HarQueryParam[];
export function buildUrl(baseUrl: string, queryParams?: HarQueryParam[]): string;
export function getByteSize(str: string): number;
export function formatHeaders(headers: Record<string, string | string[]>): string;
