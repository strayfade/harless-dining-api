// Week overview: item counts per day. Run: npx tsx examples/week.ts
import { getWeek } from '../src/index.js';

const week = await getWeek('today');
for (const day of week) {
  if (!day.available) {
    console.log(`${day.date}: no menu`);
    continue;
  }
  const b = day.meals.breakfast?.items.length ?? 0;
  const l = day.meals.lunch?.items.length ?? 0;
  const d = day.meals.dinner?.items.length ?? 0;
  const lunchLabel = day.meals.lunch?.servedAs ?? 'lunch';
  console.log(`${day.date}: breakfast=${b} ${lunchLabel.toLowerCase()}=${l} dinner=${d}`);
}
