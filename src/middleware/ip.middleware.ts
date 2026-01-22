import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export const ipRestriction = (req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) return next();
    const clientIp = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
    const allowedIps = (process.env.ALLOWED_IPS || '').split(',').map(ip => ip.trim());
    const normalizedIp = clientIp.startsWith('::ffff:') ? clientIp.substring(7) : clientIp;
    if (!allowedIps.includes(normalizedIp) && !allowedIps.includes('*')) {
        logger.warn(`🚫 Unauthorized access attempt from ${normalizedIp}`);
        res.status(404).send('Not Found');
        return;
    }
    next();
};
