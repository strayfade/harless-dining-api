import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { areTheyHavingChickenSandwichesAtHarless, clearCache, getMeal, getMenu, getWeek, normalizeMealName } from '../src/index.js';
import { HarlessValidationError } from '../src/errors.js';

const dir = dirname(fileURLToPath(import.meta.url));
const weekday = JSON.parse(readFileSync(join(dir, 'fixtures/weekday.json'), 'utf8'));
const weekend = JSON.parse(readFileSync(join(dir, 'fixtures/weekend.json'), 'utf8'));

function stubFetch(payload: unknown, counter?: { calls: number }): typeof fetch {
  return (async () => {
    if (counter) counter.calls += 1;
    return { ok: true, status: 200, json: async () => payload } as Response;
  }) as typeof fetch;
}

beforeEach(() => clearCache());

describe('normalizeMealName', () => {
  it('accepts breakfast/lunch/dinner + brunch alias', () => {
    expect(normalizeMealName('Breakfast')).toBe('breakfast');
    expect(normalizeMealName('LUNCH')).toBe('lunch');
    expect(normalizeMealName('brunch')).toBe('lunch');
    expect(normalizeMealName('dinner')).toBe('dinner');
    expect(() => normalizeMealName('snack')).toThrow(HarlessValidationError);
  });
});

describe('getMenu with stubbed fetch', () => {
  it('returns typed menu and caches by default', async () => {
    const counter = { calls: 0 };
    const opts = { fetchImpl: stubFetch(weekday, counter) };
    const first = await getMenu('2026-10-06', opts);
    expect(first.meals.dinner?.items.length).toBeGreaterThan(0);
    const second = await getMenu('2026-10-06', opts);
    expect(second).toBe(first); // same cached object
    expect(counter.calls).toBe(1);
  });

  it('skips cache with cache:false', async () => {
    const counter = { calls: 0 };
    const opts = { fetchImpl: stubFetch(weekday, counter), cache: false as const };
    await getMenu('2026-10-06', opts);
    await getMenu('2026-10-06', opts);
    expect(counter.calls).toBe(2);
  });

  it('dedups concurrent requests for the same day', async () => {
    const counter = { calls: 0 };
    const opts = { fetchImpl: stubFetch(weekday, counter) };
    const [a, b] = await Promise.all([getMenu('2026-10-06', opts), getMenu('2026-10-06', opts)]);
    expect(a).toStrictEqual(b); // one HTTP request (fetch dedup), parsed per caller
    expect(counter.calls).toBe(1);
  });

  it('propagates network failures as HarlessNetworkError', async () => {
    const failing = (() => Promise.reject(new Error('boom'))) as typeof fetch;
    await expect(getMenu('2026-10-06', { fetchImpl: failing, cache: false })).rejects.toThrow(
      /Sodexo request failed/,
    );
  });

  it('rejects invalid dates before fetching', async () => {
    const fetchImpl = vi.fn();
    await expect(getMenu('yesterday-ish', { fetchImpl: fetchImpl as typeof fetch })).rejects.toThrow(
      HarlessValidationError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('areTheyHavingChickenSandwichesAtHarless with stubbed fetch', () => {
  it('returns true when a chicken sandwich is served (weekend fixture)', async () => {
    const ok = await areTheyHavingChickenSandwichesAtHarless({ fetchImpl: stubFetch(weekend) });
    expect(ok).toBe(true);
  });

  it('returns false when only tenders/nuggets/etc. are served (weekday fixture)', async () => {
    const ok = await areTheyHavingChickenSandwichesAtHarless({ fetchImpl: stubFetch(weekday) });
    expect(ok).toBe(false);
  });

  it('returns false when there is no menu at all', async () => {
    const ok = await areTheyHavingChickenSandwichesAtHarless({ fetchImpl: stubFetch([]) });
    expect(ok).toBe(false);
  });
});

describe('getMeal + getWeek with stubbed fetch', () => {
  it('picks a single meal, null when unserved', async () => {
    const opts = { fetchImpl: stubFetch(weekday) };
    const dinner = await getMeal('2026-10-06', 'dinner', opts);
    expect(dinner?.name).toBe('dinner');
    expect(dinner?.items.length).toBeGreaterThan(0);
    await expect(getMeal('2026-10-06', 'snack', opts)).rejects.toThrow(HarlessValidationError);
  });

  it('fetches a full week without failing on empty days', async () => {
    const impl = (async (url: string | URL | Request) => {
      const date = new URL(String(url)).searchParams.get('date');
      const payload = date === '2026-10-08' ? [] : weekday;
      return { ok: true, status: 200, json: async () => payload } as Response;
    }) as typeof fetch;
    const week = await getWeek('2026-10-06', { fetchImpl: impl });
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.date)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(week.find((d) => d.date === '2026-10-08')?.available).toBe(false);
  });
});
