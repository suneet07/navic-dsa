import { engine } from '../engine/index.js';
import { ApiError } from '../utils/ApiError.js';
import { inBbox } from '../utils/geo.js';
import { nearestLocalPlace, searchLocalPlaces } from '../services/placeService.js';
import { reversePhoton, searchPhoton } from '../services/photonService.js';

// GET /api/geocode?q=...&limit=6[&scope=local]
export async function geocode(req, res) {
  const { q, limit, localOnly } = req.valid;
  const local = await searchLocalPlaces(q, limit);
  if (localOnly) return res.json({ results: local, limited: false, provider: 'local_osm_gazetteer' });

  let worldwide = [];
  let limited = false;
  try { worldwide = await searchPhoton(q, limit); } catch { limited = true; }
  if (limited && !local.length)
    throw new ApiError(503, 'GEOCODER_UNAVAILABLE', 'Worldwide search is unavailable. Try again or pick the location on the map.');

  // Keep the campus alias local-first; otherwise global names take precedence.
  const results = q.toLowerCase() === 'nsut' ? [...local, ...worldwide] : [...worldwide, ...local];
  res.json({ results: results.slice(0, limit), limited, provider: limited ? 'local_osm_gazetteer' : 'photon_and_local' });
}

// GET /api/reverse-geocode?lat=..&lon=..
export async function reverseGeocode(req, res) {
  const { point } = req.valid;
  const local = engine.info && inBbox(point, engine.info.bbox);
  if (local) return res.json({ result: await nearestLocalPlace(point), approximate: true, provider: 'local_osm_gazetteer' });
  res.json({ result: await reversePhoton(point), approximate: true, provider: 'photon' });
}
