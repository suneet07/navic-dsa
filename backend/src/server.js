// Entry point: connect MongoDB, start the C++ engine, then listen.
import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { engine } from './engine/index.js';

async function main() {
  await connectDatabase();

  console.log('[engine] loading road graph…');
  const info = await engine.start();
  console.log(`[engine] ready: ${info.nodes.toLocaleString()} nodes, ${info.edges.toLocaleString()} edges`);

  const server = createApp().listen(config.port, () => {
    console.log(`[api] Navic API listening on http://localhost:${config.port}/api`);
  });

  const shutdown = async signal => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close();
    engine.stop();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  console.error('[api] startup failed:', error.message);
  engine.stop();
  process.exit(1);
});
