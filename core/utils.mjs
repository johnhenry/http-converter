// Shared utility functions

/**
 * Detect the type of input data
 * @param {string|Object} input - Input to analyze
 * @returns {'request'|'response'|'curl'|'har'|'unknown'} Detected type
 * @example
 * detectType('GET / HTTP/1.1') // 'request'
 * detectType('HTTP/1.1 200 OK') // 'response'
 * detectType('curl -X GET') // 'curl'
 */
export const detectType = (input) => {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('HTTP/')) return 'response';
    // Match any word (method) followed by space and path
    if (trimmed.match(/^[A-Z]+\s+\//)) return 'request';
    if (trimmed.startsWith('curl')) return 'curl';
  }
  if (typeof input === 'object' && input !== null) {
    // HAR format detection - check for various HAR structures
    if ('startedDateTime' in input && 'request' in input) return 'har'; // HAR entry
    if ('request' in input && 'response' in input && 'timings' in input) return 'har'; // HAR entry
    if ('log' in input && 'entries' in input) return 'har'; // Full HAR file
    if ('method' in input && 'url' in input && 'httpVersion' in input && 'headers' in input) {
      // Could be HAR request or regular request - check headers format
      if (Array.isArray(input.headers)) return 'har'; // HAR uses array format for headers
      return 'request';
    }
    if ('method' in input && 'url' in input) return 'request';
    if ('statusCode' in input || 'status' in input) return 'response';
  }
  return 'unknown';
};

/**
 * Normalize headers from various formats to plain object
 * @param {Object|Array|Headers} headers - Headers in any format
 * @returns {Object} Normalized headers object
 * @example
 * normalizeHeaders([{name: 'Content-Type', value: 'text/html'}])
 * // { 'content-type': 'text/html' }
 */
export const normalizeHeaders = (headers) => {
  if (!headers) return {};
  
  if (Array.isArray(headers)) {
    // HAR format: [{ name, value }]
    return headers.reduce((acc, { name, value }) => {
      const key = name.toLowerCase();
      if (acc[key]) {
        acc[key] = Array.isArray(acc[key]) ? [...acc[key], value] : [acc[key], value];
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
  
  if (headers instanceof Headers) {
    // Fetch API Headers
    const result = {};
    headers.forEach((value, key) => {
      result[key.toLowerCase()] = value;
    });
    return result;
  }
  
  // Plain object - normalize keys to lowercase
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key.toLowerCase()] = value;
  }
  return result;
};

/**
 * Parse query string from URL
 * @param {string} url - URL to parse
 * @returns {Array<{name: string, value: string}>} Query parameters
 */
export const parseQueryString = (url) => {
  try {
    const urlObj = new URL(url, 'http://example.com');
    const params = [];
    urlObj.searchParams.forEach((value, name) => {
      params.push({ name, value });
    });
    return params;
  } catch {
    return [];
  }
};

/**
 * Build URL from base and query parameters
 * @param {string} baseUrl - Base URL
 * @param {Array<{name: string, value: string}>} queryParams - Query parameters
 * @returns {string} Complete URL
 */
export const buildUrl = (baseUrl, queryParams = []) => {
  if (!queryParams.length) return baseUrl;
  
  try {
    const url = new URL(baseUrl, 'http://example.com');
    queryParams.forEach(({ name, value }) => {
      url.searchParams.append(name, value);
    });
    return url.pathname + url.search;
  } catch {
    return baseUrl;
  }
};

/**
 * Calculate byte size of string
 * @param {string} str - String to measure
 * @returns {number} Size in bytes
 */
export const getByteSize = (str) => {
  return new TextEncoder().encode(str || '').length;
};

/**
 * Format headers for display
 * @param {Object} headers - Headers object
 * @returns {string} Formatted headers
 */
export const formatHeaders = (headers) => {
  let result = '';
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach(v => result += `${name}: ${v}\r\n`);
    } else {
      result += `${name}: ${value}\r\n`;
    }
  }
  return result;
};
