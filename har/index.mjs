// HAR (HTTP Archive) format conversion
import { normalizeHeaders, parseQueryString, getByteSize } from '../core/utils.mjs';

/**
 * Convert HTTP request to HAR entry
 * @param {Object|Request} request - HTTP request object or native Request
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} HAR entry
 * @example
 * await fromRequest({ method: 'GET', url: '/api', headers: { host: 'example.com' } })
 */
export const fromRequest = async (request, options = {}) => {
  // Handle native Request object
  if (request instanceof Request) {
    return fromRequestAsync(request, options);
  }

  return fromRequestSync(request, options);
};

const fromRequestAsync = async (request, options) => {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = request.body ? await request.text() : null;

  return fromRequestSync({
    method: request.method,
    url: request.url,
    headers,
    body
  }, options);
};

const fromRequestSync = (request, options = {}) => {
  const {
    startedDateTime = new Date().toISOString(),
    time = 0,
    timings = {},
    serverIPAddress = '',
    connection = '',
    comment = ''
  } = options;

  const headers = normalizeHeaders(request.headers);
  
  return {
    startedDateTime,
    time,
    request: {
      method: request.method || 'GET',
      url: request.url || '/',
      httpVersion: `HTTP/${request.httpVersion || '1.1'}`,
      cookies: parseCookies(headers.cookie),
      headers: Object.entries(headers).map(([name, value]) => {
        if (Array.isArray(value)) {
          return value.map(v => ({ name, value: v }));
        }
        return { name, value: String(value) };
      }).flat(),
      queryString: parseQueryString(request.url),
      postData: request.body ? {
        mimeType: headers['content-type'] || 'application/octet-stream',
        text: request.body,
        params: parsePostData(request.body, headers['content-type'])
      } : undefined,
      headersSize: -1,
      bodySize: request.body ? getByteSize(request.body) : 0
    },
    response: {
      status: 0,
      statusText: '',
      httpVersion: '',
      cookies: [],
      headers: [],
      content: {
        size: 0,
        compression: 0,
        mimeType: 'application/octet-stream',
        text: ''
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: -1
    },
    cache: {},
    timings: {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: 0,
      wait: 0,
      receive: 0,
      ssl: -1,
      ...timings
    },
    serverIPAddress,
    connection,
    comment
  };
};

/**
 * Convert HTTP response to HAR entry (or update existing entry)
 * @param {Object} response - HTTP response object
 * @param {Object} request - HTTP request object (optional)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} HAR entry
 * @example
 * await fromResponse({ statusCode: 200, headers: {}, body: '{}' })
 */
export const fromResponse = async (response, request = null, options = {}) => {
  const entry = request ? await fromRequest(request, options) : {
    startedDateTime: options.startedDateTime || new Date().toISOString(),
    time: options.time || 0,
    request: {
      method: 'GET',
      url: '',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [],
      queryString: [],
      headersSize: -1,
      bodySize: 0
    },
    cache: {},
    timings: options.timings || {}
  };
  
  const headers = normalizeHeaders(response.headers);
  
  entry.response = {
    status: response.statusCode || response.status || 200,
    statusText: response.statusText || 'OK',
    httpVersion: `HTTP/${response.httpVersion || '1.1'}`,
    cookies: parseCookies(headers['set-cookie']),
    headers: Object.entries(headers).map(([name, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => ({ name, value: String(v) }));
      }
      return { name, value: String(value) };
    }).flat(),
    content: {
      size: response.body ? getByteSize(response.body) : 0,
      compression: 0,
      mimeType: headers['content-type'] || 'application/octet-stream',
      text: response.body || '',
      encoding: detectEncoding(response.body)
    },
    redirectURL: headers.location || '',
    headersSize: -1,
    bodySize: response.body ? getByteSize(response.body) : -1
  };
  
  return entry;
};

/**
 * Convert HAR entry to HTTP request
 * @param {Object} harEntry - HAR entry object
 * @returns {Object} HTTP request object
 * @example
 * toRequest(harEntry)
 */
export const toRequest = (harEntry) => {
  const { request } = harEntry;
  const headers = {};

  // Convert headers array to object (headers is optional per the HAR spec)
  (request.headers || []).forEach(({ name, value }) => {
    const key = name.toLowerCase();
    if (headers[key]) {
      headers[key] = Array.isArray(headers[key])
        ? [...headers[key], value]
        : [headers[key], value];
    } else {
      headers[key] = value;
    }
  });

  // Add cookies if present
  if (request.cookies && request.cookies.length > 0) {
    headers.cookie = request.cookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
  }

  return {
    method: request.method,
    url: buildUrlFromHar(request),
    httpVersion: (request.httpVersion || 'HTTP/1.1').replace('HTTP/', ''),
    headers,
    body: request.postData?.text || null
  };
};

