/** HTTP client: fetch one day's raw dayparts from Sodexo, with retries + dedup. */
import { HarlessNetworkError } from './errors.js';
import { buildHeaders, buildMenuUrl } from './endpoints.js';
import type { MenuOptions, RawApiDaypart } from './types.js';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** In-flight dedup so concurrent getMenu() calls for the same day share one request. */
const inFlight = new Map<string, Promise<RawApiDaypart[]>>();

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function doFetch(url: string, opts?: MenuOptions): Promise<RawApiDaypart[]> {
  const fetchImpl = opts?.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new HarlessNetworkError('No fetch implementation available (Node 18+ required).');
  }
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers: buildHeaders(opts), signal: ctrl.signal });
      if (!res.ok) {
        if (isRetryable(res.status) && attempt < MAX_RETRIES) {
          lastError = new HarlessNetworkError(`Sodexo request failed with ${res.status}.`, res.status);
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw new HarlessNetworkError(
          `Sodexo request failed with status ${res.status} for ${url}.`,
          res.status,
        );
      }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        throw new HarlessNetworkError(`Unexpected Sodexo response for ${url} (not an array).`);
      }
      return data as RawApiDaypart[];
    } catch (err) {
      if (err instanceof HarlessNetworkError) {
        if (attempt < MAX_RETRIES && err.status !== undefined && isRetryable(err.status)) {
          await sleep(300 * (attempt + 1));
          lastError = err;
          continue;
        }
        throw err;
      }
      const aborted =
        err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
      lastError = aborted
        ? new HarlessNetworkError(`Sodexo request timed out after ${timeoutMs}ms.`, undefined, {
            cause: err,
          })
        : new HarlessNetworkError(
            `Sodexo request failed: ${err instanceof Error ? err.message : String(err)}`,
            undefined,
            { cause: err },
          );
      if (attempt < MAX_RETRIES) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof HarlessNetworkError
    ? lastError
    : new HarlessNetworkError('Sodexo request failed.');
}

/** Fetch raw dayparts for a normalized "YYYY-MM-DD" date. */
export function fetchDayRaw(dateStr: string, opts?: MenuOptions): Promise<RawApiDaypart[]> {
  const url = buildMenuUrl(dateStr, opts);
  const key = `${url}|${opts?.apiKey ?? ''}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = doFetch(url, opts).finally(() => {
    if (inFlight.get(key) === p) inFlight.delete(key);
  });
  inFlight.set(key, p);
  return p;
}
