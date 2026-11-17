// Local (Delhi) place gazetteer. Uses MongoDB when it is connected and seeded,
// otherwise falls back to data/generated/places.json kept in memory.
import { readFileSync, existsSync } from 'node:fs';
import { config } from '../config/env.js';
import { isDatabaseReady } from '../config/db.js';
import { Place } from '../models/Place.js';
import { haversine } from '../utils/geo.js';

let memoryPlaces = null;
function loadMemoryPlaces() {
  if (memoryPlaces) return memoryPlaces;
  if (!existsSync(config.data.places)) {
    console.warn(`[places] ${config.data.places} missing — run "npm run prepare-data"`);
    return (memoryPlaces = []);
  }
  memoryPlaces = JSON.parse(readFileSync(config.data.places, 'utf8')).map(place => ({
    ...place,
    nameLower: place.name.toLowerCase(),
    aliasesLower: (place.aliases || '').toLowerCase(),
  }));
  return memoryPlaces;
}

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 0 exact · 1 prefix · 2 substring · 3 alias match; roads rank after named places.
function score(place, query) {
  const name = place.nameLower;
  const base = name === query ? 0 : name.startsWith(query) ? 1 : name.includes(query) ? 2
    : place.aliasesLower.includes(query) ? 3 : 99;
  return base === 99 ? 99 : base + (place.kind === 'road' ? 4 : 0);
}

function rank(candidates, query, limit) {
  const seen = new Set();
  return candidates
    .map(place => ({ place, score: score(place, query) }))
    .filter(item => item.score < 99)
    .sort((a, b) => a.score - b.score)
    .filter(({ place }) => !seen.has(place.nameLower) && seen.add(place.nameLower))
    .slice(0, limit)
    .map(({ place }) => ({
      id: place.id, name: place.name, kind: place.kind, source: place.source || 'OpenStreetMap',
      context: '', lat: place.lat, lon: place.lon,
    }));
}

async function mongoCandidates(query) {
  if (!isDatabaseReady()) return null;
  const pattern = new RegExp(escapeRegex(query), 'i');
  const docs = await Place.find({ $or: [{ nameLower: pattern }, { aliases: pattern }] }).limit(200).lean();
  if (!docs.length && !(await Place.estimatedDocumentCount())) return null; // not seeded yet
  return docs.map(doc => ({
    id: doc.placeId, name: doc.name, kind: doc.kind, source: doc.source,
    lat: doc.location.coordinates[1], lon: doc.location.coordinates[0],
    nameLower: doc.nameLower, aliasesLower: (doc.aliases || '').toLowerCase(),
  }));
}

export async function searchLocalPlaces(rawQuery, limit) {
  const query = rawQuery.trim().toLowerCase();
  const candidates = (await mongoCandidates(query)) ?? loadMemoryPlaces();
  return rank(candidates, query, limit);
}

export async function nearestLocalPlace(point) {
  if (isDatabaseReady()) {
    const doc = await Place.findOne({
      location: { $nearSphere: { $geometry: { type: 'Point', coordinates: [point.lon, point.lat] } } },
    });
    if (doc) {
      const place = doc.toPlace();
      return { ...place, distance_m: haversine(point, place) };
    }
  }
  let best = null;
  let bestDistance = Infinity;
  for (const place of loadMemoryPlaces()) {
    const d = haversine(point, place);
    if (d < bestDistance) { bestDistance = d; best = place; }
  }
  return best && { id: best.id, name: best.name, kind: best.kind, source: best.source, lat: best.lat, lon: best.lon, distance_m: bestDistance };
}

export const localPlaceCount = () => loadMemoryPlaces().length;
