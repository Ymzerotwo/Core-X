import { Router } from 'express';
import { getStatsJson, getRealtimeStatsJson } from '../../controllers/stats/stats.controller.js';
import { ipRestriction } from '../../middleware/ip.middleware.js';

const router = Router();

router.get('/server-state', ipRestriction, getStatsJson);
router.get('/server-state/realtime', ipRestriction, getRealtimeStatsJson);

export default router;
