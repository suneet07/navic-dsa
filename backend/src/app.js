// Express application (no listening here, so tests can import it).
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config/env.js';
import { corsMiddleware } from './middleware/security.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Leaflet tiles and the IP-location lookup are cross-origin, so the default CSP is relaxed.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(morgan(config.env === 'production' ? 'tiny' : 'dev'));
  app.use('/api', corsMiddleware);
  app.use(express.json({ limit: '16kb' }));

  app.use('/api', apiRoutes);
  app.use('/api', notFound);

  // In production the backend also serves the built React app.
  if (existsSync(config.staticDir)) {
    app.use(express.static(config.staticDir, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(config.staticDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
