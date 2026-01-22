import { Request, Response, NextFunction } from 'express';
import { requestsService } from '../services/requests.service.js';

export const statsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip tracking for stats endpoints themselves to avoid infinite loops or skewing data too much with simple polling
    if (req.path.startsWith('/state/') || req.path.startsWith('/admin/')) {
        return next();
    }
    requestsService.incrementTotal();
    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
            requestsService.incrementSuccess();
        } else if (res.statusCode >= 500) {
            // Server errors are logged by the error handler (logSystemError), so we skip incrementing here to avoid double counting
            // requestsService.incrementServerError();
        } else if (res.statusCode >= 400) {
            requestsService.logClientWarning(req, res.statusCode, res.statusMessage);
        }
    });

    next();
};
