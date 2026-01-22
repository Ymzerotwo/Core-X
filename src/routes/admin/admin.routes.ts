import { Router } from 'express';
import { getAdminPage } from '../../controllers/admin/admin.controller.js';
import { ipRestriction } from '../../middleware/ip.middleware.js';

const router = Router();

router.get('/core-x-state', ipRestriction, getAdminPage);

export default router;
