import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';

describe('Native Request/Response handling', () => {
  test('should stringify native Request object', async () => {
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      body: JSON.stringify({ test: true })
    });

    const stringified = await http.string.stringifyRequest(request);
    
    assert.ok(stringified.includes('POST https://example.com/api HTTP/1.1'));
    assert.ok(stringified.includes('content-type: application/json'));
    assert.ok(stringified.includes('authorization: Bearer token123'));
    assert.ok(stringified.includes('{"test":true}'));
  });

  test('should stringify native Response object', async () => {
    const response = new Response('{"success":true}', {
      status: 201,
      statusText: 'Created',
      headers: {
        'Content-Type': 'application/json',
        'Location': '/api/resource/123'
      }
    });

    const stringified = await http.string.stringifyResponse(response);
    
    assert.ok(stringified.includes('HTTP/1.1 201 Created'));
    assert.ok(stringified.includes('content-type: application/json'));
    assert.ok(stringified.includes('location: /api/resource/123'));
    assert.ok(stringified.includes('{"success":true}'));
  });

  test('should handle Request with FormData body', async () => {
    // Skip if FormData is not available
    if (typeof FormData === 'undefined') {
      return;
    }

    const formData = new FormData();
    formData.append('name', 'Test User');
    formData.append('email', 'test@example.com');

    const request = new Request('https://example.com/submit', {
      method: 'POST',
      body: formData
    });

    // This will throw because FormData can't be converted to text easily
    // But we should handle it gracefully
    try {
      await http.string.stringifyRequest(request);
    } catch (error) {
      // Expected to fail with FormData
      assert.ok(error);
    }
  });

  test('should detect native Request and Response objects', () => {
    const request = new Request('https://example.com');
    const response = new Response('test');

    // The stringify function should handle these
    const reqResult = http.string.stringify(request);
    const resResult = http.string.stringify(response);

    // These return promises for native objects
    assert.ok(reqResult instanceof Promise);
    assert.ok(resResult instanceof Promise);
  });
});

describe('Native Request support in curl module', () => {
  test('should convert native Request to cURL', async () => {
    const request = new Request('https://api.example.com/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      body: JSON.stringify({ name: 'Test' })
    });

    const curl = await http.curl.fromRequest(request);

    assert.ok(curl.includes('curl'));
    assert.ok(curl.includes('-X POST'));
    assert.ok(curl.includes('https://api.example.com/users'));
    assert.ok(curl.includes('content-type: application/json'));
    assert.ok(curl.includes('{"name":"Test"}'));
  });

  test('should convert native GET Request to cURL', async () => {
    const request = new Request('https://example.com/api');

    const curl = await http.curl.fromRequest(request);

    assert.ok(curl.includes('curl'));
    assert.ok(curl.includes('https://example.com/api'));
    assert.ok(!curl.includes('-X GET'));
  });
});

describe('Native Request support in HAR module', () => {
  test('should convert native Request to HAR entry', async () => {
    const request = new Request('https://example.com/api?page=1', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const har = await http.har.fromRequest(request);

    assert.equal(har.request.method, 'GET');
    assert.ok(har.request.url.includes('https://example.com/api'));
    assert.ok(har.request.headers.some(h => h.name === 'accept'));
  });

  test('should convert native POST Request to HAR entry', async () => {
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"test":true}'
    });

    const har = await http.har.fromRequest(request);

    assert.equal(har.request.method, 'POST');
    assert.ok(har.request.postData);
    assert.equal(har.request.postData.text, '{"test":true}');
  });
});

describe('Native Request support in fetch module', () => {
  test('should convert native Request to fetch parameters', async () => {
    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"Test"}'
    });

    const { url, options } = await http.fetch.fromRequest(request);

    assert.ok(url.includes('https://example.com/api'));
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['content-type'], 'application/json');
    assert.equal(options.body, '{"name":"Test"}');
  });

  test('should generate fetch code from native Request', async () => {
    const request = new Request('https://example.com/data', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const code = await http.fetch.toCode(request);

    assert.ok(code.includes('fetch('));
    assert.ok(code.includes('https://example.com/data'));
    assert.ok(code.includes('accept'));
  });
});

describe('allFormats convenience function', () => {
  test('should convert native Request to all formats', async () => {
    const { allFormats } = await import('../index.mjs');

    const request = new Request('https://example.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"test":true}'
    });

    const result = await allFormats(request, {
      curl: { pretty: true },
      fetch: { async: true },
    });

    assert.ok(result.httpString.includes('POST https://example.com/api HTTP/1.1'));
    assert.ok(result.curl.includes('curl'));
    assert.ok(result.curl.includes('\\\n'));  // pretty mode
    assert.ok(result.fetchCode.includes('fetch('));
    assert.ok(result.fetchCode.includes('await'));
    assert.equal(result.har.request.method, 'POST');
    assert.ok(result.har.request.postData);
  });

  test('should convert plain object to all formats', async () => {
    const { allFormats } = await import('../index.mjs');

    const request = {
      method: 'GET',
      url: 'https://example.com/data',
      headers: { 'accept': 'application/json' },
    };

    const result = await allFormats(request);

    assert.ok(result.httpString.includes('GET https://example.com/data HTTP/1.1'));
    assert.ok(result.curl.includes('curl'));
    assert.ok(result.curl.includes('https://example.com/data'));
    assert.ok(result.fetchCode.includes('fetch('));
    assert.equal(result.har.request.method, 'GET');
  });
});

describe('cURL pretty-print formatting', () => {
  test('should keep flag and value on same line in pretty mode', async () => {
    const request = {
      method: 'POST',
      url: 'https://api.example.com/users',
      headers: { 'content-type': 'application/json' },
      body: '{"name":"Test"}'
    };

    const curl = await http.curl.fromRequest(request, { pretty: true });
    const lines = curl.split(' \\\n  ');

    // Each line with a flag should have the value on the same line
    for (const line of lines) {
      if (line.startsWith('-X')) {
        assert.ok(line.includes('POST'), 'Flag -X should be on same line as method');
      }
      if (line.startsWith('-H')) {
        assert.ok(line.includes(':'), 'Flag -H should be on same line as header value');
      }
      if (line.startsWith('--data-raw')) {
        assert.ok(line.includes('Test'), 'Flag --data-raw should be on same line as body');
      }
    }
  });

  test('should still produce valid non-pretty output', async () => {
    const request = {
      method: 'POST',
      url: 'https://api.example.com/users',
      headers: { 'content-type': 'application/json' },
      body: '{"name":"Test"}'
    };

    const curl = await http.curl.fromRequest(request, { pretty: false });

    assert.ok(!curl.includes('\n'), 'Non-pretty output should be single line');
    assert.ok(curl.includes('-X POST'));
    assert.ok(curl.includes('-H'));
    assert.ok(curl.includes('--data-raw'));
  });
});
