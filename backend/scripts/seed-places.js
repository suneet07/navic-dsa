// Loads data/generated/places.json into MongoDB (collection: places).
// Usage:  npm run seed   (needs MONGO_URI in backend/.env and prepare-data run first)
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { Place } from '../src/models/Place.js';

async function main() {
  if (!config.mongoUri) throw new Error('Set MONGO_URI in backend/.env first');
  const places = JSON.parse(readFileSync(config.data.places, 'utf8'));
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });

  await Place.deleteMany({});
  const docs = places.map(place => ({
    placeId: place.id,
    name: place.name,
    nameLower: place.name.toLowerCase(),
    aliases: place.aliases || '',
    kind: place.kind,
    source: place.source,
    location: { type: 'Point', coordinates: [place.lon, place.lat] },
  }));
  for (let i = 0; i < docs.length; i += 2000) await Place.insertMany(docs.slice(i, i + 2000), { ordered: false });
  await Place.syncIndexes();
  console.log(`Seeded ${docs.length} places into ${mongoose.connection.name}.places`);
  await mongoose.disconnect();
}

main().catch(async error => {
  console.error('Seeding failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
