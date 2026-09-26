# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.0.1 — subpath types (2026-09-26)

### Fixed

- **Subpath exports (`./string`, `./har`, `./curl`, `./fetch`, `./body`, `./random`, `./core/utils`) had no `types` condition in `package.json`'s `exports` map**, so e.g. `import { parseRequest } from '@johnhenry/http-converter/string'` was untyped (TS7016) despite `types.d.ts` describing those namespaces. Fixing this required real authoring, not just an `exports`-map edit: `types.d.ts` only declared each module's functions as members of a root-level namespace (e.g. `string.parseRequest`), not as the flat top-level exports each subpath actually has at runtime (`string/index.mjs` exports `parseRequest` directly, not nested under a `string` object) — TypeScript can't derive one shape from the other. Added a colocated `index.d.mts` next to each module's `index.mjs` (and `core/utils.d.mts`) with the real flat signatures, pointed each subpath's new `types` condition at it, and had the root `types.d.ts` re-export them as namespaces so `import * as http from '@johnhenry/http-converter'; http.string.parseRequest(...)` keeps working too. Also added `ParsedBody` and the `random` module's option interfaces to `types.d.ts`, which were missing entirely (the `body` and `random` namespaces weren't declared anywhere, not even at the root). Reported in #4.
- **`allFormats` was exported from `index.mjs` but absent from `types.d.ts`**, so it couldn't be called from TypeScript without a cast (TS2305). Added `allFormats(request, options?)` plus `AllFormatsOptions`/`AllFormatsResult` to `types.d.ts`. Reported in #4.
- **README overstated fetch() support**: the Fetch Module section and "Auto-detection" feature bullet read as if pasted `fetch()` *source code* could be parsed back into a request. In reality `fetch.toRequest(url, options)` takes real, already-evaluated `url`/`options` values — there is no source-text parser for fetch calls (unlike cURL commands or HTTP strings, which do have one), and `detectType()` never returns `'fetch'`. Documented this in the Fetch Module section and added an entry to [Honest limitations](README.md#honest-limitations). Reported in #4.

### Added

- `test/types.test.mjs`: a regression test that runs a real `tsc --noEmit` against `test/types/check-types.ts`, which imports from every subpath and calls `allFormats()`. Catches both gaps above if they regress.

## 0.0.0 — npm scope migration (2026-09-21)

### Changed (breaking)

- **Renamed the package from unscoped `http-converter` to `@johnhenry/http-converter`, adopting it into the `@johnhenry` npm scope.** The unscoped name was never actually published under -- it's held by an unrelated, empty package from another author -- so this is this library's first real npm release, not a re-publish. Version restarts at `0.0.0` per the family's scope-adoption convention (a new address is a new era), independent of the real functionality/bug-fix history already recorded above. Added CI (`ci.yml`, Node 26 floor) and a release-triggered `publish.yml`, matching the rest of the `@johnhenry/*` family.

### Fixed

- **cURL parser silently corrupted data**: `curl.toRequest()`'s tokenizer used a single regex that mangled the escaped-apostrophe pattern Chrome/Firefox's "Copy as cURL" produces for embedded quotes (`'it'\''s'`), turning `{"a":"it's"}` into garbage instead of round-tripping correctly. Rewrote as a proper character-level tokenizer with correct single/double-quote and backslash-escape handling. Also fixed: flags expecting a value (`-H`, `-X`, `--data-urlencode`, etc.) with no value crashed with a cryptic `Cannot read properties of undefined` instead of a clear error; unterminated quotes silently vanished instead of erroring. Fixed in `740456a`.
- `curl.toRequest('not a curl command')` didn't throw on non-cURL input — it now throws if the input doesn't start with `curl` or no URL is found. Fixed in `740456a`.
- **`fetch.toCode()` and `curl.toFetchCode()` generated syntactically invalid JavaScript** whenever a URL or header value contained a single quote (e.g. `?q=O'Brien`) — the entire point of these functions is generating runnable code. Fixed by using `JSON.stringify()` for every interpolated string instead of manual single-quote wrapping. Fixed in `740fc99`.
- **`har.toRequest`/`har.toResponse` crashed on spec-legal HAR entries missing optional fields**: `headers` and `httpVersion` are optional per the HAR spec, but the code called array/string methods on them unconditionally. Defaulted appropriately. Fixed in `cd1c9d8`.
- **`har.toResponse` never decoded base64-encoded HAR content**: `content.encoding === "base64"` is a spec-documented marker for binary/non-UTF8 response bodies, but it was ignored — the still-base64-encoded blob was returned as-is as `body`. Added proper decoding. Fixed in `cd1c9d8`.
- **`string.parseRequest`/`parseResponse` mangled CRLF sequences inside the body**: the body was reassembled by joining split lines with `\n`, silently stripping every internal `\r` from any CRLF-containing body and breaking round-trip fidelity (`parseRequest(stringifyRequest(x)) !== x`). Rewrote to slice the body verbatim from the original string instead of line-splitting and rejoining it. Fixed in `b6ce4df`.
- **`har.fromResponse(response, request)` silently discarded response data when `request` was supplied**: it called the now-async `fromRequest(request, options)` without awaiting it, then mutated the resulting (unresolved) Promise object instead of the actual HAR entry — so the returned entry's `.response` field was a zeroed-out placeholder, not the real response. `fromResponse` is now properly `async`. Fixed in `ed8a4e0`.
- Example scripts (`examples.mjs`, `examples/url-formats.mjs`) were broken by a prior refactor that made several functions (`curl.fromRequest`, `fetch.fromRequest`, `har.fromRequest`, `string.stringify*`, `fetch.toCode`) unconditionally `async` without updating the call sites — one example printed a literal `Promise { ... }` instead of a string, another crashed outright. Fixed in `04ca1da`.
- `README.md`, `TYPESCRIPT.md`, and `types.d.ts` all still documented/declared sync usage and return types for functions that are now always `async`/`Promise`-returning. Corrected throughout. Fixed in `7439823`.

### Added

- `parseQueryString`, `buildUrl`, `getByteSize`, `formatHeaders` are now re-exported from the package root (`index.mjs`) — previously only reachable via the `http-converter/core/utils` subpath despite `types.d.ts` already declaring them as root-level exports. `374e718`.
- Regression tests for every fix above, plus determinism/round-trip verification for `random.randomRequest()` (seeded PRNG output is byte-identical across repeated calls with the same seed, and round-trips cleanly through `string`/`curl` conversion). `3bff29c`.
