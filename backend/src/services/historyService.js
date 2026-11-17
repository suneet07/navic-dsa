// Persists computed routes in MongoDB (silently skipped when Mongo is offline).
import { isDatabaseReady } from '../config/db.js';
import { RouteHistory } from '../models/RouteHistory.js';

const endpoint = place => ({ name: place.name?.slice(0, 200), lat: place.lat, lon: place.lon });

export async function recordRoute({ source, destination, mode, algorithm, route }) {
  if (!isDatabaseReady()) return;
  try {
    await RouteHistory.create({
      source: endpoint(source),
      destination: endpoint(destination),
      mode,
      algorithm,
      provider: route.provider,
      distanceM: route.distance_m,
      durationS: route.duration_s,
      visitedNodes: route.visited_nodes,
      searchMs: route.search_ms,
    });
  } catch (error) {
    console.warn('[history] could not save route:', error.message);
  }
}

export async function recentRoutes(limit = 10) {
  if (!isDatabaseReady()) return null;
  return RouteHistory.find().sort({ createdAt: -1 }).limit(limit).lean();
}

export async function clearHistory() {
  if (!isDatabaseReady()) return 0;
  const { deletedCount } = await RouteHistory.deleteMany({});
  return deletedCount;
}
