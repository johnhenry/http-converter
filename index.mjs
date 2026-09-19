// Main entry point - re-export all modules
export * as string from './string/index.mjs';
export * as har from './har/index.mjs';
export * as curl from './curl/index.mjs';
export * as fetch from './fetch/index.mjs';
export * as body from './body/index.mjs';
export * as random from './random/index.mjs';

// Re-export core utilities for convenience
export { detectType, normalizeHeaders, parseQueryString, buildUrl, getByteSize, formatHeaders } from './core/utils.mjs';

// Internal imports for allFormats (avoid name conflicts with JS keywords)
import * as stringMod from './string/index.mjs';
import * as curlMod from './curl/index.mjs';
import * as fetchMod from './fetch/index.mjs';
import * as harMod from './har/index.mjs';

/**
 * Convert a request to all supported formats at once.
 * @param {Request|Object} request - Native Request or plain request object
 * @param {Object} [options]
 * @param {Object} [options.curl] - Options passed to curl.fromRequest
 * @param {Object} [options.fetch] - Options passed to fetch.toCode
 * @param {Object} [options.har] - Options passed to har.fromRequest
 * @returns {Promise<{httpString: string, curl: string, fetchCode: string, har: Object}>}
 */
export const allFormats = async (request, options = {}) => {
  const { curl: curlOpts = {}, fetch: fetchOpts = {}, har: harOpts = {} } = options;
  const cloneable = request instanceof Request;
  const [httpString, curlCmd, fetchCode, harEntry] = await Promise.all([
    stringMod.stringifyRequest(cloneable ? request.clone() : request),
    curlMod.fromRequest(cloneable ? request.clone() : request, curlOpts),
    fetchMod.toCode(cloneable ? request.clone() : request, fetchOpts),
    harMod.fromRequest(cloneable ? request.clone() : request, harOpts),
  ]);
  return { httpString, curl: curlCmd, fetchCode, har: harEntry };
};
