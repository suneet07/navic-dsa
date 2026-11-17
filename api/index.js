// Vercel serverless entry point. Every /api/* request is rewritten here (see vercel.json).
// The C++ engine is started on the first request of each warm instance (~3 s cold start)
// and reused for later requests while the instance stays alive.
import { createApp } from '../backend/src/app.js';
import { engine } from '../backend/src/engine/index.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await engine.start();
  } catch (error) {
    console.error('[engine] failed to start:', error.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'ENGINE_UNAVAILABLE', message: 'The routing engine could not start.' } }));
    return;
  }
  return app(req, res);
}
