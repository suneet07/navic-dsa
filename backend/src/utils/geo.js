const EARTH_RADIUS_M = 6371008.8;
const toRad = deg => (deg * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

// bbox = [south, west, north, east]
export const inBbox = (point, [south, west, north, east]) =>
  point.lat >= south && point.lat <= north && point.lon >= west && point.lon <= east;
