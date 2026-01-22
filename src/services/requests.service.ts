import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';
import { Request } from 'express';

const DATA_DIR = path.join(process.cwd(), 'data');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');

interface SystemError {
    id: string;
    timestamp: string;
    method: string;
    route: string;
    message: string;
    stack?: string;
}

interface IntrusionEvent {
    id: string;
    timestamp: string;
    ip: string;
    riskLevel: string;
    type: string;
    token?: string;
    userId?: string;
    method: string;
    route: string;
    details?: string;
}

interface RequestsData {
    totalRequests: number;
    successfulRequests: number;
    clientErrors: number;
    serverErrors: number;
    intrusionAttempts: number;
    recentSystemErrors: SystemError[];
    recentClientErrors: SystemError[];
    recentIntrusions: IntrusionEvent[];
}

const defaultData: RequestsData = {
    totalRequests: 0,
    successfulRequests: 0,
    clientErrors: 0,
    serverErrors: 0,
    intrusionAttempts: 0,
    recentSystemErrors: [],
    recentClientErrors: [],
    recentIntrusions: []
};

class RequestsService {
    private data: RequestsData;
    private saveTimeout: NodeJS.Timeout | null = null;
    private readonly SAVE_DELAY = 60000; // Save every 60 seconds

    constructor() {
        this.data = { ...defaultData };
        this.init();
    }

    private init() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }

            if (fs.existsSync(REQUESTS_FILE)) {
                const fileContent = fs.readFileSync(REQUESTS_FILE, 'utf-8');
                this.data = { ...defaultData, ...JSON.parse(fileContent) };
            } else {
                this.saveSync();
            }
        } catch (error) {
            logger.error('Failed to initialize RequestsService', error);
        }
    }

    private saveSync() {
        try {
            console.log('[RequestsService] Saving data sync...');
            fs.writeFileSync(REQUESTS_FILE, JSON.stringify(this.data, null, 2));
        } catch (error) {
            logger.error('Failed to save requests data synchronously', error);
        }
    }
    public flush() {
        this.saveSync();
    }

    private scheduleSave() {
        if (this.saveTimeout) return;

        this.saveTimeout = setTimeout(() => {
            fs.writeFile(REQUESTS_FILE, JSON.stringify(this.data, null, 2), (err) => {
                if (err) logger.error('Failed to save requests data async', err);
                this.saveTimeout = null;
            });
        }, this.SAVE_DELAY);
    }

    public incrementTotal() {
        this.data.totalRequests++;
        this.scheduleSave();
    }

    public incrementSuccess() {
        this.data.successfulRequests++;
        this.scheduleSave();
    }

    public incrementClientError() {
        this.data.clientErrors++;
        this.scheduleSave();
    }

    public logClientWarning(req: Request, statusCode: number, message?: string) {
        const newError: SystemError = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            method: req.method,
            route: req.originalUrl || req.url,
            message: message || `Client Error ${statusCode}`,
        };
        this.data.recentClientErrors.unshift(newError);
        if (this.data.recentClientErrors.length > 50) {
            this.data.recentClientErrors = this.data.recentClientErrors.slice(0, 50);
        }
        this.incrementClientError();
    }

    public incrementServerError() {
        this.data.serverErrors++;
        this.scheduleSave();
    }

    public incrementIntrusion() {
        this.data.intrusionAttempts++;
        this.scheduleSave();
    }

    public logIntrusion(req: Request, threat: { severity: string, type: string, details?: string }) {
        const token = req.signedCookies ? req.signedCookies['access_token'] : undefined;
        // Attempt to get user ID if available (middleware might not have run yet, so this is best effort)
        const userId = (req as any).user?.id;

        const newIntrusion: IntrusionEvent = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            ip: req.ip || 'unknown',
            riskLevel: threat.severity,
            type: threat.type,
            token: token ? `${token.substring(0, 15)}...` : undefined,
            userId: userId,
            method: req.method,
            route: req.originalUrl || req.url,
            details: threat.details
        };

        this.data.recentIntrusions.unshift(newIntrusion);
        if (this.data.recentIntrusions.length > 50) {
            this.data.recentIntrusions = this.data.recentIntrusions.slice(0, 50);
        }
        this.incrementIntrusion();
    }

    public logSystemError(error: any, req: Request) {
        const newError: SystemError = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            method: req.method,
            route: req.originalUrl || req.url,
            message: error.message || 'Unknown Error',
            stack: error.stack
        };
        this.data.recentSystemErrors.unshift(newError);
        if (this.data.recentSystemErrors.length > 50) {
            this.data.recentSystemErrors = this.data.recentSystemErrors.slice(0, 50);
        }
        this.incrementServerError();
    }

    public getStats() {
        return {
            ...this.data,
            failedRequests: this.data.clientErrors + this.data.serverErrors
        };
    }

    public dispose() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        this.saveSync(); // Force save on exit to prevent data loss
    }
}

export const requestsService = new RequestsService();
