import { recordRoute } from '../services/historyService.js';
import { compareAlgorithms, findRoute } from '../services/routingService.js';

// POST /api/route  { source, destination, mode, algorithm }
export async function route(req, res) {
  const request = req.valid;
  const result = await findRoute(request);
  res.set('Cache-Control', 'no-store').json(result);
  if (!result.cached) recordRoute({ ...request, route: result }); // fire-and-forget
}

// POST /api/route/compare  { source, destination, mode } — runs all five C++ algorithms
export async function compare(req, res) {
  res.set('Cache-Control', 'no-store').json(await compareAlgorithms(req.valid));
}
