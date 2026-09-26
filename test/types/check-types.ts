// Fixture for the issue #4 regression test (test/types.test.mjs).
// Exercises every subpath's `types` export condition, plus `allFormats`,
// which were both missing before that fix (TS7016 / TS2305). This file is
// never executed at runtime -- it only needs to type-check.
import { parseRequest, parseResponse } from '@johnhenry/http-converter/string';
import { fromRequest as harFromRequest, toRequest as harToRequest } from '@johnhenry/http-converter/har';
import { toRequest as curlToRequest, toFetchCode } from '@johnhenry/http-converter/curl';
import { toRequest as fetchToRequest } from '@johnhenry/http-converter/fetch';
import { detectType, normalizeHeaders } from '@johnhenry/http-converter/core/utils';
import { parseBody } from '@johnhenry/http-converter/body';
import { randomRequest, randomMethod } from '@johnhenry/http-converter/random';
import * as http from '@johnhenry/http-converter';
import { allFormats, type HttpRequest, type HarEntry } from '@johnhenry/http-converter';

const req: HttpRequest = parseRequest('GET / HTTP/1.1\r\nHost: example.com\r\n\r\n');
const res = parseResponse('HTTP/1.1 200 OK\r\n\r\n');
const curlReq = curlToRequest("curl -X GET 'https://example.com'");
const fetchCode = toFetchCode("curl -X GET 'https://example.com'");
const fetchReq = fetchToRequest('https://example.com', { method: 'GET' });
const detected = detectType('GET / HTTP/1.1');
const normalized = normalizeHeaders({ 'Content-Type': 'text/html' });
const parsedBody = parseBody('{"hello":"world"}', 'application/json');
const rnd = randomRequest({ seed: 42 });
const method = randomMethod();

// Root namespace access (`import * as http`) must keep working alongside
// the subpath imports above.
const sameParseRequest: boolean = http.string.parseRequest === parseRequest;
const sameDetectType: boolean = http.detectType === detectType;

async function run(): Promise<void> {
  const formats = await allFormats(req);
  const httpString: string = formats.httpString;
  const curl: string = formats.curl;
  const generatedFetchCode: string = formats.fetchCode;
  const har: HarEntry = formats.har;

  const harEntry: HarEntry = await harFromRequest(req);
  const roundTripped: HttpRequest = harToRequest(harEntry);

  void [httpString, curl, generatedFetchCode, har, roundTripped];
}

void [
  req, res, curlReq, fetchCode, fetchReq, detected, normalized, parsedBody,
  rnd, method, sameParseRequest, sameDetectType, run,
];
