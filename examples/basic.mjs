// Basic: print today's lunch. Run: npx tsx examples/basic.mjs
// In your own app, import from 'harless-dining-api' instead of '../src/index.js'.
import { getMenu } from '../src/index.js';

const menu = await getMenu('today');
console.log(`Harless — ${menu.date} (lunch served as: ${menu.meals.lunch?.servedAs ?? '—'})`);
for (const item of menu.meals.lunch?.items ?? []) {
  console.log(`- ${item.name} (${item.calories ?? '?'} cal) [${item.station}]`);
}
