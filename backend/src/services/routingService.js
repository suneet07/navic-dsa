// Decides who answers a route request: the C++ engine (Delhi graph, our five
// algorithms) or OSRM (worldwide). Also caches engine results.
import { engine } from '../engine/index.js';
import { inBbox } from '../utils/geo.js';
import { routeWorldwide } from './osrmService.js';

export const LOCAL_ALGORITHMS = ['dijkstra', 'astar', 'bfs', 'dfs', 'floyd'];
export const ALL_ALGORITHMS = ['world', ...LOCAL_ALGORITHMS];

const LOCAL_WARNINGS = [
  'Distance and ETA exclude the gaps between selected points and snapped road nodes.',
  'ETA uses fixed speeds, without traffic or waiting time.',
  'Basic guidance: turn restrictions, barriers and conditional access are not modeled.',
];

// Small LRU cache: Map keeps insertion order, so the first key is the oldest.
class LruCache {
  constructor(limit) { this.limit = limit; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key, value) {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value);
  }
}
const cache = new LruCache(64);
const round = n => n.toFixed(5);
const cacheKey = (kind, { algorithm = '', mode, source, destination }) =>
  [kind, algorithm, mode, round(source.lat), round(source.lon), round(destination.lat), round(destination.lon)].join(':');

const insideGraph = (...points) => engine.info && points.every(point => inBbox(point, engine.info.bbox));

export async function findRoute({ source, destination, mode, algorithm }) {
  if (algorithm === 'world') return routeWorldwide({ source, destination, mode });
  if (!insideGraph(source, destination)) {
    const route = await routeWorldwide({ source, destination, mode });
    route.warnings.unshift(`${algorithm.toUpperCase()} runs on the bundled Delhi graph; these points are outside it, so worldwide routing was used.`);
    return route;
  }

  const key = cacheKey('route', { algorithm, mode, source, destination });
  const hit = cache.get(key);
  if (hit) return { ...hit, cached: true };

  const result = await engine.route({ algorithm, mode, source, destination });
  const route = { ...result, provider: 'navic', mode, cached: false, warnings: [...LOCAL_WARNINGS] };
  if (result.snapped.source.osm_id === result.snapped.destination.osm_id)
    route.warnings.push('Both points snap to the same road node; road distance is zero.');
  cache.set(key, route);
  return route;
}

export async function compareAlgorithms({ source, destination, mode }) {
  const key = cacheKey('compare', { mode, source, destination });
  const hit = cache.get(key);
  if (hit) return hit;
  const result = await engine.compare({ mode, source, destination });
  const comparison = { mode, provider: 'navic', ...result };
  cache.set(key, comparison);
  return comparison;
}
