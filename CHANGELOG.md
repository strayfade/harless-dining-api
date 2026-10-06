# Changelog

## Unreleased

- New: `areTheyHavingChickenSandwichesAtHarless()` — boolean for whether today's lunch or dinner has a chicken sandwich (plus exported `isChickenSandwich` name matcher)

## 0.1.0 — 2026-10-06

Initial release.

- `getMenu` / `getMeal` / `getToday` / `getWeek` for Harless Dining Hall Breakfast/Lunch/Dinner
- Stations, calories + full nutrition, normalized allergens, diet flags per item
- Weekend brunch normalized to `lunch` with `servedAs: 'Brunch'`
- 30-minute in-memory cache + in-flight request dedup, retries with backoff
- Typed errors (`HarlessValidationError` / `HarlessNetworkError` / `HarlessParseError`)
- ESM + CJS dual build with TypeScript definitions, zero runtime dependencies
