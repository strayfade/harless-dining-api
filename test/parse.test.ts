import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isChickenSandwich, mapDaypart, parseCalories, parseDailyMenu } from '../src/parse.js';

const dir = dirname(fileURLToPath(import.meta.url));
const weekday = JSON.parse(readFileSync(join(dir, 'fixtures/weekday.json'), 'utf8'));
const weekend = JSON.parse(readFileSync(join(dir, 'fixtures/weekend.json'), 'utf8'));

describe('parseDailyMenu — weekday (Tue 2026-10-06)', () => {
  it('maps Breakfast/Lunch/Dinner with stations', () => {
    const menu = parseDailyMenu(weekday, '2026-10-06');
    expect(menu.date).toBe('2026-10-06');
    expect(menu.available).toBe(true);
    expect(menu.meals.breakfast?.servedAs).toBe('Breakfast');
    expect(menu.meals.lunch?.servedAs).toBe('Lunch');
    expect(menu.meals.dinner?.servedAs).toBe('Dinner');
    expect(menu.meals.breakfast?.stations.map((s) => s.name)).toEqual([
      'Bliss',
      'Sizzle / Savory',
      'Spoonful',
    ]);
    expect(menu.meals.lunch?.stations).toHaveLength(11);
    expect(menu.meals.dinner?.stations).toHaveLength(11);
  });

  it('parses a full item with nutrition + allergens + diet', () => {
    const menu = parseDailyMenu(weekday, '2026-10-06');
    const eggs = menu.meals.breakfast?.items.find((i) => i.name === 'Scrambled Eggs');
    expect(eggs).toBeDefined();
    expect(eggs?.calories).toBe(189);
    expect(eggs?.allergens).toEqual(['egg']);
    expect(eggs?.diet).toContain('vegetarian');
    expect(eggs?.station).toBe('Sizzle / Savory');
    expect(eggs?.nutrition.protein).toBe('15g');
  });

  it('marks vegan items and empty-allergen items', () => {
    const menu = parseDailyMenu(weekday, '2026-10-06');
    const potatoes = menu.meals.breakfast?.items.find((i) => i.name === 'Hash Browned Potatoes');
    expect(potatoes?.isVegan).toBe(true);
    expect(potatoes?.diet).toContain('vegan');
    const sausage = menu.meals.breakfast?.items.find((i) => i.name === 'Pork Sausage Links');
    expect(sausage?.allergens).toEqual([]);
    expect(sausage?.isVegetarian).toBe(false);
  });

  it('normalizes TREE_NUTS (underscored code) to treenut', () => {
    const menu = parseDailyMenu(weekday, '2026-10-06');
    const cookie = menu.meals.lunch?.items.find(
      (i) => i.name === 'Two White Chocolate Macadamia Cookies',
    );
    expect(cookie?.allergens).toContain('treenut');
  });

  it('flattens items across stations', () => {
    const menu = parseDailyMenu(weekday, '2026-10-06');
    const lunch = menu.meals.lunch;
    const flat = lunch?.stations.reduce((n, s) => n + s.items.length, 0);
    expect(lunch?.items.length).toBe(flat);
    expect(flat).toBeGreaterThan(0);
  });
});

describe('parseDailyMenu — weekend (Sat 2026-10-10, brunch)', () => {
  it('reports brunch as lunch with servedAs preserved', () => {
    const menu = parseDailyMenu(weekend, '2026-10-10');
    expect(menu.available).toBe(true);
    expect(menu.meals.breakfast).toBeNull();
    expect(menu.meals.lunch?.servedAs).toBe('Brunch');
    expect(menu.meals.lunch?.name).toBe('lunch');
    expect(menu.meals.dinner?.servedAs).toBe('Dinner');
    expect(menu.note).toMatch(/brunch/i);
  });
});

describe('parseDailyMenu — empty / malformed', () => {
  it('returns unavailable menu for []', () => {
    const menu = parseDailyMenu([], '2027-01-01');
    expect(menu.available).toBe(false);
    expect(menu.meals).toEqual({ breakfast: null, lunch: null, dinner: null });
  });

  it('throws HarlessParseError on non-array payload', () => {
    expect(() => parseDailyMenu({ foo: 1 }, '2026-10-06')).toThrow(/PARSE|Expected an array/);
  });

  it('ignores unknown dayparts with a note', () => {
    const menu = parseDailyMenu([{ name: 'Late Night', groups: [] }], '2026-10-06');
    expect(menu.available).toBe(true);
    expect(menu.note).toMatch(/Late Night/);
  });
});

describe('isChickenSandwich', () => {
  it.each([
    'Grilled Garlic Chicken Sandwich',
    'Crispy Chicken Sandwich',
    "Crispy Chick'n Sandwich",
    'Grilled Chicken Burger',
    'Chicken Patty On Bun',
    'Buffalo Chicken Wrap',
    'Chicken Ciabatta Melt',
  ])('matches %s', (name) => {
    expect(isChickenSandwich(name)).toBe(true);
  });

  it.each([
    'Crispy Baked Chick\'n Tenders',
    'Chicken Nuggets',
    'Chicken Soft Taco',
    'Chicken Char Siu',
    'Old Fashioned Chicken Noodle Soup',
    'Chicken & Cheese Quesadilla',
    'Cheeseburger On Bun',
    'Hash Browned Potatoes',
  ])('rejects %s', (name) => {
    expect(isChickenSandwich(name)).toBe(false);
  });
});

describe('mapDaypart + parseCalories', () => {
  it('maps known dayparts case-insensitively', () => {
    expect(mapDaypart('Breakfast')).toBe('breakfast');
    expect(mapDaypart('lunch')).toBe('lunch');
    expect(mapDaypart('Brunch')).toBe('lunch');
    expect(mapDaypart('DINNER')).toBe('dinner');
    expect(mapDaypart('Late Night')).toBeNull();
  });

  it('parses calorie strings', () => {
    expect(parseCalories('113')).toBe(113);
    expect(parseCalories('')).toBeNull();
    expect(parseCalories(undefined)).toBeNull();
    expect(parseCalories('n/a')).toBeNull();
  });
});
