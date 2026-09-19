import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import * as http from '../index.mjs';
import { randomRequest, randomMethod, randomPath, randomHeaders, randomBody } from '../random/index.mjs';

describe('Random Module', () => {
  describe('randomRequest', () => {
    test('should return valid HttpRequest shape', () => {
      const req = randomRequest();
      assert.ok(req.method, 'should have method');
      assert.ok(req.url, 'should have url');
      assert.equal(req.httpVersion, '1.1');
      assert.ok(typeof req.headers === 'object', 'should have headers object');
      assert.ok(req.body === null || typeof req.body === 'string', 'body should be null or string');
    });

    test('should produce deterministic output with same seed', () => {
      const a = randomRequest({ seed: 42 });
      const b = randomRequest({ seed: 42 });
      assert.deepStrictEqual(a, b);
    });

    test('should produce different output with different seeds', () => {
      const a = randomRequest({ seed: 1 });
      const b = randomRequest({ seed: 999 });
      // Very unlikely to be identical
      const same = a.method === b.method && a.url === b.url && a.body === b.body;
      assert.ok(!same, 'different seeds should produce different output');
    });

    test('should respect methods constraint', () => {
      for (let i = 0; i < 20; i++) {
        const req = randomRequest({ methods: ['POST', 'PUT'], seed: i });
        assert.ok(['POST', 'PUT'].includes(req.method), `method should be POST or PUT, got ${req.method}`);
      }
    });

    test('should return null body when body: false', () => {
      const req = randomRequest({ body: false, seed: 42 });
      assert.strictEqual(req.body, null);
    });

    test('should auto-generate body for POST/PUT/PATCH', () => {
      const req = randomRequest({ methods: ['POST'], seed: 42 });
      assert.ok(req.body !== null, 'POST should have a body');
      assert.ok(typeof req.body === 'string', 'body should be a string');
    });

    test('should not generate body for GET', () => {
      const req = randomRequest({ methods: ['GET'], seed: 42 });
      assert.strictEqual(req.body, null, 'GET should not have a body');
    });

    test('should return array when count is set', () => {
      const reqs = randomRequest({ count: 5, seed: 42 });
      assert.ok(Array.isArray(reqs), 'should return array');
      assert.equal(reqs.length, 5);
      reqs.forEach(req => {
        assert.ok(req.method, 'each should have method');
        assert.ok(req.url, 'each should have url');
      });
    });

    test('should return deterministic array with seed + count', () => {
      const a = randomRequest({ count: 3, seed: 42 });
      const b = randomRequest({ count: 3, seed: 42 });
      assert.deepStrictEqual(a, b);
    });

    test('should use custom headers object', () => {
      const req = randomRequest({
        headers: { 'x-custom': 'value' },
        seed: 42
      });
      assert.equal(req.headers['x-custom'], 'value');
    });

    test('should produce empty headers when headers: false', () => {
      const req = randomRequest({ headers: false, seed: 42 });
      assert.deepStrictEqual(req.headers, {});
    });

    test('should use custom paths array', () => {
      const req = randomRequest({ paths: ['/custom/path'], seed: 42 });
      assert.equal(req.url, '/custom/path');
    });

    test('should use custom paths function', () => {
      const req = randomRequest({ paths: (rng) => '/fn/' + Math.floor(rng() * 100), seed: 42 });
      assert.ok(req.url.startsWith('/fn/'));
    });

    test('should prepend baseUrl', () => {
      const req = randomRequest({ baseUrl: 'https://api.example.com', seed: 42 });
      assert.ok(req.url.startsWith('https://api.example.com/'));
    });

    test('should use string body directly', () => {
      const req = randomRequest({ body: 'custom body', seed: 42 });
      assert.equal(req.body, 'custom body');
    });

    test('should stringify object body', () => {
      const req = randomRequest({ body: { key: 'val' }, seed: 42 });
      assert.equal(req.body, '{"key":"val"}');
    });

    test('should use function body', () => {
      const req = randomRequest({
        body: (rng, method) => `${method}:${Math.floor(rng() * 100)}`,
        methods: ['POST'],
        seed: 42
      });
      assert.ok(req.body.startsWith('POST:'));
    });

    test('should set content-type when auto-generating JSON body', () => {
      // Use headers: true (default) so content-type auto-sets
      const req = randomRequest({ methods: ['POST'], seed: 42 });
      if (req.body) {
        // Either content-type was picked from header pool or auto-set for JSON body
        assert.ok(
          req.headers['content-type'] || req.headers['Content-Type'],
          'should have content-type header when body is generated'
        );
      }
    });

    test('should round-trip through curl.fromRequest', async () => {
      const req = randomRequest({ seed: 42, baseUrl: 'https://example.com' });
      const curlCmd = await http.curl.fromRequest(req);
      assert.ok(curlCmd.startsWith('curl'), 'should produce valid curl command');
      assert.ok(typeof curlCmd === 'string');
    });

    test('should round-trip through curl.fromRequest and back', async () => {
      const original = randomRequest({ seed: 77, methods: ['POST'], baseUrl: 'https://example.com' });
      const curlCmd = await http.curl.fromRequest(original);
      const parsed = http.curl.toRequest(curlCmd);
      assert.equal(parsed.method, original.method);
      assert.ok(parsed.url.includes('example.com'));
      if (original.body) {
        assert.equal(parsed.body, original.body);
      }
    });
  });

  describe('randomMethod', () => {
    test('should return a valid HTTP method', () => {
      const method = randomMethod();
      assert.ok(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method));
    });

    test('should respect methods constraint', () => {
      const method = randomMethod({ methods: ['OPTIONS'], seed: 42 });
      assert.equal(method, 'OPTIONS');
    });

    test('should be deterministic with seed', () => {
      assert.equal(randomMethod({ seed: 42 }), randomMethod({ seed: 42 }));
    });
  });

  describe('randomPath', () => {
    test('should return a path string', () => {
      const path = randomPath();
      assert.ok(path.startsWith('/'), 'should start with /');
    });

    test('should interpolate :id templates', () => {
      const path = randomPath({ paths: ['/users/:id'], seed: 42 });
      assert.ok(!path.includes(':id'), 'should not contain :id template');
      assert.ok(/\/users\/\d+/.test(path), 'should have numeric id');
    });

    test('should prepend baseUrl', () => {
      const path = randomPath({ baseUrl: 'https://api.com', seed: 42 });
      assert.ok(path.startsWith('https://api.com/'));
    });

    test('should use custom paths function', () => {
      const path = randomPath({ paths: () => '/static', seed: 42 });
      assert.equal(path, '/static');
    });
  });

  describe('randomHeaders', () => {
    test('should return an object with 1-3 headers', () => {
      const hdrs = randomHeaders({ seed: 42 });
      const keys = Object.keys(hdrs);
      assert.ok(keys.length >= 1 && keys.length <= 3, `expected 1-3 headers, got ${keys.length}`);
    });

    test('should return custom headers when object provided', () => {
      const hdrs = randomHeaders({ headers: { 'x-test': 'yes' } });
      assert.equal(hdrs['x-test'], 'yes');
      assert.equal(Object.keys(hdrs).length, 1);
    });

    test('should be deterministic with seed', () => {
      assert.deepStrictEqual(randomHeaders({ seed: 42 }), randomHeaders({ seed: 42 }));
    });
  });

  describe('randomBody', () => {
    test('should return null for GET', () => {
      assert.strictEqual(randomBody({ method: 'GET' }), null);
    });

    test('should return string for POST', () => {
      const body = randomBody({ method: 'POST', seed: 42 });
      assert.ok(typeof body === 'string');
    });

    test('should return null when body: false', () => {
      assert.strictEqual(randomBody({ body: false }), null);
    });

    test('should return custom string', () => {
      assert.equal(randomBody({ body: 'custom' }), 'custom');
    });

    test('should stringify object', () => {
      assert.equal(randomBody({ body: { a: 1 } }), '{"a":1}');
    });

    test('should use function', () => {
      const body = randomBody({ body: (rng, method) => method, method: 'PUT' });
      assert.equal(body, 'PUT');
    });
  });
});
