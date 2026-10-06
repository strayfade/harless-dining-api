import { describe, expect, it } from 'vitest';

// Live integration: only runs with HARLESS_LIVE=1 (never in CI by default).
// Hits the real Sodexo endpoint for one known date.
const LIVE = process.env['HARLESS_LIVE'] === '1';

describe.skipIf(!LIVE)('live Sodexo API', () => {
  it('fetches a real weekday menu', async () => {
    const { getMenu } = await import('../src/index.js');
    const menu = await getMenu('2026-10-06', { cache: false });
    expect(menu.available).toBe(true);
    expect(menu.meals.breakfast).not.toBeNull();
    expect(menu.meals.lunch).not.toBeNull();
    expect(menu.meals.dinner).not.toBeNull();
  }, 30000);

  it('returns unavailable for a far-future date', async () => {
    const { getMenu } = await import('../src/index.js');
    const menu = await getMenu('2027-01-01', { cache: false });
    expect(menu.available).toBe(false);
  }, 30000);
});
