import { Request, Response, NextFunction } from 'express';
import { banningService } from '../services/banning.service.js';
import { logger } from '../config/logger.js';
import { requestsService } from '../services/requests.service.js';

export const globalBanMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        // Check if IP is banned (SERVICE MUST BE UPDATED TO USE REDIS)
        const isBanned = await banningService.isIpBanned(ip);

        if (isBanned) {
            logger.warn(`🚫 Blocked Request from Banned IP: ${ip}`);
            requestsService.logIntrusion(req, {
                severity: 'HIGH',
                type: 'BANNED_IP_ACCESS',
                details: `Attempted access from banned IP: ${ip}`
            });
            // Return 403 Forbidden instead of 404 to be semantically correct, 
            // OR keep 404 if "stealth" is desired (user had 404). Keeping 404 as per existing code.
            res.status(404).send('Not Found');
            return;
        }
        next();
    } catch (error) {
        logger.error('Error in Global Ban Middleware', { error });
        next();
    }
};
