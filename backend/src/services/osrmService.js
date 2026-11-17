// Worldwide routing through the public OSRM servers run by FOSSGIS.
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { getJson } from './httpClient.js';

const PROFILES = { driving: 'car', cycling: 'bike', walking: 'foot' };
let nextAllowed = 0; // be polite to the donated server: max one request per second

function instructionFor(step) {
  const { type = 'continue', modifier = '', exit } = step.maneuver;
  let text;
  if (type === 'depart') text = 'Depart';
  else if (type === 'arrive') text = 'Arrive at your destination';
  else if (type.includes('roundabout') || type === 'rotary') text = exit ? `Take exit ${exit} at the roundabout` : 'Enter the roundabout';
  else text = `${type}${modifier ? ` ${modifier}` : ''}`;
  if (step.name && type !== 'arrive') text += ` on ${step.name}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function maneuverFor({ type, modifier = '' }) {
  if (type === 'depart' || type === 'arrive') return type;
  if (modifier.includes('left')) return 'left';
  if (modifier.includes('right')) return 'right';
  return 'continue';
}

export async function routeWorldwide({ source, destination, mode }) {
  const now = Date.now();
  if (now < nextAllowed) throw new ApiError(429, 'ROUTER_BUSY', 'Please wait a second and try the route again.');
  nextAllowed = now + 1000;

  const coords = `${source.lon},${source.lat};${destination.lon},${destination.lat}`;
  const url = `${config.providers.osrm}/routed-${PROFILES[mode]}/route/v1/driving/${coords}` +
    '?overview=simplified&steps=true&geometries=geojson&radiuses=1000;1000&generate_hints=false';
  const { status, body } = await getJson(url, { timeoutMs: 18000 });

  if (body.code === 'NoRoute' || body.code === 'NoSegment')
    throw new ApiError(404, 'NO_ROUTE', `No ${mode} route found between these locations. Choose points near connected roads.`);
  if (status !== 200 || body.code !== 'Ok' || !body.routes?.length)
    throw new ApiError(502, 'PROVIDER_ERROR', 'The routing service returned an unexpected result.');

  const route = body.routes[0];
  const steps = route.legs.flatMap(leg => leg.steps.map(step => ({
    maneuver: maneuverFor(step.maneuver),
    instruction: instructionFor(step),
    road: step.name || '',
    coordinate: step.maneuver.location,
    distance_m: step.distance,
    duration_s: step.duration,
  })));
  const snap = i => ({
    lon: body.waypoints[i].location[0],
    lat: body.waypoints[i].location[1],
    distance_m: body.waypoints[i].distance,
  });

  return {
    provider: 'osrm',
    algorithm: 'world',
    mode,
    cached: false,
    geometry: route.geometry,
    distance_m: route.distance,
    duration_s: route.duration,
    steps,
    explored: [],
    snapped: { source: snap(0), destination: snap(1) },
    warnings: ['Estimated times exclude live traffic. Road availability depends on OpenStreetMap data and the selected mode.'],
  };
}
