// One function per backend endpoint.
import { postJson, request } from './client';

const endpoint = place => ({ lat: place.lat, lon: place.lon, name: place.name });

export const getHealth = signal => request('/health', { signal });

export const searchPlaces = (query, { limit = 6, local = false, signal } = {}) =>
  request(`/geocode?q=${encodeURIComponent(query)}&limit=${limit}${local ? '&scope=local' : ''}`, { signal });

export const getRoute = ({ source, destination, mode, algorithm }, signal) =>
  postJson('/route', { source: endpoint(source), destination: endpoint(destination), mode, algorithm }, { signal });

export const compareAlgorithms = ({ source, destination, mode }, signal) =>
  postJson('/route/compare', { source: endpoint(source), destination: endpoint(destination), mode }, { signal });

export const getHistory = (limit = 5, signal) => request(`/history?limit=${limit}`, { signal });

export const getNetwork = signal => request('/network', { signal });
