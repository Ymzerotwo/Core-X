import { Request, Response } from 'express';
import { logger } from '../../config/logger.js';
import { requestsService } from '../../services/requests.service.js';

export const getRequestStatsJson = async (req: Request, res: Response) => {
    try {
        const stats = await requestsService.getStats();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(stats);
    } catch (error) {
        logger.error('Request Stats Data Error', error);
        res.status(500).json({ error: 'Failed to fetch request stats' });
    }
};
