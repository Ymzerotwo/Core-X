
import { Request, Response } from 'express';
import { getStatusPage } from '../../views/stats.view.js';
import { logger } from '../../config/logger.js';
import { rotateCsrfToken } from '../../middleware/csrf.middleware.js';

export const getAdminPage = (req: Request, res: Response) => {
    try {
        // Generate CSRF token for the session
        rotateCsrfToken(res);
        const html = getStatusPage({
            serviceName: process.env.SERVICE_NAME || 'Core-X',
            nonce: res.locals.nonce
        });
        res.send(html);
    } catch (error) {
        logger.error('Admin Page Error', error);
        res.status(500).send('Server Error');
    }
};
