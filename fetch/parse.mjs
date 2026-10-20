// Safe parser for fetch(...) source text (no eval, no Function).
// Understands the literal subset browsers emit for "Copy as fetch": strings
// (single, double, plain template), numbers, true/false/null/undefined,
// objects (quoted or bare keys), arrays, trailing commas and comments.
// Anything else (identifiers, calls, template substitutions) is rejected.

class Reader {
  constructor(src) {
    this.s = src;
    this.i = 0;
  }
  fail(msg) {
    throw new Error(`Cannot parse fetch() source: ${msg} at offset ${this.i}`);
  }
  skip() {
    const s = this.s;
    for (;;) {
      while (this.i < s.length && /\s/.test(s[this.i])) this.i++;
      if (s.startsWith('//', this.i)) {
        while (this.i < s.length && s[this.i] !== '\n') this.i++;
      } else if (s.startsWith('/*', this.i)) {
        const end = s.indexOf('*/', this.i + 2);
        if (end < 0) this.fail('unterminated comment');
        this.i = end + 2;
      } else {
        return;
      }
    }
  }
  peek() {
    this.skip();
    return this.s[this.i];
  }
  eat(ch) {
    if (this.peek() !== ch) this.fail(`expected "${ch}"`);
    this.i++;
  }
  word() {
    this.skip();
    const m = /^[A-Za-z_$][\w$]*/.exec(this.s.slice(this.i));
    if (!m) return null;
    this.i += m[0].length;
    return m[0];
  }
  string() {
    const q = this.s[this.i++];
    let out = '';
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i++];
      if (c === q) return out;
      if (q === '`' && c === '$' && s[this.i] === '{') this.fail('template substitutions are not supported');
      if (c !== '\\') {
        if (c === '\n' && q !== '`') this.fail('newline in string');
        out += c;
        continue;
      }
      const e = s[this.i++];
      switch (e) {
        case 'n': out += '\n'; break;
        case 'r': out += '\r'; break;
        case 't': out += '\t'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'v': out += '\v'; break;
        case '0': out += '\0'; break;
        case 'x': {
          const h = s.slice(this.i, this.i + 2);
          if (!/^[0-9a-fA-F]{2}$/.test(h)) this.fail('bad \\x escape');
          out += String.fromCharCode(parseInt(h, 16));
          this.i += 2;
          break;
        }
        case 'u': {
          if (s[this.i] === '{') {
            const end = s.indexOf('}', this.i);
            const h = s.slice(this.i + 1, end);
            if (end < 0 || !/^[0-9a-fA-F]{1,6}$/.test(h)) this.fail('bad \\u escape');
            out += String.fromCodePoint(parseInt(h, 16));
            this.i = end + 1;
          } else {
            const h = s.slice(this.i, this.i + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(h)) this.fail('bad \\u escape');
            out += String.fromCharCode(parseInt(h, 16));
            this.i += 4;
          }
          break;
        }
        case '\r': if (s[this.i] === '\n') this.i++; break; // line continuation
        case '\n': break;
        case undefined: this.fail('unterminated string'); break;
        default: out += e; // \" \' \\ \/ \` and unknown escapes
      }
    }
    return this.fail('unterminated string');
  }
  value() {
    const c = this.peek();
    if (c === '"' || c === "'" || c === '`') return this.string();
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    const num = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i));
    if (num) {
      this.i += num[0].length;
      return Number(num[0]);
    }
    const w = this.word();
    if (w === 'true') return true;
    if (w === 'false') return false;
    if (w === 'null') return null;
    if (w === 'undefined') return undefined;
    return this.fail(w ? `unsupported expression "${w}"` : 'unexpected token');
  }
  object() {
    const obj = {};
    this.eat('{');
    while (this.peek() !== '}') {
      const c = this.peek();
      let key;
      if (c === '"' || c === "'" || c === '`') key = this.string();
      else {
        key = this.word();
        if (key === null) {
          const n = /^\d+/.exec(this.s.slice(this.i));
          if (!n) this.fail('expected property name');
          key = n[0];
          this.i += key.length;
        }
      }
      this.eat(':');
      const v = this.value();
      Object.defineProperty(obj, key, { value: v, enumerable: true, writable: true, configurable: true });
      if (this.peek() === ',') this.i++;
      else if (this.peek() !== '}') this.fail('expected "," or "}"');
    }
    this.eat('}');
    return obj;
  }
  array() {
    const arr = [];
    this.eat('[');
    while (this.peek() !== ']') {
      arr.push(this.value());
      if (this.peek() === ',') this.i++;
      else if (this.peek() !== ']') this.fail('expected "," or "]"');
    }
    this.eat(']');
    return arr;
  }
}

const normHeaders = (h) => {
  const out = {};
  if (!h) return out;
  const pairs = Array.isArray(h) ? h : Object.entries(h);
  for (const p of pairs) {
    const [name, value] = Array.isArray(p) ? p : [p?.name, p?.value];
    if (typeof name !== 'string') continue;
    const key = name.toLowerCase();
    const v = String(value);
    out[key] = key in out ? [].concat(out[key], v) : v;
  }
  return out;
};

/**
 * Parse `fetch(url, init)` source text into a request, without evaluating it.
 * @param {string} source - e.g. devtools "Copy as fetch" output
 * @returns {{method: string, url: string, httpVersion: string, headers: Object, body: string|null}}
 */
export const parseFetchSource = (source) => {
  if (typeof source !== 'string') throw new TypeError('fetch source must be a string');
  const r = new Reader(source);
  r.skip();
  // Optional `const x =` / `await` prefix
  let w = r.word();
  if (w === 'const' || w === 'let' || w === 'var') {
    r.word();
    r.eat('=');
    w = r.word();
  }
  if (w === 'await') w = r.word();
  if (w !== 'fetch') throw new Error('Cannot parse fetch() source: expected a fetch(...) call');
  r.eat('(');
  const url = r.value();
  if (typeof url !== 'string') r.fail('the first argument must be a URL string');
  let init = {};
  if (r.peek() === ',') {
    r.i++;
    if (r.peek() !== ')') {
      init = r.value();
      if (r.peek() === ',') r.i++;
    }
  }
  r.eat(')');
  if (init === null || typeof init !== 'object' || Array.isArray(init)) r.fail('options must be an object');
  const body = init.body;
  return {
    method: typeof init.method === 'string' ? init.method.toUpperCase() : 'GET',
    url,
    httpVersion: '1.1',
    headers: normHeaders(init.headers),
    body: typeof body === 'string' ? body : body == null ? null : (() => r.fail('body must be a string or null'))(),
  };
};