/**
 * Convert HAR entry to HTTP response
 * @param {Object} harEntry - HAR entry object
 * @returns {Object} HTTP response object
 * @example
 * toResponse(harEntry)
 */
export const toResponse = (harEntry) => {
  const { response } = harEntry;
  const headers = {};

  // Convert headers array to object (headers is optional per the HAR spec)
  (response.headers || []).forEach(({ name, value }) => {
    const key = name.toLowerCase();
    if (headers[key]) {
      headers[key] = Array.isArray(headers[key])
        ? [...headers[key], value]
        : [headers[key], value];
    } else {
      headers[key] = value;
    }
  });

  // Add cookies if present
  if (response.cookies && response.cookies.length > 0) {
    headers['set-cookie'] = response.cookies.map(cookie => {
      let cookieStr = `${cookie.name}=${cookie.value}`;
      if (cookie.path) cookieStr += `; Path=${cookie.path}`;
      if (cookie.domain) cookieStr += `; Domain=${cookie.domain}`;
      if (cookie.expires) cookieStr += `; Expires=${cookie.expires}`;
      if (cookie.httpOnly) cookieStr += '; HttpOnly';
      if (cookie.secure) cookieStr += '; Secure';
      if (cookie.sameSite) cookieStr += `; SameSite=${cookie.sameSite}`;
      return cookieStr;
    });
  }

  return {
    httpVersion: (response.httpVersion || 'HTTP/1.1').replace('HTTP/', ''),
    statusCode: response.status,
    statusText: response.statusText,
    headers,
    body: decodeHarContent(response.content)
  };
};

/**
 * Extract the body text from a HAR response `content` object, decoding it
 * when the HAR spec's optional `encoding: "base64"` marker is present
 * (commonly used for binary/non-UTF8 response bodies).
 * @param {Object} [content] - HAR response.content
 * @returns {string|null} Decoded body text
 */
const decodeHarContent = (content) => {
  const text = content?.text;
  if (!text) return null;

  if (content.encoding === 'base64') {
    try {
      const binary = atob(text);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder('utf-8').decode(bytes);
    } catch {
      // Malformed base64 - fall back to the raw (still-encoded) text
      // rather than throwing on an otherwise-valid HAR entry.
      return text;
    }
  }

  return text;
};

/**
 * Parse cookies from cookie header
 * @param {string|Array} cookieHeader - Cookie header value(s)
 * @returns {Array} Parsed cookies
 */
const parseCookies = (cookieHeader) => {
  if (!cookieHeader) return [];
  
  const cookies = [];
  const headerValues = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  
  headerValues.forEach(headerValue => {
    const pairs = headerValue.split(/;\s*/);
    pairs.forEach(pair => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > -1) {
        cookies.push({
          name: pair.substring(0, eqIndex),
          value: pair.substring(eqIndex + 1)
        });
      }
    });
  });
  
  return cookies;
};

/**
 * Parse post data based on content type
 * @param {string} body - Request body
 * @param {string} contentType - Content-Type header
 * @returns {Array} Parsed parameters
 */
const parsePostData = (body, contentType) => {
  if (!body || !contentType) return [];
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = [];
    const pairs = body.split('&');
    pairs.forEach(pair => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex > -1) {
        params.push({
          name: decodeURIComponent(pair.substring(0, eqIndex)),
          value: decodeURIComponent(pair.substring(eqIndex + 1))
        });
      }
    });
    return params;
  }
  
  return [];
};

/**
 * Detect encoding of body content
 * @param {string} body - Response body
 * @returns {string} Detected encoding
 */
const detectEncoding = (body) => {
  if (!body) return undefined;
  
  // Simple base64 detection
  if (/^[A-Za-z0-9+/]+=*$/.test(body) && body.length % 4 === 0) {
    return 'base64';
  }
  
  return undefined;
};

/**
 * Build URL from HAR request object
 * @param {Object} request - HAR request object
 * @returns {string} Complete URL
 */
const buildUrlFromHar = (request) => {
  const { url, queryString } = request;
  
  if (!queryString || queryString.length === 0) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    // Check if URL already has query parameters
    const hasExistingParams = urlObj.search.length > 0;
    
    // Only add queryString if URL doesn't already contain these parameters
    if (!hasExistingParams) {
      queryString.forEach(({ name, value }) => {
        urlObj.searchParams.append(name, value);
      });
    }
    
    return urlObj.toString();
  } catch {
    // Fallback for relative URLs
    // Check if URL already has query parameters
    if (url.includes('?')) {
      // URL already has parameters, don't add duplicates
      return url;
    }
    
    const queryPairs = queryString.map(({ name, value }) => 
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
    );
    return `${url}?${queryPairs.join('&')}`;
  }
};
