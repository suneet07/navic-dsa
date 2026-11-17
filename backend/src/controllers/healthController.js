import { readFileSync } from 'node:fs';
import { config } from '../config/env.js';
import { isDatabaseReady } from '../config/db.js';
import { engine } from '../engine/index.js';
import { LOCAL_ALGORITHMS } from '../services/routingService.js';
import { localPlaceCount } from '../services/placeService.js';

const startedAt = Date.now();
let metadata = {};
try { metadata = JSON.parse(readFileSync(config.data.metadata, 'utf8')); } catch { /* optional */ }

export function health(_req, res) {
  const info = engine.info;
  res.status(info ? 200 : 503).json({
    status: info ? 'ok' : 'starting',
    service: 'navic-mern',
    engine: info ? 'ready' : 'starting',
    database: isDatabaseReady() ? 'connected' : 'offline',
    nodes: info?.nodes ?? 0,
    edges: info?.edges ?? 0,
    places: localPlaceCount(),
    data_version: metadata.data_version,
    uptime_s: (Date.now() - startedAt) / 1000,
  });
}

export function coverage(_req, res) {
  res.json({
    ...metadata,
    name: 'Worldwide roads',
    bbox: [-90, -180, 90, 180],
    local_bbox: engine.info?.bbox ?? metadata.bbox,
    world_provider: 'OSRM',
    modes: ['driving', 'walking', 'cycling'],
    algorithms: ['world', ...LOCAL_ALGORITHMS],
    floyd_max_nodes: engine.info?.floyd_max_nodes,
    max_snap_m: 800,
  });
}
