/** Tiny TTL cache (politeness: don't hammer Sodexo when hundreds of people use this). */
import type { DailyMenu } from './types.js';

export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 50;

interface Entry {
  value: DailyMenu;
  expires: number;
}

const store = new Map<string, Entry>();

export function cacheKey(parts: Record<string, string>): string {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k]}`)
    .join('&');
}

/** Resolve cache TTL: false disables, a number overrides, anything else uses the default. */
export function resolveTtl(cache: boolean | number | undefined): number | null {
  if (cache === false) return null;
  if (typeof cache === 'number' && Number.isFinite(cache) && cache > 0) return cache;
  return DEFAULT_CACHE_TTL_MS;
}

export function cacheGet(key: string): DailyMenu | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.value;
}

export function cacheSet(key: string, value: DailyMenu, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

/** Clear the in-memory menu cache (mostly useful in tests). */
export function clearCache(): void {
  store.clear();
}
