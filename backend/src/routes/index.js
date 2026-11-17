// All API routes, mounted under /api in app.js.
import { Router } from 'express';
import { asyncHandler } from '../utils/ApiError.js';
import { apiRateLimit } from '../middleware/security.js';
import { validateGeocodeQuery, validatePointQuery, validateRouteBody } from '../middleware/validate.js';
import { coverage, health } from '../controllers/healthController.js';
import { geocode, reverseGeocode } from '../controllers/geocodeController.js';
import { compare, route } from '../controllers/routeController.js';
import { deleteHistory, listHistory } from '../controllers/historyController.js';
import { network } from '../controllers/networkController.js';

const router = Router();

router.get('/health', health);
router.get('/coverage', coverage);
router.get('/network', network);

router.get('/geocode', apiRateLimit, validateGeocodeQuery, asyncHandler(geocode));
router.get('/reverse-geocode', apiRateLimit, validatePointQuery, asyncHandler(reverseGeocode));

router.post('/route', apiRateLimit, validateRouteBody(), asyncHandler(route));
router.post('/route/compare', apiRateLimit, validateRouteBody({ requireAlgorithm: false }), asyncHandler(compare));

router.get('/history', asyncHandler(listHistory));
router.delete('/history', asyncHandler(deleteHistory));

export default router;
