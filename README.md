# http-converter

A modern, browser-compatible HTTP format converter library. Transform between HTTP strings, HAR (HTTP Archive), cURL commands, and Fetch API calls.

## Features

- 🌐 **Browser-first**: No Node.js dependencies, works in any modern browser
- 📦 **Tree-shakeable**: Import only what you need
- 🔄 **Bidirectional conversions**: Convert between any supported format
- 🎯 **TypeScript support**: Full type definitions included
- 🚀 **Modern JavaScript**: ES modules with async/await support
- 🔍 **Auto-detection**: Automatically identifies format types
- 📝 **Native API support**: Works with Request/Response objects
- 🎨 **Any HTTP method**: Supports standard and custom HTTP methods

## Installation

```bash
npm install http-converter
```

## Usage

### Basic Examples

```javascript
import * as http from 'http-converter';

// Parse HTTP string
const request = http.string.parse(`GET /api HTTP/1.1
Host: example.com

`);

// Convert to cURL
const curl = http.curl.fromRequest(request);
console.log(curl);
// curl 'https://example.com/api' -H 'host: example.com'

// Convert to HAR
const harEntry = http.har.fromRequest(request);

// Convert to Fetch
const { url, options } = http.fetch.fromRequest(request);
const response = await fetch(url, options);
```

### String Module

Parse and stringify HTTP messages:

```javascript
import * as string from 'http-converter/string';

// Parse request
const req = string.parseRequest(`POST /users HTTP/1.1
Host: api.example.com
Content-Type: application/json

{"name": "John Doe"}`);

// Parse response
const res = string.parseResponse(`HTTP/1.1 201 Created
Content-Type: application/json
Location: /users/123

{"id": 123, "name": "John Doe"}`);

// Stringify with absolute URL (default for absolute URLs)
const httpString1 = string.stringifyRequest({
  method: 'GET',
  url: 'https://www.example.com/path'
});
// GET https://www.example.com/path HTTP/1.1
// host: www.example.com

// Stringify with path only
const httpString2 = string.stringifyRequest({
  method: 'GET',
  url: 'https://www.example.com/path'
}, { absoluteUrl: false });
// GET /path HTTP/1.1
// host: www.example.com
```

### HAR Module

Convert to/from HAR (HTTP Archive) format:

```javascript
import * as har from 'http-converter/har';

// Convert request to HAR entry
const harEntry = har.fromRequest({
  method: 'GET',
  url: '/api/users',
  headers: { 'accept': 'application/json' }
});

// Convert response to HAR (can merge with request)
const completeEntry = har.fromResponse(response, request);

// Convert back to HTTP objects
const httpRequest = har.toRequest(harEntry);
const httpResponse = har.toResponse(harEntry);
```

### cURL Module

Convert between cURL commands and HTTP requests:

```javascript
import * as curl from 'http-converter/curl';

// Generate cURL command
const command = curl.fromRequest({
  method: 'POST',
  url: 'https://api.example.com/users',
  headers: { 'content-type': 'application/json' },
  body: '{"name": "Jane"}'
}, { pretty: true });

// Parse cURL command
const request = curl.toRequest(`curl -X POST 'https://api.example.com/users' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Jane"}'`);

// Generate fetch() code
const fetchCode = curl.toFetchCode(command);
```

### Fetch Module

Convert between Fetch API and HTTP objects:

```javascript
import * as fetch from 'http-converter/fetch';

// Convert to Fetch parameters
const { url, options } = fetch.fromRequest({
  method: 'POST',
  url: '/api/users',
  headers: { 'content-type': 'application/json' },
  body: '{"name": "Alice"}'
});

// Use with fetch()
const response = await fetch(url, options);

// Convert Response to HTTP object
const httpResponse = await fetch.toResponse(response, true);

// Generate fetch() code
const code = fetch.toCode(request, { pretty: true, async: true });
```

### Utility Functions

```javascript
import { detectType, normalizeHeaders } from 'http-converter';

// Auto-detect format type
detectType('GET / HTTP/1.1'); // 'request'
detectType('HTTP/1.1 200 OK'); // 'response'
detectType('curl -X GET'); // 'curl'
detectType({ log: {}, entries: [] }); // 'har'

