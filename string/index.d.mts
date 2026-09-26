// Type definitions for the ./string subpath (mirrors string/index.mjs)
import type { HttpRequest, HttpResponse, StringifyOptions } from '../types.d.ts';

export function parse(httpString: string): HttpRequest | HttpResponse;
export function parseRequest(requestString: string): HttpRequest;
export function parseResponse(responseString: string): HttpResponse;
export function stringify(httpObject: HttpRequest | HttpResponse): Promise<string>;
export function stringifyRequest(request: HttpRequest | Request, options?: StringifyOptions): Promise<string>;
export function stringifyResponse(response: HttpResponse | Response): Promise<string>;
