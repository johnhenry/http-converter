// HTTP string parsing and stringifying
import { normalizeHeaders, getByteSize, formatHeaders } from '../core/utils.mjs';

/**
 * Parse HTTP string (auto-detect request or response)
 * @param {string} httpString - Raw HTTP string
 * @returns {Object} Parsed HTTP object
 * @example
 * parse('GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n')
 */
export const parse = (httpString) => {
  const trimmed = httpString.trim();
  if (trimmed.startsWith('HTTP/')) {
    return parseResponse(httpString);
  }
  // Match any word followed by a space and path-like string
  if (trimmed.match(/^[A-Z]+\s+\//)) {
    return parseRequest(httpString);
  }
  throw new Error('Cannot detect HTTP message type');
};

/**
 * Parse HTTP request string
 * @param {string} requestString - Raw HTTP request string
 * @returns {Object} Parsed request object
 * @example
 * parseRequest('POST /api HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n{"data":1}')
 */
export const parseRequest = (requestString) => {
  const { headLines, body } = splitHeadAndBody(requestString);
  const requestLine = headLines[0].trim();
  const parts = requestLine.split(' ');

  if (parts.length < 2) {
    throw new Error('Invalid HTTP request line');
  }

  const method = parts[0];
  let url = parts[1];
  const httpVersion = parts[2] ? parts[2].replace('HTTP/', '') : '1.1';

  // Check if URL is absolute (contains protocol or starts with //)
  const isAbsoluteUrl = /^https?:\/\//.test(url) || url.startsWith('//');

  const headers = {};

  for (let i = 1; i < headLines.length; i++) {
    const colonIndex = headLines[i].indexOf(':');
    if (colonIndex > -1) {
      const name = headLines[i].substring(0, colonIndex).trim();
      const value = headLines[i].substring(colonIndex + 1).trim();
      const key = name.toLowerCase();

      // Handle multiple headers with same name
      if (headers[key]) {
        headers[key] = Array.isArray(headers[key])
          ? [...headers[key], value]
          : [headers[key], value];
      } else {
        headers[key] = value;
      }
    }
  }

  // If URL is not absolute but has a Host header, we could optionally construct the full URL
  // For now, we'll keep the URL as provided in the request line

  return {
    method,
    url,
    httpVersion,
    headers,
    body: body || null
  };
};

/**
 * Parse HTTP response string
 * @param {string} responseString - Raw HTTP response string
 * @returns {Object} Parsed response object
 * @example
 * parseResponse('HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\n\\r\\nHello')
 */
export const parseResponse = (responseString) => {
  const { headLines, body } = splitHeadAndBody(responseString);
  const statusLine = headLines[0].trim();
  const match = statusLine.match(/^HTTP\/(\d\.\d)\s+(\d+)\s*(.*)?$/);

  if (!match) {
    throw new Error('Invalid HTTP response status line');
  }

  const [, httpVersion, statusCode, statusText] = match;
  const headers = {};

  for (let i = 1; i < headLines.length; i++) {
    const colonIndex = headLines[i].indexOf(':');
    if (colonIndex > -1) {
      const name = headLines[i].substring(0, colonIndex).trim();
      const value = headLines[i].substring(colonIndex + 1).trim();
      const key = name.toLowerCase();

      if (headers[key]) {
        headers[key] = Array.isArray(headers[key])
          ? [...headers[key], value]
          : [headers[key], value];
      } else {
        headers[key] = value;
      }
    }
  }

  return {
    httpVersion,
    statusCode: parseInt(statusCode, 10),
    statusText: statusText || getDefaultStatusText(parseInt(statusCode, 10)),
    headers,
    body: body || null
  };
};

/**
 * Split a raw HTTP message into its header lines and raw body text.
 *
 * Headers are split line-by-line (tolerating either CRLF or bare LF), but
 * the body is sliced verbatim from the original string rather than being
 * reassembled by joining split lines with `\n` - that reassembly would
 * silently rewrite any CRLF sequences *inside* the body to LF, corrupting
 * binary-ish or exact-fidelity payloads on parse.
 * @param {string} raw - Raw HTTP request/response text
 * @returns {{ headLines: string[], body: string|null }}
 */
const splitHeadAndBody = (raw) => {
  const lineEndRegex = /\r\n|\n/g;
  const headLines = [];
  let lineStart = 0;
  let match;

  while ((match = lineEndRegex.exec(raw)) !== null) {
    const line = raw.slice(lineStart, match.index);
    if (line === '') {
      // Blank line marks the end of the headers; the body is everything
      // after it, taken verbatim (untouched by line-ending normalization).
      return { headLines, body: raw.slice(lineEndRegex.lastIndex) };
    }
    headLines.push(line);
    lineStart = lineEndRegex.lastIndex;
  }

  // No blank-line separator found - whatever's left is the last header
  // line (or the request/status line itself), and there is no body.
  if (lineStart < raw.length) {
    headLines.push(raw.slice(lineStart));
  }

  return { headLines, body: null };
};

/**
 * Stringify HTTP object (auto-detect request or response)
 * @param {Object} httpObject - HTTP request or response object
 * @returns {Promise<string>} HTTP string
 * @example
 * stringify({ method: 'GET', url: '/', httpVersion: '1.1', headers: {}, body: null })
 */
export const stringify = (httpObject) => {
  if ('method' in httpObject || httpObject instanceof Request) {
    return stringifyRequest(httpObject);
  }
  if ('statusCode' in httpObject || 'status' in httpObject || httpObject instanceof Response) {
    return stringifyResponse(httpObject);
  }
  throw new Error('Invalid HTTP object: must have either "method" or "statusCode"');
};

/**
 * Stringify HTTP request object
 * @param {Object|Request} request - Request object or native Request
 * @param {Object} options - Stringify options
 * @param {boolean} options.absoluteUrl - Use absolute URL in request line (default: true for absolute URLs)
 * @returns {Promise<string>} HTTP request string
 * @example
 * stringifyRequest({ method: 'POST', url: '/api', headers: { host: 'example.com' }, body: '{}' })
 */
export const stringifyRequest = (request, options = {}) => {
  // Handle native Request object
  if (request instanceof Request) {
    return stringifyRequestAsync(request, options);
  }

  return Promise.resolve(stringifyRequestSync(request, options));
};

const stringifyRequestAsync = async (request, options) => {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const body = request.body ? await request.text() : null;
  
  return stringifyRequestSync({
    method: request.method,
    url: request.url,
    httpVersion: '1.1',
    headers,
    body
  }, options);
};

const stringifyRequestSync = (request, options = {}) => {
  const { 
    method = 'GET', 
    url = '/', 
    httpVersion = '1.1', 
    headers = {}, 
    body 
  } = request;
  
  const { absoluteUrl } = options;
  
  // Parse the URL to determine if we need to include host in the request line
  let requestUrl = url;
  let hostHeader = null;
  let useAbsoluteUrl = absoluteUrl;
  
  try {
    const urlObj = new URL(url);
    // For absolute URLs, determine whether to use full URL or path
    if (urlObj.protocol && urlObj.host) {
      hostHeader = urlObj.host;
      
      // If absoluteUrl option is not explicitly set, use full URL for absolute URLs
      if (useAbsoluteUrl === undefined) {
        useAbsoluteUrl = true;
      }
      
      if (!useAbsoluteUrl) {
        // Extract path and query
        requestUrl = urlObj.pathname + urlObj.search + urlObj.hash;
        if (!requestUrl) requestUrl = '/';
      }
    }
  } catch {
    // Relative URL - use as-is
    requestUrl = url;
  }
  
  let result = `${method} ${requestUrl} HTTP/${httpVersion}\r\n`;
  
  // Normalize and add headers
  const normalizedHeaders = normalizeHeaders(headers);
  
  // Ensure Host header is present for absolute URLs
  if (hostHeader && !normalizedHeaders.host) {
    normalizedHeaders.host = hostHeader;
  }
  
  // Add Content-Length if body exists and not present
  if (body && !('content-length' in normalizedHeaders)) {
    normalizedHeaders['content-length'] = getByteSize(body).toString();
  }
  
  result += formatHeaders(normalizedHeaders);
  result += '\r\n';
  
  if (body) {
    result += body;
  }
  
  return result;
};

/**
 * Stringify HTTP response object
 * @param {Object|Response} response - Response object or native Response
 * @returns {Promise<string>} HTTP response string
 * @example
 * stringifyResponse({ statusCode: 200, statusText: 'OK', headers: {}, body: 'Hello' })
 */
export const stringifyResponse = (response) => {
  // Handle native Response object
  if (response instanceof Response) {
    return stringifyResponseAsync(response);
  }

  return Promise.resolve(stringifyResponseSync(response));
};

const stringifyResponseAsync = async (response) => {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const body = response.body ? await response.text() : null;
  
  return stringifyResponseSync({
    httpVersion: '1.1',
    statusCode: response.status,
    statusText: response.statusText,
    headers,
    body
  });
};

const stringifyResponseSync = (response) => {
  const { 
    httpVersion = '1.1', 
    statusCode = 200,
    status = statusCode, // Support both statusCode and status
    statusText = getDefaultStatusText(status || statusCode), 
    headers = {}, 
    body 
  } = response;
  
  const finalStatusCode = statusCode || status;
  let result = `HTTP/${httpVersion} ${finalStatusCode} ${statusText}\r\n`;
  
  // Normalize and add headers
  const normalizedHeaders = normalizeHeaders(headers);
  
  // Add Content-Length if body exists and not present
  if (body && !('content-length' in normalizedHeaders)) {
    normalizedHeaders['content-length'] = getByteSize(body).toString();
  }
  
  result += formatHeaders(normalizedHeaders);
  result += '\r\n';
  
  if (body) {
    result += body;
  }
  
  return result;
};

/**
 * Get default status text for status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Default status text
 */
const getDefaultStatusText = (statusCode) => {
  const statusTexts = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  
  return statusTexts[statusCode] || 'Unknown';
};
