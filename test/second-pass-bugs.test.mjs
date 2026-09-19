// Regression tests for bugs found in the second deep-dive pass.
import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';

describe('Second pass: cURL parsing hardening', () => {
  test('toRequest throws a clear error for non-cURL input instead of lenient-parsing garbage', () => {
    assert.throws(
      () => http.curl.toRequest('not a curl command'),
      /must start with "curl"/
    );
  });

  test('toRequest throws a clear error when a flag is missing its required value', () => {
    assert.throws(() => http.curl.toRequest('curl -H'), /-H is missing its required value/);
    assert.throws(() => http.curl.toRequest('curl -X'), /-X is missing its required value/);
    assert.throws(
      () => http.curl.toRequest('curl --data-urlencode'),
      /--data-urlencode is missing its required value/
    );
    assert.throws(() => http.curl.toRequest('curl -u'), /-u is missing its required value/);
  });

  test('toRequest throws when no URL is present', () => {
    assert.throws(() => http.curl.toRequest('curl -X POST'), /no URL found/);
  });

  test('toRequest correctly decodes the escaped-apostrophe pattern used by "Copy as cURL"', () => {
    // Browsers escape an embedded single quote inside a single-quoted arg as '\''
    // (close quote, escaped literal quote, reopen quote).
    const cmd = `curl 'https://x.com' --data-raw '{"a":"it'\\''s"}'`;
    const parsed = http.curl.toRequest(cmd);
    assert.equal(parsed.url, 'https://x.com');
    assert.equal(parsed.body, '{"a":"it\'s"}');
  });

  test('toRequest handles repeated -H flags and unquoted concatenated values', () => {
    const parsed = http.curl.toRequest(`curl 'https://x.com' -H 'X: 1' -H 'X: 2'`);
    assert.deepEqual(parsed.headers.x, ['1', '2']);
  });
});

describe('Second pass: generated JS code stays syntactically valid', () => {
  test('fetch.toCode escapes quotes in URLs and header values', async () => {
    const request = {
      method: 'GET',
      url: "https://example.com/?q=O'Brien",
      headers: { 'x-name': "O'Reilly" },
      body: null
    };

    const code = await http.fetch.toCode(request, { pretty: true, async: false });
    // Must be valid JS - this throws a SyntaxError if the quoting is broken.
    assert.doesNotThrow(() => new Function(`return (${code.replace(/;\s*$/, '')})`));
    assert.ok(code.includes("O'Brien"));
  });

  test('curl.toFetchCode escapes quotes in the URL', () => {
    const code = http.curl.toFetchCode(`curl "https://example.com/?q=O'Brien"`);
    assert.doesNotThrow(() => new Function(`return (${code})`));
    assert.ok(code.includes("O'Brien"));
  });
});

describe('Second pass: HAR robustness', () => {
  test('toRequest/toResponse tolerate HAR entries missing optional fields', () => {
    const entry = {
      request: { method: 'GET', url: 'https://example.com' },
      response: { status: 200 }
    };

    assert.doesNotThrow(() => http.har.toRequest(entry));
    assert.doesNotThrow(() => http.har.toResponse(entry));

    const req = http.har.toRequest(entry);
    assert.equal(req.method, 'GET');
    assert.deepEqual(req.headers, {});

    const res = http.har.toResponse(entry);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.headers, {});
  });

  test('toResponse decodes base64-encoded response content', () => {
    const entry = {
      request: { method: 'GET', url: 'https://example.com', headers: [], httpVersion: 'HTTP/1.1' },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/1.1',
        headers: [],
        content: {
          text: Buffer.from('hello world').toString('base64'),
          encoding: 'base64',
          mimeType: 'text/plain'
        }
      }
    };

    const res = http.har.toResponse(entry);
    assert.equal(res.body, 'hello world');
  });
});

describe('Second pass: string parsing preserves body fidelity', () => {
  test('parseRequest preserves CRLF sequences inside the body verbatim', () => {
    const originalBody = 'line1\r\nline2\r\nline3';
    const httpStr =
      'POST /api HTTP/1.1\r\nHost: x\r\nContent-Length: ' +
      originalBody.length +
      '\r\n\r\n' +
      originalBody;

    const parsed = http.string.parseRequest(httpStr);
    assert.equal(parsed.body, originalBody);
  });

  test('parseResponse preserves CRLF sequences inside the body verbatim', () => {
    const originalBody = 'row1\r\nrow2\r\nrow3';
    const httpStr =
      'HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n' + originalBody;

    const parsed = http.string.parseResponse(httpStr);
    assert.equal(parsed.body, originalBody);
  });
});
