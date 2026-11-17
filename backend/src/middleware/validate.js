// Request validation. Each validator puts clean values on req.valid.
import { ApiError } from '../utils/ApiError.js';
import { ALL_ALGORITHMS } from '../services/routingService.js';

const MODES = ['driving', 'walking', 'cycling'];

function point(value, label) {
  if (!value || typeof value !== 'object' || typeof value.lat !== 'number' || typeof value.lon !== 'number')
    throw new ApiError(422, 'INVALID_COORDINATE', `${label} needs numeric lat and lon fields`);
  const { lat, lon } = value;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
    throw new ApiError(422, 'INVALID_COORDINATE', 'Latitude must be -90..90 and longitude -180..180');
  const name = typeof value.name === 'string' ? value.name.slice(0, 200) : undefined;
  return { lat, lon, name };
}

function queryNumber(req, key) {
  const raw = req.query[key];
  if (raw === undefined) throw new ApiError(400, 'MISSING_QUERY', `Missing query parameter: ${key}`);
  const value = Number(raw);
  if (raw === '' || !Number.isFinite(value)) throw new ApiError(400, 'INVALID_QUERY', `${key} must be a finite number`);
  return value;
}

export function validateRouteBody({ requireAlgorithm = true } = {}) {
  return (req, _res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || !body.source || !body.destination)
      return next(new ApiError(422, 'MISSING_ENDPOINT', 'Provide source and destination objects'));
    try {
      const mode = body.mode ?? 'driving';
      if (!MODES.includes(mode)) throw new ApiError(422, 'INVALID_MODE', 'mode must be driving, walking or cycling');
      const algorithm = body.algorithm ?? 'astar';
      if (requireAlgorithm && !ALL_ALGORITHMS.includes(algorithm))
        throw new ApiError(422, 'INVALID_ALGORITHM', `algorithm must be one of: ${ALL_ALGORITHMS.join(', ')}`);
      req.valid = { source: point(body.source, 'source'), destination: point(body.destination, 'destination'), mode, algorithm };
      next();
    } catch (error) { next(error); }
  };
}

export function validateGeocodeQuery(req, _res, next) {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2 || q.length > 120) throw new ApiError(400, 'INVALID_QUERY', 'q must contain 2–120 characters');
    let limit = 6;
    if (req.query.limit !== undefined) {
      limit = queryNumber(req, 'limit');
      if (!Number.isInteger(limit) || limit < 1 || limit > 10)
        throw new ApiError(400, 'INVALID_QUERY', 'limit must be an integer from 1 to 10');
    }
    req.valid = { q, limit, localOnly: req.query.scope === 'local' };
    next();
  } catch (error) { next(error); }
}

export function validatePointQuery(req, _res, next) {
  try {
    req.valid = { point: point({ lat: queryNumber(req, 'lat'), lon: queryNumber(req, 'lon') }, 'point') };
    next();
  } catch (error) { next(error); }
}