// Normalize headers from various formats
normalizeHeaders({ 'Content-Type': 'text/html' });
normalizeHeaders([{ name: 'Content-Type', value: 'text/html' }]); // HAR format
normalizeHeaders(new Headers({ 'Content-Type': 'text/html' })); // Fetch Headers
```

## API Reference

### Core Types

- `HttpRequest` - Standard HTTP request object
- `HttpResponse` - Standard HTTP response object

### String Module

- `parse(httpString)` - Auto-detect and parse HTTP string
- `parseRequest(requestString)` - Parse HTTP request string
- `parseResponse(responseString)` - Parse HTTP response string
- `stringify(httpObject)` - Auto-detect and stringify HTTP object
- `stringifyRequest(request)` - Stringify HTTP request
- `stringifyResponse(response)` - Stringify HTTP response

### HAR Module

- `fromRequest(request, options)` - Convert request to HAR entry
- `fromResponse(response, request, options)` - Convert response to HAR entry
- `toRequest(harEntry)` - Convert HAR entry to request
- `toResponse(harEntry)` - Convert HAR entry to response

### cURL Module

- `fromRequest(request, options)` - Convert request to cURL command
- `toRequest(curlCommand)` - Parse cURL command to request
- `toFetchCode(curlCommand)` - Generate fetch() code from cURL

### Fetch Module

- `fromRequest(request)` - Convert request to Fetch parameters
- `toRequest(url, options)` - Convert Fetch parameters to request
- `fromResponse(response, body)` - Convert response to Fetch-like object
- `toResponse(fetchResponse, includeBody)` - Convert Fetch Response to HTTP object
- `toCode(request, options)` - Generate fetch() code
- `createMockResponse(httpResponse)` - Create mock Response object

### Utilities

- `detectType(input)` - Detect format type
- `normalizeHeaders(headers)` - Normalize headers to plain object
- `parseQueryString(url)` - Parse URL query parameters
- `buildUrl(baseUrl, queryParams)` - Build URL with query parameters
- `getByteSize(str)` - Calculate byte size of string

### Body Module

Parse request/response bodies with automatic format detection:

```js
import { parseBody } from 'http-converter/body';

const parsed = parseBody('{"hello":"world"}', 'application/json');
// { type: 'json', formatted: '{\n  "hello": "world"\n}', raw: '...' }
```

#### `parseBody(text, contentType?)`

Parses request/response bodies. Detects JSON, XML, HTML, form-encoded, or plain text. Returns `{ type, formatted, raw }`.

### All Formats

Generate all format representations in one call:

```js
import { allFormats } from 'http-converter';
const formats = await allFormats(request);
// { httpString, curl, fetchCode, har }
```

#### `allFormats(request, options?)`

Generates all format representations (HTTP string, cURL, fetch code, HAR) for a request in one call.

### Random Module

Generate random HTTP requests for testing, demos, and development:

```js
import { randomRequest, randomMethod, randomPath, randomHeaders, randomBody } from 'http-converter/random';

// Generate a random request
const req = randomRequest();
// { method: 'POST', url: '/api/users/4217', headers: {...}, body: '{"name":"Alice",...}', httpVersion: '1.1' }

// Deterministic output with seed
const seeded = randomRequest({ seed: 42 });

// Generate multiple requests
const batch = randomRequest({ count: 10 });

// Constrain methods
const getOnly = randomRequest({ methods: ['GET'] });

// Custom options
const custom = randomRequest({
  methods: ['POST', 'PUT'],
  baseUrl: 'https://api.example.com',
  headers: { 'authorization': 'Bearer my-token' },
  body: { custom: 'payload' },
});
```

#### `randomRequest(options?)`

Returns an `HttpRequest` object (or array when `count` is set).

Options:
- `seed` (number) — deterministic PRNG seed
- `methods` (string[]) — allowed HTTP methods (default: weighted pool favoring GET/POST)
- `paths` (string[] | function) — path templates with `:id` interpolation, or generator `(rng) => string`
- `headers` (boolean | object) — `true`=generate, `false`=empty, object=use as-is
- `body` (boolean | string | object | function) — `true`=auto (method-aware), `false`=none, string/object=use directly, function=`(rng, method) => string`
- `baseUrl` (string) — URL prefix
- `count` (number) — return array of N requests

#### `randomMethod(options?)`, `randomPath(options?)`, `randomHeaders(options?)`, `randomBody(options?)`

Individual generators for each request component. Accept the same relevant options as `randomRequest`.

### Exports

| Export | Description |
|--------|-------------|
| `http-converter` | Core: `detectType`, `normalizeHeaders`, `allFormats` |
| `http-converter/string` | HTTP string parsing and stringification |
| `http-converter/har` | HAR format conversion |
| `http-converter/curl` | cURL command conversion |
| `http-converter/fetch` | Fetch API conversion |
| `http-converter/body` | Body parsing and formatting |
| `http-converter/random` | Random HTTP request generation |

## Browser Support

This library uses modern JavaScript features:
- ES Modules
- TextEncoder API
- URL API
- Headers API (for Fetch conversions)
- Request/Response APIs (optional)

Supported in all modern browsers (Chrome 61+, Firefox 60+, Safari 10.1+, Edge 79+).

## TypeScript

This library includes TypeScript definitions. See [TYPESCRIPT.md](./TYPESCRIPT.md) for usage examples.

## License

MIT
