import { Request, Response, NextFunction } from 'express';
import { banningService } from '../services/banning.service.js';
import { logger } from '../config/logger.js';
import { requestsService } from '../services/requests.service.js';

export const globalBanMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        if (banningService.isIpBanned(ip)) {
            logger.warn(`🚫 Blocked Request from Banned IP: ${ip}`);
            requestsService.logIntrusion(req, {
                severity: 'HIGH',
                type: 'BANNED_IP_ACCESS',
                details: `Attempted access from banned IP: ${ip}`
            });
            return res.status(404).send('Not Found');
        }
        next();
    } catch (error) {
        logger.error('Error in Global Ban Middleware', { error });
        next();
    }
};
