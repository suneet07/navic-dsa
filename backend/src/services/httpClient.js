// fetch() wrapper for third-party map services with a timeout and uniform errors.
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export async function getJson(url, { timeoutMs = 15000 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': config.providers.userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new ApiError(503, 'PROVIDER_UNAVAILABLE', 'Worldwide map service is busy or unreachable. Try again shortly.');
  }
  if (response.status === 429 || response.status >= 500)
    throw new ApiError(503, 'PROVIDER_UNAVAILABLE', 'Worldwide map service is busy or unreachable. Try again shortly.');
  try {
    return { status: response.status, body: await response.json() };
  } catch {
    throw new ApiError(502, 'PROVIDER_ERROR', 'The worldwide service returned an unreadable response.');
  }
}
