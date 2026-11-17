// Worldwide geocoding via Photon (komoot), built on OpenStreetMap.
import { config } from '../config/env.js';
import { getJson } from './httpClient.js';

function toPlace(feature) {
  const props = feature.properties || {};
  const [lon, lat] = feature.geometry?.coordinates || [];
  const name = props.name || props.street;
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const context = [props.city, props.state, props.country]
    .filter((part, i, all) => part && part !== name && all.indexOf(part) === i)
    .join(', ');
  return {
    id: `photon:${props.osm_type || 'osm'}${props.osm_id}`,
    name,
    kind: props.osm_value || 'place',
    context,
    source: 'photon',
    lat,
    lon,
  };
}

const features = body => (Array.isArray(body?.features) ? body.features.map(toPlace).filter(Boolean) : []);

export async function searchPhoton(query, limit) {
  const url = `${config.providers.photon}/api/?limit=${limit}&q=${encodeURIComponent(query)}`;
  return features((await getJson(url, { timeoutMs: 8000 })).body);
}

export async function reversePhoton({ lat, lon }) {
  const url = `${config.providers.photon}/reverse?limit=1&lat=${lat}&lon=${lon}`;
  return features((await getJson(url, { timeoutMs: 8000 })).body)[0] || null;
}
