# TypeScript Support

This library includes TypeScript type definitions in `types.d.ts`.

## Using with TypeScript

```typescript
import * as http from 'http-converter';
import type { HttpRequest, HttpResponse, HarEntry } from 'http-converter';

// Type-safe request creation
const request: HttpRequest = {
  method: 'POST',
  url: '/api/users',
  headers: {
    'content-type': 'application/json'
  },
  body: JSON.stringify({ name: 'Test' })
};

// Convert with full type inference
const curl: string = http.curl.fromRequest(request);
const har: HarEntry = http.har.fromRequest(request);
```

## Native Request/Response Support

The library supports both custom HTTP objects and native Web API Request/Response objects:

```typescript
// Using native Request
const request = new Request('https://api.example.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ data: 'test' })
});

// Convert native Request to cURL
const curl = await http.curl.fromRequest(request);

// Using native Response
const response = new Response('{"success":true}', {
  status: 200,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Convert native Response to HAR
const harEntry = await http.har.fromResponse(response);
```

## Type Definitions

All major types are exported:

- `HttpRequest` - Standard HTTP request object
- `HttpResponse` - Standard HTTP response object  
- `HarEntry` - HAR format entry
- `HarRequest`, `HarResponse` - HAR sub-types
- `CurlOptions` - Options for cURL generation
- `FetchOptions` - Options for fetch code generation

## Module Types

Each module has typed exports:

```typescript
import * as string from 'http-converter/string';
import * as har from 'http-converter/har';
import * as curl from 'http-converter/curl';
import * as fetch from 'http-converter/fetch';

// All methods are fully typed
const parsed: HttpRequest = string.parseRequest('GET / HTTP/1.1\\r\\n\\r\\n');
```
