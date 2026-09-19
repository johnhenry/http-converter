/**
 * Parse and format a request/response body based on content type.
 *
 * @param {string} body - Raw body text
 * @param {string} [contentType=""] - Content-Type header value
 * @returns {{ type: string, formatted: string, raw: string }}
 */
export const parseBody = (body, contentType = "") => {
  if (!body) return { type: "empty", formatted: "", raw: "" };

  const ct = contentType.toLowerCase();

  // JSON
  if (ct.includes("json") || looksLikeJSON(body)) {
    try {
      const parsed = JSON.parse(body);
      return {
        type: "json",
        formatted: JSON.stringify(parsed, null, 2),
        raw: body,
      };
    } catch {
      // fall through
    }
  }

  // XML / HTML
  if (ct.includes("xml") || ct.includes("html") || looksLikeXML(body)) {
    return {
      type: "xml",
      formatted: indentXML(body),
      raw: body,
    };
  }

  // URL-encoded form data
  if (ct.includes("x-www-form-urlencoded") || looksLikeForm(body)) {
    try {
      const params = new URLSearchParams(body);
      const pairs = [...params.entries()];
      if (pairs.length > 0) {
        const formatted = pairs
          .map(([k, v]) => `${k} = ${v}`)
          .join("\n");
        return { type: "form", formatted, raw: body };
      }
    } catch {
      // fall through
    }
  }

  // Plain text fallback
  return { type: "text", formatted: body, raw: body };
};

const looksLikeJSON = (s) => {
  const t = s.trimStart();
  return t.startsWith("{") || t.startsWith("[");
};

const looksLikeXML = (s) => {
  const t = s.trimStart();
  return t.startsWith("<");
};

const looksLikeForm = (s) => /^[\w%+.-]+=/.test(s) && !s.includes("\n");

/**
 * Simple regex-based XML indentation.
 */
const indentXML = (xml) => {
  let result = "";
  let indent = 0;
  const tokens = xml.replace(/(>)\s*(<)/g, "$1\n$2").split("\n");

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    // Closing tag
    if (trimmed.startsWith("</")) {
      indent = Math.max(0, indent - 1);
    }

    result += "  ".repeat(indent) + trimmed + "\n";

    // Opening tag (not self-closing, not closing)
    if (
      trimmed.startsWith("<") &&
      !trimmed.startsWith("</") &&
      !trimmed.startsWith("<?") &&
      !trimmed.startsWith("<!") &&
      !trimmed.endsWith("/>") &&
      !trimmed.includes("</")
    ) {
      indent++;
    }
  }

  return result.trimEnd();
};
