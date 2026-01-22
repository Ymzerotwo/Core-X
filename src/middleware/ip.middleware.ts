import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { requestsService } from '../services/requests.service.js';

export const ipWhitelist = (req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) return next();
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
    const allowedIps = (process.env.ALLOWED_IPS || '').split(',').map(ip => ip.trim());
    const normalizedIp = clientIp.startsWith('::ffff:') ? clientIp.substring(7) : clientIp;
    if (!allowedIps.includes(normalizedIp) && !allowedIps.includes('*')) {
        logger.warn(`🚫 Unauthorized access attempt (Whitelist Block) from ${normalizedIp}`);
        requestsService.incrementIntrusion();
        res.status(404).send('Not Found');
        return;
    }
    next();
};

export const ipBlacklist = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
    const blockedIps = (process.env.BLOCKED_IPS || '').split(',').map(ip => ip.trim());
    const normalizedIp = clientIp.startsWith('::ffff:') ? clientIp.substring(7) : clientIp;
    if (blockedIps.includes(normalizedIp)) {
        logger.warn(`🚫 Unauthorized access attempt (Blacklist Block) from ${normalizedIp}`);
        requestsService.incrementIntrusion();
        res.status(403).send('Forbidden');
        return;
    }
    next();
};
