# Do you want to know if they're having chicken sandwiches at Harless today? I want to know if they are!

Well, now you can!

> Yes, this code is mostly AI-generated, but every line has been checked by a human.

This is an unofficial menu client for **Harless Dining Hall**. Get Breakfast / Lunch / Dinner for any date — with stations, calories, full nutrition, allergens, and diet flags.

```ts
import { getMenu } from 'harless-dining-api';

const menu = await getMenu('2026-10-07');
console.log(menu.meals.lunch?.items.map((i) => i.name));
```

Data comes from the same public Sodexo JSON endpoint the dining website itself uses. **No API key or sign up needed.**

- Works on Node 18+ with zero runtime dependencies
- Ships ESM + CJS with full TypeScript types
- 30-minute in-memory cache + request dedup (polite to Sodexo when hundreds of people use it)
- Weekend brunch is normalized to `lunch` (with `servedAs: 'Brunch'` preserved)

## Install

```sh
npm install harless-dining-api
```

## Quickstart

```ts
import { getMenu, getMeal, getToday, getWeek } from 'harless-dining-api';

// Full day: breakfast / lunch / dinner
const menu = await getMenu('2026-10-07');
menu.meals.dinner?.stations.forEach((s) => {
  console.log(`## ${s.name}`);
  s.items.forEach((i) => console.log(`- ${i.name} (${i.calories ?? '?'} cal)`));
});

// One meal ('today', 'tomorrow', a Date, or 'YYYY-MM-DD')
const lunch = await getMeal('today', 'lunch');

// The important question:
import { areTheyHavingChickenSandwichesAtHarless } from 'harless-dining-api';
if (await areTheyHavingChickenSandwichesAtHarless()) {
  console.log('Chicken sandwiches today!');
}

// This week (Mon–Sun, America/New_York)
const week = await getWeek();
```

More runnable examples in [`examples/`](examples/): `basic.mjs`, `meal-today.ts`, `allergen-filter.ts`, `week.ts`.

## API

| Function | Signature | Notes |
|---|---|---|
| `getMenu` | `(date?: Date \| string, opts?: MenuOptions) => Promise<DailyMenu>` | `date` defaults to today (Huntington time). |
| `getMeal` | `(date: Date \| string \| undefined, meal: string, opts?: MenuOptions) => Promise<Meal \| null>` | `meal`: breakfast/lunch/dinner (`brunch` aliases to lunch). `null` when unserved. |
| `getToday` | `(opts?: MenuOptions) => Promise<DailyMenu>` | Today's menu. |
| `getWeek` | `(date?: Date \| string, opts?: MenuOptions) => Promise<DailyMenu[]>` | 7 days, Mon–Sun. Days with no menu return `available: false`. |
| `clearCache` | `() => void` | Empty the in-memory cache. |
| `areTheyHavingChickenSandwichesAtHarless` | `(opts?: MenuOptions) => Promise<boolean>` | Today's lunch + dinner contain a chicken sandwich (grilled or otherwise)? |
| `mealNames` | `() => MealName[]` | `['breakfast', 'lunch', 'dinner']`. |
| `tomorrow` | `() => string` | Tomorrow's `YYYY-MM-DD`. |

### Types

```ts
interface DailyMenu {
  date: string;               // 'YYYY-MM-DD' (America/New_York)
  location: string;           // 'Harless Dining Hall'
  available: boolean;         // false when Sodexo has no menu that day
  meals: {
    breakfast: Meal | null;
    lunch: Meal | null;       // brunch weekends land here
    dinner: Meal | null;
  };
  note?: string;
}

interface Meal {
  name: 'breakfast' | 'lunch' | 'dinner';
  servedAs: string;           // e.g. 'Brunch' on weekends
  stations: Station[];        // e.g. 'Sizzle / Savory', 'Simple Servings'
  items: MenuItem[];          // flat list across stations
}

interface MenuItem {
  name: string;
  description: string;
  calories: number | null;
  nutrition: NutritionInfo;   // sodium, protein, … (raw '170mg'-style strings)
  allergens: string[];        // e.g. ['egg', 'milk', 'treenut'] — [] when none
  diet: ('vegetarian' | 'vegan' | 'mindful' | 'plantBased')[];
  isVegan: boolean;
  isVegetarian: boolean;
  isMindful: boolean;
  isPlantBased: boolean;
  ingredients: string;
  station: string;
}
```

### Options

```ts
await getMenu('2026-10-07', {
  cache: true,        // default: 30-min cache. Number = custom TTL ms. false = off.
  timeoutMs: 10_000,  // per-request timeout
  apiKey: '…',        // default: bundled public site key (or HARLESS_API_KEY env)
  baseUrl: '…',       // default: https://api-prd.sodexomyway.net
  userAgent: '…',
  fetchImpl: fetch,   // custom fetch (tests, proxies)
});
```

### Errors

All errors extend `HarlessError` (with a `.code`):

- `HarlessValidationError` — bad date/meal argument. Never thrown for "no menu that day" (that's `available: false` / `null`).
- `HarlessNetworkError` — fetch failure, timeout, or non-2xx (`.status` included).
- `HarlessParseError` — Sodexo changed their payload shape.

```ts
import { HarlessNetworkError } from 'harless-dining-api';
try {
  await getMenu('today');
} catch (err) {
  if (err instanceof HarlessNetworkError) console.error('Sodexo is down:', err.status);
}
```

## Allergen codes

Normalized to lowercase: `egg, fish, gluten, milk, mustard, peanut, sesame, shellfish, soy, sulphite, treenut, wheat`. Only allergens Sodexo flags as present (`contains: "true"`) are listed.

> Sodexo's data isn't perfect — always double-check with dining staff if you have a severe allergy.

## Caching & politeness

Responses are cached in memory for 30 minutes and concurrent calls for the same day share one HTTP request. Please keep the cache enabled (or longer via `cache: <ms>`) rather than polling — hundreds of users hitting Sodexo every minute will get everyone rate-limited.

## How it works

The package calls the public endpoint the dining website's own JavaScript uses:

```
GET https://api-prd.sodexomyway.net/v0.2/data/menu/45995003/151460?date=YYYY-MM-DD
```

with the site's public `api-key` (bundled; overridable via options or `HARLESS_API_KEY`). If Sodexo rotates the key or IDs, update them via options — no code changes needed.

## Limitations

- Unofficial; not affiliated with the university or Sodexo. Menus change without notice.
- Hours of operation aren't in the API — see [Hours of Operation](https://marshall.sodexomyway.com/en-us/locations/hours).
- No per-item nutrition-label endpoint is used; all nutrition comes from the menu payload.

## License

MIT