/**
 * Sodexo endpoint builders.
 *
 * Discovered 2026-10-06 via browser DevTools on
 * marshall.sodexomyway.com/en-us/locations/harless-dining-hall:
 * the site's own JS calls
 *   GET https://api-prd.sodexomyway.net/v0.2/data/menu/45995003/151460?date=YYYY-MM-DD
 * with a public `api-key` header (visible to every site visitor).
 */
import type { MenuOptions } from './types.js';

export const DEFAULT_API_BASE = 'https://api-prd.sodexomyway.net';
/** Public site key — same one the dining website sends. Override via options or HARLESS_API_KEY. */
export const DEFAULT_API_KEY = '68717828-b754-420d-9488-4c37cb7d7ef7';
export const DEFAULT_LOCATION_ID = '45995003';
export const DEFAULT_MENU_ID = '151460';
export const DEFAULT_USER_AGENT =
  'harless-dining-api/0.1.0 (+https://github.com/strayfade/harless-dining-api)';

export function resolveApiKey(opts?: MenuOptions): string {
  if (opts?.apiKey) return opts.apiKey;
  const env = typeof process !== 'undefined' ? process.env['HARLESS_API_KEY'] : undefined;
  if (env) return env;
  return DEFAULT_API_KEY;
}

export function buildMenuUrl(dateStr: string, opts?: MenuOptions): string {
  const base = (opts?.baseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, '');
  const locationId = opts?.locationId ?? DEFAULT_LOCATION_ID;
  const menuId = opts?.menuId ?? DEFAULT_MENU_ID;
  return `${base}/v0.2/data/menu/${encodeURIComponent(locationId)}/${encodeURIComponent(menuId)}?date=${encodeURIComponent(dateStr)}`;
}

export function buildHeaders(opts?: MenuOptions): Record<string, string> {
  return {
    Accept: 'application/json',
    'api-key': resolveApiKey(opts),
    authorization: 'Bearer',
    Origin: 'https://marshall.sodexomyway.com',
    Referer: 'https://marshall.sodexomyway.com/',
    'User-Agent': opts?.userAgent ?? DEFAULT_USER_AGENT,
  };
}
