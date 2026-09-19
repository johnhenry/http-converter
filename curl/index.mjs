// cURL command conversion
import { normalizeHeaders } from '../core/utils.mjs';

/**
 * Convert HTTP request to cURL command
 * @param {Object|Request} request - HTTP request object or native Request
 * @param {Object} options - Conversion options
 * @returns {Promise<string>} cURL command
 * @example
 * await fromRequest({ method: 'POST', url: 'https://api.com', headers: {}, body: '{}' })
 * // Returns: curl -X POST 'https://api.com' -H 'content-type: application/json' -d '{}'
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
    pretty = false,
    compressed = true,
    verbose = false,
    followRedirects = false,
    insecure = false,
    maxTime = null,
    proxy = null
  } = options;

  const parts = ['curl'];
  const { method = 'GET', url, headers = {}, body } = request;
  
  // Verbose flag
  if (verbose) {
    parts.push('-v');
  }
  
  // Method (skip for GET)
  if (method !== 'GET') {
    parts.push('-X ' + method);
  }

  // URL - ensure it's quoted
  parts.push(quoteArg(url));

  // Headers
  const normalizedHeaders = normalizeHeaders(headers);
  for (const [name, value] of Object.entries(normalizedHeaders)) {
    if (Array.isArray(value)) {
      value.forEach(v => parts.push('-H ' + quoteArg(`${name}: ${v}`)));
    } else {
      parts.push('-H ' + quoteArg(`${name}: ${value}`));
    }
  }

  // Body handling
  if (body) {
    const contentType = normalizedHeaders['content-type'] || '';

    if (contentType.includes('application/json')) {
      parts.push('--data-raw ' + quoteArg(body));
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      parts.push('--data ' + quoteArg(body));
    } else if (contentType.includes('multipart/form-data')) {
      parts.push('--data-binary ' + quoteArg(body));
    } else {
      parts.push('--data ' + quoteArg(body));
    }
  }

  // Additional options
  if (compressed && !normalizedHeaders['accept-encoding']) {
    parts.push('--compressed');
  }

  if (followRedirects) {
    parts.push('-L');
  }

  if (insecure) {
    parts.push('-k');
  }

  if (maxTime) {
    parts.push('--max-time ' + String(maxTime));
  }

  if (proxy) {
    parts.push('--proxy ' + quoteArg(proxy));
  }
  
  // Format output
  if (pretty) {
    return parts.join(' \\\n  ');
  }
  
  return parts.join(' ');
};

/**
 * Parse cURL command to HTTP request
 * @param {string} curlCommand - cURL command string
 * @returns {Object} HTTP request object
 * @throws {Error} If the input isn't a recognizable cURL command, a flag is
 *   missing its required value, or a quoted argument is unterminated.
 * @example
 * toRequest("curl -X POST 'https://api.com' -H 'Content-Type: application/json' -d '{}'")
 * // Returns: { method: 'POST', url: 'https://api.com', headers: {...}, body: '{}' }
 */
export const toRequest = (curlCommand) => {
  if (typeof curlCommand !== 'string' || !/^\s*curl\b/i.test(curlCommand)) {
    throw new Error('Invalid cURL command: input must start with "curl"');
  }

  const args = parseCurlCommand(curlCommand);
  const request = {
    method: 'GET',
    url: '',
    httpVersion: '1.1',
    headers: {},
    body: null
  };

  // Requires the value that follows a flag, throwing a clear error instead
  // of silently producing `undefined` or crashing deeper in the call stack.
  const requireValue = (i, flag) => {
    const value = args[i];
    if (value === undefined) {
      throw new Error(`Invalid cURL command: ${flag} is missing its required value`);
    }
    return value;
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-X':
      case '--request':
        request.method = requireValue(++i, arg);
        break;

      case '-H':
      case '--header': {
        const header = requireValue(++i, arg);
        const colonIndex = header.indexOf(':');
        if (colonIndex > -1) {
          const name = header.substring(0, colonIndex).trim();
          const value = header.substring(colonIndex + 1).trim();
          const key = name.toLowerCase();

          if (request.headers[key]) {
            request.headers[key] = Array.isArray(request.headers[key])
              ? [...request.headers[key], value]
              : [request.headers[key], value];
          } else {
            request.headers[key] = value;
          }
        }
        break;
      }

      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
        request.body = requireValue(++i, arg);
        // Set method to POST if not explicitly set and using data
        if (request.method === 'GET') {
          request.method = 'POST';
        }
        break;

      case '--data-urlencode': {
        const data = requireValue(++i, arg);
        // Handle name=value format
        const eqIndex = data.indexOf('=');
        if (eqIndex > -1) {
          const name = data.substring(0, eqIndex);
          const value = data.substring(eqIndex + 1);
          const encoded = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
          request.body = request.body ? `${request.body}&${encoded}` : encoded;
        } else {
          request.body = encodeURIComponent(data);
        }
        if (request.method === 'GET') {
          request.method = 'POST';
        }
        break;
      }

      case '-F':
      case '--form':
        // Form field - would need multipart handling
        // For now, just note it in headers
        requireValue(++i, arg); // Validate presence; value itself isn't used yet
        request.headers['content-type'] = 'multipart/form-data';
        if (request.method === 'GET') {
          request.method = 'POST';
        }
        break;

      case '-u':
      case '--user': {
        // Basic auth
        const auth = requireValue(++i, arg);
        const authHeader = 'Basic ' + btoa(auth);
        request.headers.authorization = authHeader;
        break;
      }

      case '-A':
      case '--user-agent':
        request.headers['user-agent'] = requireValue(++i, arg);
        break;

      case '-e':
      case '--referer':
        request.headers.referer = requireValue(++i, arg);
        break;

      case '-b':
      case '--cookie':
        request.headers.cookie = requireValue(++i, arg);
        break;

      case '-L':
      case '--location':
      case '-v':
      case '--verbose':
      case '-s':
      case '--silent':
      case '-k':
      case '--insecure':
      case '--compressed':
        // These are flags, no value to consume
        break;

      case '--max-time':
      case '--connect-timeout':
      case '-m':
        requireValue(++i, arg); // Skip the timeout value (validated, unused)
        break;

      default:
        // If it doesn't start with -, it's likely the URL
        if (!arg.startsWith('-') && !request.url) {
          request.url = arg;
        }
        break;
    }

    i++;
  }

  if (!request.url) {
    throw new Error('Invalid cURL command: no URL found');
  }

  // Ensure URL has protocol
  if (!request.url.match(/^https?:\/\//)) {
    request.url = 'https://' + request.url;
  }

  return request;
};

