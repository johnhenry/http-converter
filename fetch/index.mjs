// Fetch API conversion
import { normalizeHeaders } from '../core/utils.mjs';

/**
 * Convert HTTP request to Fetch API parameters
 * @param {Object|Request} request - HTTP request object or native Request
 * @returns {Promise<{url: string, options: Object}>} Fetch parameters
 * @example
 * await fromRequest({ method: 'POST', url: '/api', headers: { 'content-type': 'application/json' }, body: '{}' })
 * // Returns: { url: '/api', options: { method: 'POST', headers: {...}, body: '{}' } }
 */
export const fromRequest = async (request) => {
  // Handle native Request object
  if (request instanceof Request) {
    return fromRequestAsync(request);
  }

  return fromRequestSync(request);
};

const fromRequestAsync = async (request) => {
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
  });
};

const fromRequestSync = (request) => {
  const { method = 'GET', url, headers = {}, body } = request;
  
  const options = {};
  
  // Only add method if not GET
  if (method !== 'GET') {
    options.method = method;
  }
  
  // Normalize headers
  const normalizedHeaders = normalizeHeaders(headers);
  
  // Convert headers to plain object (no arrays)
  const fetchHeaders = {};
  for (const [name, value] of Object.entries(normalizedHeaders)) {
    if (Array.isArray(value)) {
      // Fetch API doesn't support multiple headers with same name
      // Join them with comma (standard for most headers)
      fetchHeaders[name] = value.join(', ');
    } else {
      fetchHeaders[name] = value;
    }
  }
  
  if (Object.keys(fetchHeaders).length > 0) {
    options.headers = fetchHeaders;
  }
  
  // Add body for appropriate methods
  if (body && method !== 'GET' && method !== 'HEAD') {
    options.body = body;
  }
  
  return { url, options };
};

/**
 * Convert Fetch API parameters to HTTP request
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Object} HTTP request object
 * @example
 * toRequest('/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
 */
export const toRequest = (url, options = {}) => {
  return {
    method: options.method || 'GET',
    url,
    httpVersion: '1.1', // Fetch doesn't expose HTTP version
    headers: normalizeHeaders(options.headers || {}),
    body: options.body || null
  };
};

/**
 * Convert HTTP response to Fetch-like response object
 * @param {Object} response - HTTP response object
 * @param {string} body - Response body (optional)
 * @returns {Object} Fetch-like response object
 * @example
 * fromResponse({ statusCode: 200, statusText: 'OK', headers: {}, body: 'Hello' })
 */
export const fromResponse = (response, body = null) => {
  const finalBody = body || response.body;
  
  return {
    ok: response.statusCode >= 200 && response.statusCode < 300,
    status: response.statusCode,
    statusText: response.statusText,
    headers: new Headers(normalizeHeaders(response.headers)),
    url: '', // Not available from HTTP response
    redirected: false, // Not available from HTTP response
    type: 'basic', // Not available from HTTP response
    body: finalBody,
    // Methods that would be on a real Response object
    text: () => Promise.resolve(finalBody || ''),
    json: () => Promise.resolve(finalBody ? JSON.parse(finalBody) : null),
    blob: () => Promise.resolve(new Blob([finalBody || ''])),
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(finalBody || '').buffer),
    formData: () => Promise.reject(new Error('FormData parsing not implemented'))
  };
};

/**
 * Convert Fetch Response to HTTP response object
 * @param {Response} fetchResponse - Fetch API Response object
 * @param {boolean} includeBody - Whether to include body (requires await)
 * @returns {Promise<Object>} HTTP response object
 * @example
 * const response = await fetch('/api');
 * const httpResponse = await toResponse(response, true);
 */
export const toResponse = async (fetchResponse, includeBody = true) => {
  const headers = {};
  
  // Extract headers
  fetchResponse.headers.forEach((value, name) => {
    const key = name.toLowerCase();
    if (headers[key]) {
      headers[key] = Array.isArray(headers[key])
        ? [...headers[key], value]
        : [headers[key], value];
    } else {
      headers[key] = value;
    }
  });
  
  const response = {
    httpVersion: '1.1', // Fetch doesn't expose HTTP version
    statusCode: fetchResponse.status,
    statusText: fetchResponse.statusText,
    headers,
    body: null
  };
  
  if (includeBody && !fetchResponse.bodyUsed) {
    try {
      response.body = await fetchResponse.text();
    } catch (error) {
      // Body might have been consumed or other error
      response.body = null;
    }
  }
  
  return response;
};

/**
 * Generate fetch() code from request object
 * @param {Object|Request} request - HTTP request object or native Request
 * @param {Object} options - Code generation options
 * @returns {Promise<string>} JavaScript code
 * @example
 * await toCode({ method: 'POST', url: '/api', headers: {}, body: '{}' })
 * // Returns: "fetch('/api', {\n  method: 'POST',\n  body: '{}'\n})"
 */
export const toCode = async (request, options = {}) => {
  // Handle native Request object
  if (request instanceof Request) {
    return toCodeAsync(request, options);
  }

  return toCodeFromPlain(request, options);
};

const toCodeAsync = async (request, options) => {
  const { url, options: fetchOptions } = await fromRequest(request);
  return buildCode(url, fetchOptions, options);
};

const toCodeFromPlain = (request, options = {}) => {
  const { url, options: fetchOptions } = fromRequestSync(request);
  return buildCode(url, fetchOptions, options);
};

const buildCode = (url, fetchOptions, options = {}) => {
  const { pretty = true, async = true } = options;
  
  // Build the fetch call
  let code = '';
  
  if (async) {
    code += 'const response = await ';
  }
  
  code += `fetch('${url}'`;
  
  if (Object.keys(fetchOptions).length > 0) {
    if (pretty) {
      code += ', {\n';
      
      if (fetchOptions.method) {
        code += `  method: '${fetchOptions.method}',\n`;
      }
      
      if (fetchOptions.headers) {
        code += '  headers: {\n';
        for (const [name, value] of Object.entries(fetchOptions.headers)) {
          code += `    '${name}': '${value}',\n`;
        }
        code += '  },\n';
      }
      
      if (fetchOptions.body) {
        const bodyStr = JSON.stringify(fetchOptions.body);
        code += `  body: ${bodyStr}\n`;
      }
      
      code += '}';
    } else {
      code += ', ' + JSON.stringify(fetchOptions);
    }
  }
  
  code += ')';
  
  if (async) {
    code += ';\n';
    code += 'const data = await response.json();';
  }
  
  return code;
};

/**
 * Create a mock Response object from HTTP response
 * @param {Object} httpResponse - HTTP response object
 * @returns {Response} Mock Response object
 * @example
 * const mockResponse = createMockResponse({ statusCode: 200, headers: {}, body: '{}' })
 */
export const createMockResponse = (httpResponse) => {
  const headers = new Headers(normalizeHeaders(httpResponse.headers));
  const body = httpResponse.body || '';
  
  // Create a mock Response
  return new Response(body, {
    status: httpResponse.statusCode,
    statusText: httpResponse.statusText,
    headers
  });
};
