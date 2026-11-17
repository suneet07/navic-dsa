import { clearHistory, recentRoutes } from '../services/historyService.js';

// GET /api/history?limit=10
export async function listHistory(req, res) {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const routes = await recentRoutes(limit);
  res.json({ enabled: routes !== null, routes: routes ?? [] });
}

// DELETE /api/history
export async function deleteHistory(_req, res) {
  res.json({ deleted: await clearHistory() });
}
