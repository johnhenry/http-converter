// Random HTTP request generator

/**
 * Mulberry32 seeded PRNG
 * @param {number} seed
 * @returns {() => number} RNG function returning 0-1
 */
const mulberry32 = (seed) => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// ── Built-in pools ────────────────────────────────────────────────

const WEIGHTED_METHODS = [
  'GET', 'GET', 'GET', 'GET',       // 40%
  'POST', 'POST', 'POST',           // 25% (with rounding)
  'PUT', 'PUT',                      // ~15%
  'PATCH',                           // ~10%
  'DELETE',                          // ~10%
];

const PATH_TEMPLATES = [
  '/api/users', '/api/users/:id', '/api/users/:id/profile',
  '/api/posts', '/api/posts/:id', '/api/posts/:id/comments',
  '/api/auth/login', '/api/auth/logout', '/api/auth/refresh',
  '/api/search', '/api/products', '/api/products/:id',
  '/api/orders', '/api/orders/:id', '/api/orders/:id/items',
  '/health', '/api/config', '/api/events',
  '/api/notifications', '/api/teams/:id/members',
  '/api/tags', '/api/upload', '/webhook/stripe',
  '/api/v2/items', '/graphql',
];

const HEADER_POOL = [
  { name: 'accept', value: 'application/json' },
  { name: 'authorization', value: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.example' },
  { name: 'user-agent', value: 'Mozilla/5.0 (compatible; HTTPConverter/1.0)' },
  { name: 'x-request-id', gen: (rng) => randomHex(rng, 8) + '-' + randomHex(rng, 4) + '-' + randomHex(rng, 4) + '-' + randomHex(rng, 4) + '-' + randomHex(rng, 12) },
  { name: 'cache-control', value: 'no-cache' },
  { name: 'accept-language', value: 'en-US,en;q=0.9' },
  { name: 'x-forwarded-for', gen: (rng) => randomIP(rng) },
  { name: 'x-api-key', gen: (rng) => 'sk_test_' + randomHex(rng, 12) },
];

const JSON_BODIES = [
  '{"name":"Alice","email":"alice@example.com"}',
  '{"title":"New Post","body":"Lorem ipsum dolor sit amet."}',
  '{"username":"admin","password":"hunter2"}',
  '{"query":"{ users { id name } }"}',
  '{"items":[{"id":1,"qty":2},{"id":3,"qty":1}]}',
  '{"status":"active","role":"editor"}',
  '{"message":"Hello, world!"}',
  '{"filters":{"price":{"min":10,"max":100},"inStock":true}}',
];

const FORM_BODIES = [
  'username=alice&password=secret123',
  'email=test%40example.com&subscribe=true',
  'q=search+term&page=1&limit=20',
];

const TEXT_BODIES = [
  'Hello, world!',
  'OK',
  '<message>ping</message>',
];

// ── Helpers ───────────────────────────────────────────────────────

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randomHex(rng, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(rng() * 16).toString(16);
  return s;
}

function randomIP(rng) {
  return Array.from({ length: 4 }, () => Math.floor(rng() * 256)).join('.');
}

function interpolatePath(rng, template) {
  return template.replace(/:id/g, () => String(Math.floor(rng() * 9000) + 1000));
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Generate a random HTTP method
 * @param {Object} [options]
 * @param {number} [options.seed] - Deterministic PRNG seed
 * @param {string[]} [options.methods] - Allowed methods
 * @returns {string} HTTP method
 * @example
 * randomMethod() // 'GET'
 * randomMethod({ methods: ['POST', 'PUT'] }) // 'POST' or 'PUT'
 */
export const randomMethod = (options = {}) => {
  const rng = options.seed != null ? mulberry32(options.seed) : Math.random;
  const pool = options.methods || WEIGHTED_METHODS;
  return pick(rng, pool);
};

/**
 * Generate a random URL path
 * @param {Object} [options]
 * @param {number} [options.seed] - Deterministic PRNG seed
 * @param {string[]|Function} [options.paths] - Custom path templates or generator
 * @param {string} [options.baseUrl] - URL prefix
 * @returns {string} URL path
 * @example
 * randomPath() // '/api/users/4217'
 * randomPath({ baseUrl: 'https://api.example.com' }) // 'https://api.example.com/api/users/4217'
 */
export const randomPath = (options = {}) => {
  const rng = options.seed != null ? mulberry32(options.seed) : Math.random;
  let path;
  if (typeof options.paths === 'function') {
    path = options.paths(rng);
  } else {
    const pool = options.paths || PATH_TEMPLATES;
    path = interpolatePath(rng, pick(rng, pool));
  }
  return options.baseUrl ? options.baseUrl + path : path;
};

/**
 * Generate random HTTP headers
 * @param {Object} [options]
 * @param {number} [options.seed] - Deterministic PRNG seed
 * @param {Record<string,string>} [options.headers] - Headers to merge/override
 * @returns {Record<string,string>} Headers object
 * @example
 * randomHeaders() // { 'accept': 'application/json', 'x-request-id': '...' }
 */
export const randomHeaders = (options = {}) => {
  const rng = options.seed != null ? mulberry32(options.seed) : Math.random;

  if (options.headers && typeof options.headers === 'object' && options.headers !== true) {
    return { ...options.headers };
  }

  const count = 1 + Math.floor(rng() * 3);
  const pool = [...HEADER_POOL];
  const result = {};
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    const h = pool.splice(idx, 1)[0];
    result[h.name] = h.gen ? h.gen(rng) : h.value;
  }
  return result;
};

/**
 * Generate a random HTTP body
 * @param {Object} [options]
 * @param {number} [options.seed] - Deterministic PRNG seed
 * @param {string} [options.method] - HTTP method (affects body generation)
 * @param {boolean|string|Object|Function} [options.body] - Body control
 * @returns {string|null} Body string or null
 * @example
 * randomBody() // '{"name":"Alice","email":"alice@example.com"}'
 * randomBody({ method: 'GET' }) // null
 * randomBody({ body: false }) // null
 */
export const randomBody = (options = {}) => {
  const rng = options.seed != null ? mulberry32(options.seed) : Math.random;
  const method = options.method || 'POST';

  // Explicit body control
  if (options.body === false) return null;
  if (typeof options.body === 'string') return options.body;
  if (typeof options.body === 'object' && options.body !== null && options.body !== true) {
    return JSON.stringify(options.body);
  }
  if (typeof options.body === 'function') return options.body(rng, method);

  // No body for GET/HEAD/DELETE/OPTIONS
  if (['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(method)) return null;

  return pick(rng, JSON_BODIES);
};

/**
 * Generate a random HTTP request object
 * @param {Object} [options]
 * @param {number} [options.seed] - Deterministic PRNG seed
 * @param {string[]} [options.methods] - Allowed methods
 * @param {string[]|Function} [options.paths] - Custom path templates or generator
 * @param {boolean|Record<string,string>} [options.headers] - Header control (true=generate, false=empty, object=use as-is)
 * @param {boolean|string|Object|Function} [options.body] - Body control (true=auto, false=none, string/object=use, function=generate)
 * @param {string} [options.baseUrl] - URL prefix
 * @param {number} [options.count] - Return array of N requests
 * @returns {Object|Object[]} HttpRequest or array of HttpRequests
 * @example
 * randomRequest()
 * // { method: 'POST', url: '/api/users/4217', headers: {...}, body: '{"name":"Alice",...}', httpVersion: '1.1' }
 *
 * randomRequest({ seed: 42 }) // deterministic output
 * randomRequest({ count: 5 }) // array of 5 requests
 * randomRequest({ methods: ['GET'], body: false }) // GET-only, no body
 */
export const randomRequest = (options = {}) => {
  if (options.count != null) {
    const results = [];
    for (let i = 0; i < options.count; i++) {
      const reqOpts = { ...options, count: undefined };
      if (options.seed != null) reqOpts.seed = options.seed + i;
      results.push(randomRequest(reqOpts));
    }
    return results;
  }

  const rng = options.seed != null ? mulberry32(options.seed) : Math.random;
  const methodPool = options.methods || WEIGHTED_METHODS;
  const method = pick(rng, methodPool);

  // Path
  let url;
  if (typeof options.paths === 'function') {
    url = options.paths(rng);
  } else {
    const pathPool = options.paths || PATH_TEMPLATES;
    url = interpolatePath(rng, pick(rng, pathPool));
  }
  if (options.baseUrl) url = options.baseUrl + url;

  // Headers
  let headers = {};
  if (options.headers === false) {
    headers = {};
  } else if (options.headers && typeof options.headers === 'object' && options.headers !== true) {
    headers = { ...options.headers };
  } else {
    // Generate random headers
    const count = 1 + Math.floor(rng() * 3);
    const pool = [...HEADER_POOL];
    for (let i = 0; i < count && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      const h = pool.splice(idx, 1)[0];
      headers[h.name] = h.gen ? h.gen(rng) : h.value;
    }
  }

  // Body
  let body = null;
  const needsBody = !['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(method);

  if (options.body === false) {
    body = null;
  } else if (typeof options.body === 'string') {
    body = options.body;
  } else if (typeof options.body === 'object' && options.body !== null && options.body !== true) {
    body = JSON.stringify(options.body);
  } else if (typeof options.body === 'function') {
    body = options.body(rng, method);
  } else if (needsBody) {
    // Pick body format based on content-type if present, otherwise JSON
    const ct = headers['content-type'] || '';
    if (ct.includes('form-urlencoded')) {
      body = pick(rng, FORM_BODIES);
    } else if (ct.includes('text/plain')) {
      body = pick(rng, TEXT_BODIES);
    } else {
      body = pick(rng, JSON_BODIES);
      // Ensure content-type matches (only if headers weren't explicitly disabled)
      if (!headers['content-type'] && options.headers !== false) {
        headers['content-type'] = 'application/json';
      }
    }
  }

  return { method, url, httpVersion: '1.1', headers, body };
};
