import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';

describe('URL handling in HTTP strings', () => {
  test('should stringify absolute URL with full URL in request line by default', async () => {
    const request = {
      method: 'GET',
      url: 'https://www.example.com/path',
      headers: {}
    };

    const result = await http.string.stringifyRequest(request);

    assert.ok(result.includes('GET https://www.example.com/path HTTP/1.1'));
    assert.ok(result.includes('host: www.example.com'));
  });

  test('should stringify absolute URL with path only when absoluteUrl is false', async () => {
    const request = {
      method: 'GET',
      url: 'https://www.example.com/path?query=1',
      headers: {}
    };

    const result = await http.string.stringifyRequest(request, { absoluteUrl: false });

    assert.ok(result.includes('GET /path?query=1 HTTP/1.1'));
    assert.ok(result.includes('host: www.example.com'));
  });

  test('should parse request with absolute URL', () => {
    const requestString = `GET https://www.example.com/api/users HTTP/1.1
Host: www.example.com
Accept: application/json

`;

    const parsed = http.string.parseRequest(requestString);

    assert.equal(parsed.method, 'GET');
    assert.equal(parsed.url, 'https://www.example.com/api/users');
    assert.equal(parsed.headers.host, 'www.example.com');
  });

  test('should parse request with protocol-relative URL', () => {
    const requestString = `GET //www.example.com/api HTTP/1.1
Host: www.example.com

`;

    const parsed = http.string.parseRequest(requestString);

    assert.equal(parsed.url, '//www.example.com/api');
  });

  test('should handle relative URLs', async () => {
    const request = {
      method: 'POST',
      url: '/api/users',
      headers: {
        host: 'api.example.com'
      },
      body: '{"name":"test"}'
    };

    const result = await http.string.stringifyRequest(request);

    assert.ok(result.includes('POST /api/users HTTP/1.1'));
    assert.ok(result.includes('host: api.example.com'));
  });

  test('should handle native Request with absolute URL', async () => {
    const request = new Request('https://api.example.com/users', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const result = await http.string.stringifyRequest(request);

    assert.ok(result.includes('GET https://api.example.com/users HTTP/1.1'));
    assert.ok(result.includes('host: api.example.com'));
  });

  test('should preserve query parameters and fragments', async () => {
    const request = {
      method: 'GET',
      url: 'https://example.com/search?q=test&page=2#results',
      headers: {}
    };

    // With absolute URL
    const absolute = await http.string.stringifyRequest(request);
    assert.ok(absolute.includes('GET https://example.com/search?q=test&page=2#results HTTP/1.1'));

    // With path only
    const pathOnly = await http.string.stringifyRequest(request, { absoluteUrl: false });
    assert.ok(pathOnly.includes('GET /search?q=test&page=2#results HTTP/1.1'));
  });

  test('should handle URLs without path', async () => {
    const request = {
      method: 'GET',
      url: 'https://example.com',
      headers: {}
    };

    const pathOnly = await http.string.stringifyRequest(request, { absoluteUrl: false });
    assert.ok(pathOnly.includes('GET / HTTP/1.1'));
    assert.ok(pathOnly.includes('host: example.com'));
  });

  test('should not duplicate host header', async () => {
    const request = {
      method: 'GET',
      url: 'https://example.com/api',
      headers: {
        'Host': 'example.com',
        'Accept': 'text/html'
      }
    };

    const result = await http.string.stringifyRequest(request);
    const hostMatches = result.match(/host:/gi);
    assert.equal(hostMatches.length, 1, 'Should have exactly one host header');
  });
});
