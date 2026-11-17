import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No API route for ${req.method} ${req.path}`));
}

// Every error leaves the API as { error: { code, message } }.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  if (error instanceof ApiError)
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });

  console.error('[api] unexpected error:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}
