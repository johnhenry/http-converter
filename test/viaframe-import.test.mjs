import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';

const entry = (over = {}) => ({
  startedDateTime: '2024-01-15T10:30:00.000Z',
  time: 1,
  request: {
    method: 'POST',
    url: 'https://api.example.com/form',
    httpVersion: 'HTTP/1.1',
    cookies: [{ name: 'sid', value: 'abc' }],
    headers: [
      { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
      { name: 'X-Custom-Header', value: 'a' },
      { name: 'Cookie', value: 'sid=abc' },
    ],
    queryString: [],
    headersSize: -1,
    bodySize: -1,
    ...over,
  },
  response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/1.1', cookies: [], headers: [], content: { size: 0, mimeType: 'text/plain' }, redirectURL: '', headersSize: -1, bodySize: 0 },
  cache: {},
  timings: { send: 0, wait: 0, receive: 0 },
});

describe('detectType: real HAR and absolute-URL request lines', () => {
  test('full HAR file {log:{entries}} is har', () => {
    assert.equal(http.detectType({ log: { version: '1.2', entries: [entry()] } }), 'har');
  });
  test('JSON text of a HAR file is har', () => {
    assert.equal(http.detectType(JSON.stringify({ log: { entries: [entry()] } })), 'har');
  });
  test('object with log but no entries is not har', () => {
    assert.equal(http.detectType({ log: 'x' }), 'unknown');
  });
  test('absolute-URL request line is request', () => {
    assert.equal(http.detectType('GET https://example.com/x?y=1 HTTP/1.1\r\nHost: example.com\r\n\r\n'), 'request');
    assert.equal(http.detectType('POST http://example.com HTTP/1.1'), 'request');
  });
  test('string.parse handles absolute-URL request lines', () => {
    const r = http.string.parse('GET https://example.com/x HTTP/1.1\r\nHost: example.com\r\n\r\n');
    assert.equal(r.url, 'https://example.com/x');
  });
  test('fetch(...) source is fetch', () => {
    assert.equal(http.detectType('fetch("https://a.test/", {})'), 'fetch');
    assert.equal(http.detectType('const r = await fetch("https://a.test/");'), 'fetch');
    assert.equal(http.detectType('await fetch("https://a.test/")'), 'fetch');
  });
});

describe('har.toRequest options', () => {
  test('default behavior is unchanged: lowercase header names', () => {
    const r = http.har.toRequest(entry());
    assert.equal(r.headers['content-type'], 'application/x-www-form-urlencoded');
  });
  test('preserveHeaderCase keeps original header name case', () => {
    const r = http.har.toRequest(entry(), { preserveHeaderCase: true });
    assert.equal(r.headers['Content-Type'], 'application/x-www-form-urlencoded');
    assert.equal(r.headers['X-Custom-Header'], 'a');
    assert.equal(r.headers['content-type'], undefined);
  });
  test('preserveHeaderCase merges duplicates under the first-seen casing', () => {
    const r = http.har.toRequest(
      entry({ headers: [{ name: 'Set-Thing', value: '1' }, { name: 'set-thing', value: '2' }] }),
      { preserveHeaderCase: true }
    );
    assert.deepEqual(r.headers['Set-Thing'], ['1', '2']);
  });
  test('includeCookies:false does not synthesize a cookie header', () => {
    const r = http.har.toRequest(
      entry({ headers: [{ name: 'Accept', value: '*/*' }] }),
      { includeCookies: false }
    );
    assert.equal(r.headers.cookie, undefined);
    const d = http.har.toRequest(entry({ headers: [{ name: 'Accept', value: '*/*' }] }));
    assert.equal(d.headers.cookie, 'sid=abc');
  });
  test('postData.params becomes a urlencoded body when text is absent', () => {
    const r = http.har.toRequest(entry({
      postData: { mimeType: 'application/x-www-form-urlencoded', params: [{ name: 'a', value: '1 2' }, { name: 'b', value: 'x&y' }] },
    }));
    assert.equal(r.body, 'a=1+2&b=x%26y');
  });
  test('postData.text wins over params', () => {
    const r = http.har.toRequest(entry({ postData: { mimeType: 'text/plain', text: 'hi', params: [{ name: 'a', value: '1' }] } }));
    assert.equal(r.body, 'hi');
  });
  test('accepts a full HAR file (first entry) and an index option', () => {
    const har = { log: { entries: [entry(), entry({ url: 'https://second.test/' })] } };
    assert.equal(http.har.toRequest(har).url, 'https://api.example.com/form');
    assert.equal(http.har.toRequest(har, { entryIndex: 1 }).url, 'https://second.test/');
  });
});

describe('fetch.parse: fetch(...) source text', () => {
  test('devtools "Copy as fetch" output', () => {
    const src = `fetch("https://api.example.com/v1/items?x=1", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "content-type": "application/json",
    "sec-ch-ua": "\\"Chromium\\";v=\\"120\\""
  },
  "referrer": "https://example.com/",
  "referrerPolicy": "strict-origin-when-cross-origin",
  "body": "{\\"name\\":\\"a\\\\nb\\"}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});`;
    const r = http.fetch.parse(src);
    assert.equal(r.method, 'POST');
    assert.equal(r.url, 'https://api.example.com/v1/items?x=1');
    assert.equal(r.headers['content-type'], 'application/json');
    assert.equal(r.headers['sec-ch-ua'], '"Chromium";v="120"');
    assert.equal(r.body, '{"name":"a\\nb"}');
  });
  test('round-trips through toCode', async () => {
    const req = { method: 'PUT', url: 'https://a.test/x', headers: { 'x-a': '1' }, body: 'hello "q"' };
    const code = await http.fetch.toCode(req);
    const back = http.fetch.parse(code);
    assert.equal(back.method, 'PUT');
    assert.equal(back.url, req.url);
    assert.deepEqual(back.headers, { 'x-a': '1' });
    assert.equal(back.body, 'hello "q"');
  });
  test('single quotes, unquoted keys, trailing commas, comments, bare url', () => {
    const r = http.fetch.parse(`const res = await fetch('https://a.test/', { // note
      method: 'DELETE', headers: { Authorization: 'Bearer t', }, /* c */ });`);
    assert.equal(r.method, 'DELETE');
    assert.equal(r.headers.authorization, 'Bearer t');
    assert.equal(http.fetch.parse('fetch("https://a.test/")').method, 'GET');
  });
  test('headers as array of pairs; null body', () => {
    const r = http.fetch.parse(`fetch("/x", {headers: [["A","1"],["B","2"]], body: null})`);
    assert.deepEqual(r.headers, { a: '1', b: '2' });
    assert.equal(r.body, null);
  });
  test('rejects code that is not a plain literal (no eval)', () => {
    assert.throws(() => http.fetch.parse('fetch("https://a.test/", { body: process.exit(1) })'));
    assert.throws(() => http.fetch.parse('fetch(`https://a.test/${x}`)'));
    assert.throws(() => http.fetch.parse('not fetch'));
  });
});
