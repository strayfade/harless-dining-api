// Allergen filter: peanut-free lunch options. Run: npx tsx examples/allergen-filter.ts
import { getMeal } from '../src/index.js';

const avoid = new Set(['peanut', 'treenut']);
const lunch = await getMeal('today', 'lunch');
const safe = (lunch?.items ?? []).filter((i) => !i.allergens.some((a) => avoid.has(a)));
console.log(`Peanut/tree-nut-free lunch items (${safe.length}):`);
for (const item of safe) console.log(`- ${item.name} [${item.station}]`);
