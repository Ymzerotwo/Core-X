import { Router } from 'express';
import { getStatsJson, getRealtimeStatsJson } from '../../controllers/stats/stats.controller.js';
import { getRequestStatsJson } from '../../controllers/stats/req.controller.js';
import { ipWhitelist } from '../../middleware/ip.middleware.js';

const router = Router();

router.get('/server-state', ipWhitelist, getStatsJson);
router.get('/server-state/realtime', ipWhitelist, getRealtimeStatsJson);
router.get('/requests-state', ipWhitelist, getRequestStatsJson);

export default router;
