import { config } from '../config/env.js';

// GET /api/network — offline Delhi road backdrop (GeoJSON, ~16 MB, cached by the browser).
export function network(_req, res, next) {
  res.sendFile(config.data.network, {
    headers: { 'Content-Type': 'application/geo+json', 'Cache-Control': 'public, max-age=86400' },
  }, error => error && next(error));
}
