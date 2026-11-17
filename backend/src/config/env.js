// Central configuration. Every value can be overridden in backend/.env.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const projectRoot = path.resolve(backendRoot, '..');
const fromRoot = value => (path.isAbsolute(value) ? value : path.resolve(projectRoot, value));
const exe = process.platform === 'win32' ? '.exe' : '';

const int = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI || '',

  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map(origin => origin.trim()).filter(Boolean),
  rateLimitPerMinute: int(process.env.RATE_LIMIT_PER_MINUTE, 180),

  engine: {
    binary: fromRoot(process.env.ENGINE_PATH || `dsa/build/navic-engine${exe}`),
    graph: fromRoot(process.env.GRAPH_PATH || 'data/generated/graph.txt'),
    floydMaxNodes: int(process.env.FLOYD_MAX_NODES, 1500),
    timeoutMs: int(process.env.ENGINE_TIMEOUT_MS, 30000),
  },

  data: {
    places: fromRoot(process.env.PLACES_PATH || 'data/generated/places.json'),
    metadata: fromRoot(process.env.METADATA_PATH || 'data/metadata.json'),
    network: fromRoot(process.env.NETWORK_PATH || 'data/network.geojson'),
  },

  providers: {
    photon: process.env.PHOTON_BASE_URL || 'https://photon.komoot.io',
    osrm: process.env.OSRM_BASE_URL || 'https://routing.openstreetmap.de',
    userAgent: 'Navic/2.0 (educational route planner)',
  },

  staticDir: fromRoot(process.env.STATIC_DIR || 'frontend/dist'),
});
