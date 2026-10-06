/**
 * harless-dining-api — unofficial menu client for Marshall University's
 * Harless Dining Hall.
 *
 * Data comes from the same public Sodexo JSON endpoint the dining website
 * itself uses (no API key signup needed):
 *   https://marshall.sodexomyway.com/en-us/locations/harless-dining-hall
 */
import { cacheGet, cacheKey, cacheSet, clearCache, resolveTtl } from './cache.js';
import { fetchDayRaw } from './client.js';
import { addDays, toDateString, weekOf } from './dates.js';
import { HarlessValidationError } from './errors.js';
import { parseDailyMenu } from './parse.js';
import type { DailyMenu, Meal, MealName, MenuOptions } from './types.js';

export type { DailyMenu, DietFlag, Meal, MealName, MenuItem, MenuOptions, NutritionInfo, ServedAs, Station } from './types.js';
export { HarlessError, HarlessNetworkError, HarlessParseError, HarlessValidationError } from './errors.js';
export { clearCache } from './cache.js';
export { TIME_ZONE } from './dates.js';

const MEALS: MealName[] = ['breakfast', 'lunch', 'dinner'];

export function normalizeMealName(meal: string): MealName {
  const m = meal.trim().toLowerCase();
  if (m === 'breakfast' || m === 'lunch' || m === 'brunch' || m === 'dinner') {
    return m === 'brunch' ? 'lunch' : (m as MealName);
  }
  throw new HarlessValidationError(
    `Invalid meal "${meal}". Use "breakfast", "lunch", or "dinner".`,
  );
}

function keyFor(dateStr: string, opts?: MenuOptions): string {
  return cacheKey({
    date: dateStr,
    base: opts?.baseUrl ?? '',
    loc: opts?.locationId ?? '',
    menu: opts?.menuId ?? '',
  });
}

/**
 * Get the full menu (breakfast / lunch / dinner) for a date.
 * @param date "YYYY-MM-DD", "today", "tomorrow", a Date, or omitted (= today, America/New_York).
 */
export async function getMenu(date?: Date | string, opts?: MenuOptions): Promise<DailyMenu> {
  const dateStr = toDateString(date);
  const ttl = resolveTtl(opts?.cache);
  const key = keyFor(dateStr, opts);
  if (ttl !== null) {
    const hit = cacheGet(key);
    if (hit) return hit;
  }
  const raw = await fetchDayRaw(dateStr, opts);
  const menu = parseDailyMenu(raw, dateStr);
  if (ttl !== null) cacheSet(key, menu, ttl);
  return menu;
}

/**
 * Get a single meal for a date. Returns null when that meal isn't served
 * (e.g. breakfast on a brunch weekend, or no menu at all that day).
 */
export async function getMeal(
  date: Date | string | undefined,
  meal: string,
  opts?: MenuOptions,
): Promise<Meal | null> {
  const name = normalizeMealName(meal);
  const menu = await getMenu(date, opts);
  return menu.meals[name];
}

/** Get today's menu (America/New_York). */
export async function getToday(opts?: MenuOptions): Promise<DailyMenu> {
  return getMenu(undefined, opts);
}

/**
 * Get 7 daily menus for the Monday–Sunday week containing `date`
 * (defaults to the current week). Days with no menu come back with
 * `available: false` instead of failing the batch.
 */
export async function getWeek(date?: Date | string, opts?: MenuOptions): Promise<DailyMenu[]> {
  const start = weekOf(toDateString(date));
  return Promise.all(start.map((d) => getMenu(d, opts)));
}

/** List the valid meal names. */
export function mealNames(): MealName[] {
  return [...MEALS];
}

/** Convenience: tomorrow's date string ("YYYY-MM-DD", America/New_York). */
export function tomorrow(): string {
  return addDays(toDateString(undefined), 1);
}
