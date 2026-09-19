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

// String module exports
export declare namespace string {
  export function parse(httpString: string): HttpRequest | HttpResponse;
  export function parseRequest(requestString: string): HttpRequest;
  export function parseResponse(responseString: string): HttpResponse;
  export function stringify(httpObject: HttpRequest | HttpResponse): string | Promise<string>;
  export function stringifyRequest(request: HttpRequest | Request, options?: StringifyOptions): string | Promise<string>;
  export function stringifyResponse(response: HttpResponse | Response): string | Promise<string>;
}

// HAR module exports
export declare namespace har {
  export function fromRequest(request: HttpRequest | Request, options?: HarOptions): HarEntry;
  export function fromResponse(response: HttpResponse | Response, request?: HttpRequest | Request | null, options?: HarOptions): HarEntry;
  export function toRequest(harEntry: HarEntry): HttpRequest;
  export function toResponse(harEntry: HarEntry): HttpResponse;
}

// cURL module exports
export declare namespace curl {
  export function fromRequest(request: HttpRequest | Request, options?: CurlOptions): string;
  export function toRequest(curlCommand: string): HttpRequest;
  export function toFetchCode(curlCommand: string): string;
}

// Fetch module exports
export declare namespace fetch {
  export function fromRequest(request: HttpRequest | Request): { url: string; options: RequestInit };
  export function toRequest(url: string, options?: RequestInit): HttpRequest;
  export function fromResponse(response: HttpResponse | Response, body?: string | null): any;
  export function toResponse(fetchResponse: Response, includeBody?: boolean): Promise<HttpResponse>;
  export function toCode(request: HttpRequest | Request, options?: FetchOptions): string;
  export function createMockResponse(httpResponse: HttpResponse): Response;
}

// Utility exports
export function detectType(input: string | object): 'request' | 'response' | 'curl' | 'har' | 'unknown';
export function normalizeHeaders(headers: any): Record<string, string | string[]>;
export function parseQueryString(url: string): HarQueryParam[];
export function buildUrl(baseUrl: string, queryParams?: HarQueryParam[]): string;
export function getByteSize(str: string): number;
export function formatHeaders(headers: Record<string, string | string[]>): string;
