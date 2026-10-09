// Regression tests for #8: status line status code and reason phrase.
import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';

const firstLine = (s) => s.split('\r\n')[0];

describe('stringifyResponse status line', () => {
  test('native Response with empty statusText falls back to the standard phrase', async () => {
    const out = await http.string.stringifyResponse(new Response('Not Found', { status: 404 }));
    assert.equal(firstLine(out), 'HTTP/1.1 404 Not Found');
  });

  test('native Response keeps a provided statusText', async () => {
    const out = await http.string.stringifyResponse(
      new Response('x', { status: 404, statusText: 'Nope' })
    );
    assert.equal(firstLine(out), 'HTTP/1.1 404 Nope');
  });

  test('native Response with unknown code gets no phrase', async () => {
    const out = await http.string.stringifyResponse(new Response('x', { status: 599 }));
    assert.equal(firstLine(out), 'HTTP/1.1 599 ');
  });

  test('plain {status} object uses that status and its phrase', async () => {
    const out = await http.string.stringifyResponse({ status: 404, headers: {}, body: 'x' });
    assert.equal(firstLine(out), 'HTTP/1.1 404 Not Found');
  });

  test('plain {status} object keeps a provided statusText', async () => {
    const out = await http.string.stringifyResponse({ status: 404, statusText: 'Gone Fishing' });
    assert.equal(firstLine(out), 'HTTP/1.1 404 Gone Fishing');
  });

  test('plain {statusCode} object still works', async () => {
    const out = await http.string.stringifyResponse({ statusCode: 201 });
    assert.equal(firstLine(out), 'HTTP/1.1 201 Created');
  });

  test('object with neither status field defaults to 200 OK', async () => {
    const out = await http.string.stringifyResponse({ headers: {} });
    assert.equal(firstLine(out), 'HTTP/1.1 200 OK');
  });

  test('unknown code on a plain object gets no phrase, not a wrong one', async () => {
    const out = await http.string.stringifyResponse({ status: 599 });
    assert.equal(firstLine(out), 'HTTP/1.1 599 ');
  });

  test('empty statusText on a plain object falls back to the standard phrase', async () => {
    const out = await http.string.stringifyResponse({ status: 500, statusText: '' });
    assert.equal(firstLine(out), 'HTTP/1.1 500 Internal Server Error');
  });

  test('stringify() auto-detection path with {status}', async () => {
    const out = await http.string.stringify({ status: 404, headers: {}, body: 'x' });
    assert.equal(firstLine(out), 'HTTP/1.1 404 Not Found');
  });

  test('common codes beyond the original table have phrases', async () => {
    const out = await http.string.stringifyResponse({ status: 429 });
    assert.equal(firstLine(out), 'HTTP/1.1 429 Too Many Requests');
  });
});

describe('HAR response status text', () => {
  test('fromResponse without statusText uses the phrase for the code, not "OK"', async () => {
    const har = await http.har.fromResponse({ statusCode: 404, headers: {}, body: '' });
    assert.equal(har.response.status, 404);
    assert.equal(har.response.statusText, 'Not Found');
  });

  test('fromResponse accepts {status} and keeps a provided statusText', async () => {
    const har = await http.har.fromResponse({ status: 404, statusText: 'Nope', headers: {} });
    assert.equal(har.response.status, 404);
    assert.equal(har.response.statusText, 'Nope');
  });

  test('fromResponse with unknown code gets empty statusText', async () => {
    const har = await http.har.fromResponse({ status: 599, headers: {} });
    assert.equal(har.response.statusText, '');
  });
});