/**
 * Parse cURL command into arguments, following POSIX-shell-like quoting
 * rules: single quotes are fully literal, double quotes allow \\, \", \$
 * and \` escapes, and a backslash outside quotes escapes the next
 * character. Adjacent quoted/unquoted runs (e.g. `-H"foo"` or the common
 * `'it'\''s'` escaped-apostrophe pattern) are concatenated into one
 * argument, matching real shell word-splitting.
 * @param {string} command - cURL command string
 * @returns {Array<string>} Parsed arguments (with the leading `curl` removed)
 * @throws {Error} If a quoted string is never closed
 */
const parseCurlCommand = (command) => {
  const args = [];
  let current = '';
  let hasCurrent = false;
  let i = 0;
  const len = command.length;

  while (i < len) {
    const ch = command[i];

    if (/\s/.test(ch)) {
      if (hasCurrent) {
        args.push(current);
        current = '';
        hasCurrent = false;
      }
      i++;
      continue;
    }

    if (ch === "'") {
      hasCurrent = true;
      const start = i;
      i++;
      while (i < len && command[i] !== "'") {
        current += command[i];
        i++;
      }
      if (i >= len) {
        throw new Error(`Invalid cURL command: unterminated single-quoted string starting at index ${start}`);
      }
      i++; // consume closing quote
      continue;
    }

    if (ch === '"') {
      hasCurrent = true;
      const start = i;
      i++;
      let closed = false;
      while (i < len) {
        if (command[i] === '"') {
          closed = true;
          i++;
          break;
        }
        if (command[i] === '\\' && i + 1 < len && '"\\$`'.includes(command[i + 1])) {
          current += command[i + 1];
          i += 2;
        } else {
          current += command[i];
          i++;
        }
      }
      if (!closed) {
        throw new Error(`Invalid cURL command: unterminated double-quoted string starting at index ${start}`);
      }
      continue;
    }

    if (ch === '\\' && i + 1 < len) {
      current += command[i + 1];
      hasCurrent = true;
      i += 2;
      continue;
    }

    current += ch;
    hasCurrent = true;
    i++;
  }

  if (hasCurrent) {
    args.push(current);
  }

  // Skip 'curl' command itself
  if (args[0] === 'curl') {
    args.shift();
  }

  return args;
};

/**
 * Quote argument for shell if needed
 * @param {string} arg - Argument to quote
 * @returns {string} Quoted argument
 */
const quoteArg = (arg) => {
  // If arg contains spaces, quotes, or special chars, quote it
  if (/[\s"'`$\\!*?#&;<>()[\]{}|~]/.test(arg)) {
    // Escape single quotes and wrap in single quotes
    return "'" + arg.replace(/'/g, "'\\''") + "'";
  }
  return arg;
};

/**
 * Convert cURL command to fetch() call code
 * @param {string} curlCommand - cURL command
 * @returns {string} JavaScript fetch() code
 * @example
 * toFetchCode("curl -X POST 'https://api.com' -d '{}'")
 * // Returns: fetch('https://api.com', { method: 'POST', body: '{}' })
 */
export const toFetchCode = (curlCommand) => {
  const request = toRequest(curlCommand);
  const { url, method, headers, body } = request;
  
  const options = {};
  
  if (method !== 'GET') {
    options.method = method;
  }
  
  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }
  
  if (body) {
    options.body = body;
  }
  
  const optionsStr = Object.keys(options).length > 0
    ? ',\n  ' + JSON.stringify(options, null, 2).replace(/\n/g, '\n  ')
    : '';

  return `fetch(${JSON.stringify(url)}${optionsStr})`;
};
