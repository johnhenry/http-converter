// Type definitions for the ./body subpath (mirrors body/index.mjs)
import type { ParsedBody } from '../types.d.ts';

export function parseBody(body: string, contentType?: string): ParsedBody;
