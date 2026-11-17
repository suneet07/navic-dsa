import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Same-origin requests (the React build served by this server, or curl with no
// Origin header) are always allowed; other browser origins must be listed in ALLOWED_ORIGINS.
export function corsMiddleware(req, res, next) {
  const sameOrigin = `${req.protocol}://${req.get('host')}`;
  cors({
    origin(origin, callback) {
      if (!origin || origin === sameOrigin || config.allowedOrigins.includes(origin)) return callback(null, true);
      callback(new ApiError(403, 'ORIGIN_DENIED', 'This browser origin is not in ALLOWED_ORIGINS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    maxAge: 600,
  })(req, res, next);
}

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimitPerMinute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests; wait briefly and try again' } }),
});
