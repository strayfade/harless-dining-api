/** Parsing: Sodexo raw JSON -> typed DailyMenu. Pure functions (no network). */
import { HarlessParseError } from './errors.js';
import type {
  DailyMenu,
  DietFlag,
  Meal,
  MealName,
  MenuItem,
  NutritionInfo,
  RawApiDaypart,
  RawApiGroup,
  RawApiItem,
  Station,
} from './types.js';

export const LOCATION_NAME = 'Harless Dining Hall';

/** Sodexo allergen codes -> normalized lowercase names. Unknown codes pass through lowercased. */
const ALLERGEN_MAP: Record<string, string> = {
  EGGS: 'egg',
  EGG: 'egg',
  FISH: 'fish',
  GLUTEN: 'gluten',
  MILK: 'milk',
  MUSTARD: 'mustard',
  PEANUT: 'peanut',
  PEANUTS: 'peanut',
  SESAME: 'sesame',
  SHELLFISH: 'shellfish',
  SO: 'soy',
  SOY: 'soy',
  SOYBEAN: 'soy',
  SULPHITE: 'sulphite',
  SULPHITES: 'sulphite',
  TREENUTS: 'treenut',
  TREENUT: 'treenut',
  WHEAT: 'wheat',
};

function normalizeAllergens(item: RawApiItem): string[] {
  const out: string[] = [];
  for (const a of item.allergens ?? []) {
    if (String(a.contains).toLowerCase() !== 'true') continue;
    // Sodexo codes vary ("TREENUTS" vs "TREE_NUTS") — compare letters only.
    const code = String(a.allergen ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!code) continue;
    out.push(ALLERGEN_MAP[code] ?? code.toLowerCase());
  }
  return [...new Set(out)];
}

function dietOf(item: RawApiItem): DietFlag[] {
  const diet: DietFlag[] = [];
  if (item.isVegetarian) diet.push('vegetarian');
  if (item.isVegan) diet.push('vegan');
  if (item.isMindful) diet.push('mindful');
  if (item.isPlantBased) diet.push('plantBased');
  return diet;
}

export function parseCalories(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseItem(raw: RawApiItem, stationName: string): MenuItem | null {
  const name = String(raw.formalName ?? '').trim();
  if (!name) return null;
  const nutrition: NutritionInfo = {};
  const fields: Array<[keyof NutritionInfo, unknown]> = [
    ['caloriesFromFat', raw.caloriesFromFat],
    ['fat', raw.fat],
    ['saturatedFat', raw.saturatedFat],
    ['transFat', raw.transFat],
    ['cholesterol', raw.cholesterol],
    ['sodium', raw.sodium],
    ['carbohydrates', raw.carbohydrates],
    ['dietaryFiber', raw.dietaryFiber],
    ['sugar', raw.sugar],
    ['addedSugar', raw.addedSugar],
    ['protein', raw.protein],
    ['potassium', raw.potassium],
    ['iron', raw.iron],
    ['calcium', raw.calcium],
    ['vitaminA', raw.vitaminA],
    ['vitaminC', raw.vitaminC],
    ['vitaminD', raw.vitaminD],
  ];
  for (const [k, v] of fields) {
    if (typeof v === 'string' && v.trim() !== '') nutrition[k] = v;
  }
  const portion = String(raw.portion || raw.portionSize || '').trim();
  if (portion) nutrition.portion = portion;
  return {
    name,
    description: String(raw.description ?? '').trim(),
    calories: parseCalories(raw.calories),
    nutrition,
    allergens: normalizeAllergens(raw),
    diet: dietOf(raw),
    isVegan: raw.isVegan === true,
    isVegetarian: raw.isVegetarian === true,
    isMindful: raw.isMindful === true,
    isPlantBased: raw.isPlantBased === true,
    ingredients: String(raw.ingredients ?? '').trim(),
    station: stationName,
  };
}

function parseGroup(raw: RawApiGroup): Station {
  const name = String(raw?.name ?? '').trim() || 'General';
  const items: MenuItem[] = [];
  for (const it of raw?.items ?? []) {
    const parsed = parseItem(it, name);
    if (parsed) items.push(parsed);
  }
  return { name, items };
}

/** Map a Sodexo daypart name to a MealName. Returns null for unknown dayparts. */
export function mapDaypart(name: string): MealName | null {
  switch (name.trim().toLowerCase()) {
    case 'breakfast':
      return 'breakfast';
    case 'lunch':
    case 'brunch': // weekends: brunch fills the lunch slot
      return 'lunch';
    case 'dinner':
      return 'dinner';
    default:
      return null;
  }
}

function parseDaypart(raw: RawApiDaypart): { meal: Meal; key: MealName } | null {
  const servedAs = String(raw?.name ?? '').trim();
  const key = mapDaypart(servedAs);
  if (!key) return null;
  const stations: Station[] = (raw.groups ?? []).map(parseGroup);
  const items = stations.flatMap((s) => s.items);
  const meal: Meal = { name: key, servedAs, stations, items };
  return { meal, key };
}

/** Turn a raw Sodexo response into a DailyMenu. `[]` means "no menu" (closed / too far out). */
export function parseDailyMenu(raw: unknown, dateStr: string): DailyMenu {
  if (!Array.isArray(raw)) {
    throw new HarlessParseError(`Expected an array of dayparts for ${dateStr}`);
  }
  const dayparts = raw as RawApiDaypart[];
  if (dayparts.length === 0) {
    return { date: dateStr, location: LOCATION_NAME, available: false, meals: { breakfast: null, lunch: null, dinner: null } };
  }
  const meals: DailyMenu['meals'] = { breakfast: null, lunch: null, dinner: null };
  const dropped: string[] = [];
  for (const dp of dayparts) {
    if (dp === null || typeof dp !== 'object') {
      throw new HarlessParseError(`Malformed daypart entry for ${dateStr}`);
    }
    const parsed = parseDaypart(dp);
    if (!parsed) {
      dropped.push(String((dp as RawApiDaypart).name ?? '?'));
      continue;
    }
    // Last daypart wins on duplicates; Sodexo returns one per name.
    meals[parsed.key] = parsed.meal;
  }
  const notes: string[] = [];
  if (meals.lunch?.servedAs.toLowerCase() === 'brunch') {
    notes.push('Weekend brunch is served in place of breakfast/lunch hours and reported as lunch.');
  }
  if (dropped.length > 0) notes.push(`Ignored unrecognized daypart(s): ${dropped.join(', ')}.`);
  const menu: DailyMenu = {
    date: dateStr,
    location: LOCATION_NAME,
    available: true,
    meals,
  };
  if (notes.length > 0) menu.note = notes.join(' ');
  return menu;
}
