// Tonight's dinner, grouped by station. Run: npx tsx examples/meal-today.ts
import { getMeal } from '../src/index.js';

const dinner = await getMeal('today', 'dinner');
if (!dinner) {
  console.log('No dinner served today.');
  process.exit(0);
}
console.log(`Dinner (served as ${dinner.servedAs}) — ${dinner.items.length} items`);
for (const station of dinner.stations) {
  console.log(`\n## ${station.name}`);
  for (const item of station.items) {
    const tags = item.diet.length > 0 ? ` [${item.diet.join(', ')}]` : '';
    console.log(`- ${item.name} (${item.calories ?? '?'} cal)${tags}`);
  }
}
