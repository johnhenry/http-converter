// Type definitions for http-converter

export interface HttpRequest {
  method: string;
  url: string;
  httpVersion?: string;
  headers: Record<string, string | string[]>;
  body?: string | null;
}

export interface HttpResponse {
  httpVersion?: string;
  statusCode: number;
  statusText?: string;
  headers: Record<string, string | string[]>;
  body?: string | null;
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache: object;
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
}

export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  cookies: HarCookie[];
  headers: HarHeader[];
  queryString: HarQueryParam[];
  postData?: HarPostData;
  headersSize: number;
  bodySize: number;
}

export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  cookies: HarCookie[];
  headers: HarHeader[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export interface HarHeader {
  name: string;
  value: string;
}

export interface HarQueryParam {
  name: string;
  value: string;
}

export interface HarPostData {
  mimeType: string;
  text: string;
  params?: HarPostDataParam[];
}

export interface HarPostDataParam {
  name: string;
  value: string;
}

export interface HarContent {
  size: number;
  compression?: number;
  mimeType: string;
  text?: string;
  encoding?: string;
}

export interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send: number;
  wait: number;
  receive: number;
  ssl?: number;
}

export interface CurlOptions {
  pretty?: boolean;
  compressed?: boolean;
  verbose?: boolean;
  followRedirects?: boolean;
  insecure?: boolean;
  maxTime?: number | null;
  proxy?: string | null;
}

export interface FetchOptions {
  pretty?: boolean;
  async?: boolean;
}

export interface HarOptions {
  startedDateTime?: string;
  time?: number;
  timings?: Partial<HarTimings>;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
}

export interface StringifyOptions {
  absoluteUrl?: boolean;
}

export interface ParsedBody {
  type: string;
  formatted: string;
  raw: string;
}

export interface RandomMethodOptions {
  seed?: number;
  methods?: string[];
}

export interface RandomPathOptions {
  seed?: number;
  paths?: string[] | ((rng: () => number) => string);
  baseUrl?: string;
}

export interface RandomHeadersOptions {
  seed?: number;
  headers?: boolean | Record<string, string>;
}

export interface RandomBodyOptions {
  seed?: number;
  method?: string;
  body?: boolean | string | object | ((rng: () => number, method: string) => string);
}

export interface RandomRequestOptions {
  seed?: number;
  methods?: string[];
  paths?: string[] | ((rng: () => number) => string);
  headers?: boolean | Record<string, string>;
  body?: boolean | string | object | ((rng: () => number, method: string) => string);
  baseUrl?: string;
  count?: number;
}

export interface AllFormatsOptions {
  curl?: CurlOptions;
  fetch?: FetchOptions;
  har?: HarOptions;
}

export interface AllFormatsResult {
  httpString: string;
  curl: string;
  fetchCode: string;
  har: HarEntry;
}

// Module exports, re-exported as namespaces. Each namespace's declarations
// live next to its implementation (e.g. ./string/index.d.mts next to
// ./string/index.mjs) and are also reachable directly via the matching
// subpath export (e.g. `@johnhenry/http-converter/string`).
export * as string from './string/index.mjs';
export * as har from './har/index.mjs';
export * as curl from './curl/index.mjs';
export * as fetch from './fetch/index.mjs';
export * as body from './body/index.mjs';
export * as random from './random/index.mjs';

// allFormats: convert a request to all supported formats at once.
export function allFormats(request: HttpRequest | Request, options?: AllFormatsOptions): Promise<AllFormatsResult>;

// Utility exports (also reachable via the `./core/utils` subpath)
export function detectType(input: string | object): 'request' | 'response' | 'curl' | 'har' | 'unknown';
export function normalizeHeaders(headers: any): Record<string, string | string[]>;
export function parseQueryString(url: string): HarQueryParam[];
export function buildUrl(baseUrl: string, queryParams?: HarQueryParam[]): string;
export function getByteSize(str: string): number;
export function formatHeaders(headers: Record<string, string | string[]>): string;
