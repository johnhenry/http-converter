# http-converter examples

Runnable, self-verifying examples. Each one exits non-zero on the first
thrown error (`main().catch(...)`), so `npm run examples` doubles as a smoke
test.

| Example | Demonstrates |
| --- | --- |
| [`01-url-formats.mjs`](./01-url-formats.mjs) | `string.stringifyRequest()` handles every practical URL shape — absolute URLs, path-only URLs, and native `Request`/`URL` objects — and produces the correct `Host` header and request line for each. |
| [`02-advanced-usage.mjs`](./02-advanced-usage.mjs) | Multipart form-data bodies, and `har.fromResponse()`/`har.toResponse()` round-tripping a detailed HAR entry (custom timings, server IP, comment) without losing fields. |

## Running

```sh
npm run examples      # run all in sequence
npm run example:01    # run one
node examples/01-url-formats.mjs
```

## Runtime requirements

Plain Node >= 26, no browser needed — both examples exercise the library's
Node-facing surface (`fetch`/`Request`/`Response` globals, which Node
provides natively). Nothing here is simulated: the HAR, cURL, and fetch
conversions run through the exact same code the package ships.
