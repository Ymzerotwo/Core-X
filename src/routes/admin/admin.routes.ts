import { Router } from 'express';
import { getAdminPage } from '../../controllers/admin/admin.controller.js';
import { ipWhitelist } from '../../middleware/ip.middleware.js';

import { getBans, banItem, unbanItem, getBanningPage } from '../../controllers/admin/banning.controller.js';

const router = Router();

router.get('/core-x-state', ipWhitelist, getAdminPage);
router.get('/bans', ipWhitelist, getBans);
router.post('/bans', ipWhitelist, banItem);
router.delete('/bans', ipWhitelist, unbanItem);

export default router;
