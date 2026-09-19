import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';
import { parseBody } from '../body/index.mjs';

describe('HTTP Converter', () => {
  describe('String Module', () => {
    test('should parse HTTP request string', () => {
      const requestString = `POST /api/users HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 18

{"name":"John Doe"}`;

      const parsed = http.string.parseRequest(requestString);
      
      assert.equal(parsed.method, 'POST');
      assert.equal(parsed.url, '/api/users');
      assert.equal(parsed.httpVersion, '1.1');
      assert.equal(parsed.headers.host, 'example.com');
      assert.equal(parsed.headers['content-type'], 'application/json');
      assert.equal(parsed.body, '{"name":"John Doe"}');
    });

    test('should parse HTTP response string', () => {
      const responseString = `HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/users/123

{"id":123,"name":"John Doe"}`;

      const parsed = http.string.parseResponse(responseString);
      
      assert.equal(parsed.httpVersion, '1.1');
      assert.equal(parsed.statusCode, 201);
      assert.equal(parsed.statusText, 'Created');
      assert.equal(parsed.headers['content-type'], 'application/json');
      assert.equal(parsed.headers.location, '/api/users/123');
      assert.equal(parsed.body, '{"id":123,"name":"John Doe"}');
    });

    test('should stringify request', async () => {
      const request = {
        method: 'GET',
        url: '/api',
        httpVersion: '1.1',
        headers: { host: 'example.com' },
        body: null
      };

      const stringified = await http.string.stringifyRequest(request);

      assert.ok(stringified.includes('GET /api HTTP/1.1'));
      assert.ok(stringified.includes('host: example.com'));
    });

    test('should auto-detect and parse', () => {
      const request = 'GET / HTTP/1.1\r\n\r\n';
      const response = 'HTTP/1.1 200 OK\r\n\r\n';
      
      const parsedReq = http.string.parse(request);
      const parsedRes = http.string.parse(response);
      
      assert.equal(parsedReq.method, 'GET');
      assert.equal(parsedRes.statusCode, 200);
    });

    test('should handle custom HTTP methods', () => {
      const customMethod = `CUSTOM /api/resource HTTP/1.1
Host: example.com

`;
      const parsed = http.string.parseRequest(customMethod);
      assert.equal(parsed.method, 'CUSTOM');
    });
  });

  describe('cURL Module', () => {
    test('should convert request to cURL', async () => {
      const request = {
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer token123'
        },
        body: '{"name":"Test"}'
      };

      const curl = await http.curl.fromRequest(request);
      
      assert.ok(curl.includes('curl'));
      assert.ok(curl.includes('-X POST'));
      assert.ok(curl.includes('https://api.example.com/users'));
      assert.ok(curl.includes('-H \'content-type: application/json\''));
      assert.ok(curl.includes('--data-raw \'{"name":"Test"}\''));
    });

    test('should parse cURL command', () => {
      const curlCmd = `curl -X POST 'https://api.example.com/users' -H 'Content-Type: application/json' -d '{"name":"Jane"}'`;
      
      const parsed = http.curl.toRequest(curlCmd);
      
      assert.equal(parsed.method, 'POST');
      assert.equal(parsed.url, 'https://api.example.com/users');
      assert.equal(parsed.headers['content-type'], 'application/json');
      assert.equal(parsed.body, '{"name":"Jane"}');
    });

    test('should handle cURL with authentication', () => {
      const curlCmd = `curl -u admin:password123 'https://api.example.com/secure'`;
      
      const parsed = http.curl.toRequest(curlCmd);
      
      assert.equal(parsed.method, 'GET');
      assert.ok(parsed.headers.authorization.startsWith('Basic '));
    });
  });

  describe('HAR Module', () => {
    test('should convert request to HAR entry', async () => {
      const request = {
        method: 'GET',
        url: '/api/data?page=1',
        headers: { accept: 'application/json' }
      };

      const har = await http.har.fromRequest(request);
      
      assert.equal(har.request.method, 'GET');
      assert.equal(har.request.url, '/api/data?page=1');
      assert.equal(har.request.headers[0].name, 'accept');
      assert.equal(har.request.headers[0].value, 'application/json');
      assert.ok(har.request.queryString.length > 0);
      assert.equal(har.request.queryString[0].name, 'page');
      assert.equal(har.request.queryString[0].value, '1');
    });

    test('should convert HAR entry to request', () => {
      const harEntry = {
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          httpVersion: 'HTTP/1.1',
          headers: [
            { name: 'Content-Type', value: 'application/json' }
          ],
          postData: {
            mimeType: 'application/json',
            text: '{"test":true}'
          }
        }
      };

      const request = http.har.toRequest(harEntry);
      
      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://api.example.com/users');
      assert.equal(request.headers['content-type'], 'application/json');
      assert.equal(request.body, '{"test":true}');
    });

    test('should handle response conversion', () => {
      const response = {
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html' },
        body: '<html>Test</html>'
      };

      const har = http.har.fromResponse(response);
      
      assert.equal(har.response.status, 200);
      assert.equal(har.response.statusText, 'OK');
      assert.equal(har.response.content.text, '<html>Test</html>');
      assert.equal(har.response.content.mimeType, 'text/html');
    });
  });

  describe('Fetch Module', () => {
    test('should convert request to fetch parameters', async () => {
      const request = {
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        body: '{"name":"Test"}'
      };

      const { url, options } = await http.fetch.fromRequest(request);
      
      assert.equal(url, '/api/users');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['content-type'], 'application/json');
      assert.equal(options.body, '{"name":"Test"}');
    });

    test('should generate fetch code', async () => {
      const request = {
        method: 'GET',
        url: '/api/data',
        headers: { accept: 'application/json' }
      };

      const code = await http.fetch.toCode(request, { async: true });
      
      assert.ok(code.includes('const response = await fetch'));
      assert.ok(code.includes('/api/data'));
      assert.ok(code.includes('accept'));
      assert.ok(code.includes('application/json'));
    });

    test('should convert fetch parameters to request', () => {
      const url = 'https://api.example.com/users';
      const options = {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: '{"status":"active"}'
      };

      const request = http.fetch.toRequest(url, options);
      
      assert.equal(request.method, 'PUT');
      assert.equal(request.url, url);
      assert.equal(request.headers['content-type'], 'application/json');
      assert.equal(request.body, '{"status":"active"}');
    });
  });

  describe('Utilities', () => {
    test('should detect input types', () => {
      assert.equal(http.detectType('GET / HTTP/1.1'), 'request');
      assert.equal(http.detectType('HTTP/1.1 200 OK'), 'response');
      assert.equal(http.detectType('curl -X GET'), 'curl');
      assert.equal(http.detectType({ log: {}, entries: [] }), 'har');
      assert.equal(http.detectType({ method: 'GET', url: '/' }), 'request');
      assert.equal(http.detectType({ statusCode: 200 }), 'response');
      assert.equal(http.detectType('unknown input'), 'unknown');
    });

    test('should normalize headers', () => {
      // Plain object
      const normalized1 = http.normalizeHeaders({ 'Content-Type': 'text/html' });
      assert.equal(normalized1['content-type'], 'text/html');

      // HAR format
      const normalized2 = http.normalizeHeaders([
        { name: 'Accept', value: 'application/json' },
        { name: 'Accept', value: 'text/html' }
      ]);
      assert.ok(Array.isArray(normalized2.accept));
      assert.equal(normalized2.accept.length, 2);

      // Headers object
      const headers = new Headers();
      headers.set('Authorization', 'Bearer token');
      const normalized3 = http.normalizeHeaders(headers);
      assert.equal(normalized3.authorization, 'Bearer token');
    });
  });

  describe('Body', () => {
    test('should detect JSON by content-type', () => {
      const result = parseBody('{"name":"test"}', 'application/json');
      assert.equal(result.type, 'json');
      assert.equal(result.formatted, '{\n  "name": "test"\n}');
      assert.equal(result.raw, '{"name":"test"}');
    });

    test('should detect JSON by shape', () => {
      const result = parseBody('{"key":"value"}', '');
      assert.equal(result.type, 'json');
    });

    test('should detect and format XML', () => {
      const result = parseBody('<root><child>text</child></root>', 'application/xml');
      assert.equal(result.type, 'xml');
      assert.ok(result.formatted.includes('  <child>'));
    });

    test('should detect HTML by content-type', () => {
      const result = parseBody('<div>hello</div>', 'text/html');
      assert.equal(result.type, 'xml');
    });

    test('should parse form-encoded data', () => {
      const result = parseBody('name=John&age=30', 'application/x-www-form-urlencoded');
      assert.equal(result.type, 'form');
      assert.ok(result.formatted.includes('name = John'));
      assert.ok(result.formatted.includes('age = 30'));
    });

    test('should fall back to plain text', () => {
      const result = parseBody('just plain text', 'text/plain');
      assert.equal(result.type, 'text');
      assert.equal(result.formatted, 'just plain text');
    });

    test('should handle empty body', () => {
      const result = parseBody('', '');
      assert.equal(result.type, 'empty');
      assert.equal(result.formatted, '');
      assert.equal(result.raw, '');
    });

    test('should handle null/undefined body', () => {
      const result = parseBody(null);
      assert.equal(result.type, 'empty');
    });

    test('should also be accessible via main export namespace', () => {
      assert.equal(typeof http.body.parseBody, 'function');
    });
  });

  describe('Round-trip conversions', () => {
    test('Request → cURL → Request', async () => {
      const original = {
        method: 'POST',
        url: 'https://example.com/api',
        headers: { 'content-type': 'application/json' },
        body: '{"test":1}'
      };

      const curl = await http.curl.fromRequest(original);
      const parsed = http.curl.toRequest(curl);
      
      assert.equal(parsed.method, original.method);
      assert.equal(parsed.url, original.url);
      assert.equal(parsed.headers['content-type'], original.headers['content-type']);
      assert.equal(parsed.body, original.body);
    });

    test('Request → HAR → Request', async () => {
      const original = {
        method: 'GET',
        url: '/api/users?page=2&limit=20',
        headers: { accept: 'application/json' }
      };

      const har = await http.har.fromRequest(original);
      const parsed = http.har.toRequest(har);
      
      assert.equal(parsed.method, original.method);
      assert.ok(parsed.url.includes('page=2'));
      assert.ok(parsed.url.includes('limit=20'));
      assert.equal(parsed.headers.accept, original.headers.accept);
    });

    test('Request → String → Request', async () => {
      const original = {
        method: 'PUT',
        url: '/api/resource/123',
        httpVersion: '1.1',
        headers: {
          host: 'api.example.com',
          'content-type': 'application/json'
        },
        body: '{"status":"updated"}'
      };

      const stringified = await http.string.stringifyRequest(original);
      const parsed = http.string.parseRequest(stringified);
      
      assert.equal(parsed.method, original.method);
      assert.equal(parsed.url, original.url);
      assert.equal(parsed.httpVersion, original.httpVersion);
      assert.equal(parsed.headers.host, original.headers.host);
      assert.equal(parsed.body, original.body);
    });
  });
});
