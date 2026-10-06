/** Shared public types for harless-dining-api. */

/** Meals callers can ask for. Weekends serve brunch; it is returned as `lunch` with `servedAs: 'Brunch'`. */
export type MealName = 'breakfast' | 'lunch' | 'dinner';

/** Raw daypart name as served by Sodexo (e.g. "Breakfast", "Brunch", "Lunch", "Dinner"). */
export type ServedAs = string;

/** Diet flags derived from Sodexo's per-item booleans. */
export type DietFlag = 'vegetarian' | 'vegan' | 'mindful' | 'plantBased';

/** Flat nutrition facts. Sodexo returns values as strings with units ("170mg", "2g", ""); they are preserved verbatim. */
export interface NutritionInfo {
  caloriesFromFat?: string;
  fat?: string;
  saturatedFat?: string;
  transFat?: string;
  cholesterol?: string;
  sodium?: string;
  carbohydrates?: string;
  dietaryFiber?: string;
  sugar?: string;
  addedSugar?: string;
  protein?: string;
  potassium?: string;
  iron?: string;
  calcium?: string;
  vitaminA?: string;
  vitaminC?: string;
  vitaminD?: string;
  portion?: string;
}

/** One dish on the menu. */
export interface MenuItem {
  /** Dish name, e.g. "Scrambled Eggs". */
  name: string;
  /** Short description from Sodexo (may be empty). */
  description: string;
  /** Calories parsed to a number, or null when Sodexo reports none. */
  calories: number | null;
  /** Full nutrition panel as reported by Sodexo (raw strings with units). */
  nutrition: NutritionInfo;
  /** Normalized lowercase allergen codes, e.g. ["egg", "milk", "wheat"]. Empty when none. */
  allergens: string[];
  /** Diet flags that apply to this item. */
  diet: DietFlag[];
  isVegan: boolean;
  isVegetarian: boolean;
  isMindful: boolean;
  isPlantBased: boolean;
  /** Ingredient list (may be empty). */
  ingredients: string;
  /** Station this item was served at (denormalized for easy filtering). */
  station: string;
}

/** One serving station within a meal, e.g. "Sizzle / Savory". */
export interface Station {
  name: string;
  items: MenuItem[];
}

/** One meal of the day. */
export interface Meal {
  name: MealName;
  /**
   * What Sodexo actually called this serving. Normally equals `name`
   * ("Breakfast"), except weekends when lunch is served as `"Brunch"`.
   */
  servedAs: ServedAs;
  stations: Station[];
  /** Flat list of every item across stations (convenience). */
  items: MenuItem[];
}

/** Full-day menu. */
export interface DailyMenu {
  /** Normalized date, "YYYY-MM-DD" (America/New_York). */
  date: string;
  location: string;
  /** False when Sodexo has no menu at all for the date (API returned `[]`). All meals are null. */
  available: boolean;
  meals: {
    breakfast: Meal | null;
    lunch: Meal | null;
    dinner: Meal | null;
  };
  /** Human note, e.g. weekend brunch mapping or dropped unknown dayparts. */
  note?: string;
}

/** Options accepted by getMenu / getMeal / getToday / getWeek. */
export interface MenuOptions {
  /**
   * Cache control. `true` (default) uses a 30-minute in-memory cache,
   * a number overrides the TTL in milliseconds, `false` disables caching.
   */
  cache?: boolean | number;
  /** Request timeout in ms (default 10_000). */
  timeoutMs?: number;
  /**
   * Sodexo API key. Defaults to the public site key bundled with the
   * package (the same key the dining website itself sends) or the
   * `HARLESS_API_KEY` env var when set.
   */
  apiKey?: string;
  /** Override the API host (tests, proxies). */
  baseUrl?: string;
  /** Override Sodexo's location/menu ids (they change rarely). */
  locationId?: string;
  menuId?: string;
  /** Custom User-Agent header. */
  userAgent?: string;
  /** Custom fetch implementation (tests, proxies, undici). Must match the global fetch signature. */
  fetchImpl?: typeof fetch;
}

/** Loose shape of one Sodexo API item (only fields we read are typed). */
export interface RawApiItem {
  formalName?: string;
  description?: string;
  calories?: string;
  ingredients?: string;
  allergens?: Array<{ allergen?: string; contains?: string }>;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isMindful?: boolean;
  isPlantBased?: boolean;
  course?: string;
  caloriesFromFat?: string;
  fat?: string;
  saturatedFat?: string;
  transFat?: string;
  cholesterol?: string;
  sodium?: string;
  carbohydrates?: string;
  dietaryFiber?: string;
  sugar?: string;
  addedSugar?: string;
  protein?: string;
  potassium?: string;
  iron?: string;
  calcium?: string;
  vitaminA?: string;
  vitaminC?: string;
  vitaminD?: string;
  portion?: string;
  portionSize?: string;
}

/** Loose shape of one Sodexo station group. */
export interface RawApiGroup {
  name?: string;
  items?: RawApiItem[];
}

/** Loose shape of one Sodexo daypart. */
export interface RawApiDaypart {
  name?: string;
  groups?: RawApiGroup[];
}
