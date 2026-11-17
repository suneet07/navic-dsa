// Thin fetch wrapper: JSON in/out, timeouts and friendly error messages.
export const API_BASE = `${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api`;

export async function request(path, { signal, ...options } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 90000);
  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, signal: controller.signal });
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json')) throw new Error('The API is not responding with JSON. Is the backend running?');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status})`);
    return body;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error('The API took too long to respond; please retry.');
    if (error instanceof TypeError) throw new Error('Cannot reach the API. Check that the backend is running and retry.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export const postJson = (path, body, options = {}) =>
  request(path, { ...options, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
