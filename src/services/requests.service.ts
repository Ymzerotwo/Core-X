import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';
import { Request } from 'express';
import { redis } from '../config/redis.js';

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

class RequestsService {
    private readonly KEY_COUNTS = 'stats:counts';
    private readonly KEY_LOGS_SYSTEM = 'stats:logs:system_errors';
    private readonly KEY_LOGS_CLIENT = 'stats:logs:client_errors';
    private readonly KEY_LOGS_INTRUSION = 'stats:logs:intrusions';
    private syncInterval: NodeJS.Timeout | null = null;
    private readonly SAVE_DELAY = 60000; 
    constructor() {
        this.init();
    }

    private init() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        this.startSync();
    }

    private startSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => this.syncToLocal(), this.SAVE_DELAY);
    }

    public async restoreFromLocal() {
        const acquired = await this.acquireLock('lock:restore_requests', 10000);
        if (!acquired) return; 

        try {
            if (fs.existsSync(REQUESTS_FILE)) {
                logger.info('📥 Restoring Requests Data from Local File...');
                const fileContent = fs.readFileSync(REQUESTS_FILE, 'utf-8');
                const data: RequestsData = JSON.parse(fileContent);

                const pipeline = redis.pipeline();

                pipeline.hset(this.KEY_COUNTS, {
                    totalRequests: data.totalRequests || 0,
                    successfulRequests: data.successfulRequests || 0,
                    clientErrors: data.clientErrors || 0,
                    serverErrors: data.serverErrors || 0,
                    intrusionAttempts: data.intrusionAttempts || 0
                });

                pipeline.del(this.KEY_LOGS_SYSTEM);
                pipeline.del(this.KEY_LOGS_CLIENT);
                pipeline.del(this.KEY_LOGS_INTRUSION);

                if (data.recentSystemErrors?.length) {
                    const logs = data.recentSystemErrors.map(l => JSON.stringify(l));
                    pipeline.rpush(this.KEY_LOGS_SYSTEM, ...logs);
                }
                if (data.recentClientErrors?.length) {
                    const logs = data.recentClientErrors.map(l => JSON.stringify(l));
                    pipeline.rpush(this.KEY_LOGS_CLIENT, ...logs);
                }
                if (data.recentIntrusions?.length) {
                    const logs = data.recentIntrusions.map(l => JSON.stringify(l));
                    pipeline.rpush(this.KEY_LOGS_INTRUSION, ...logs);
                }

                await pipeline.exec();
                logger.info('✅ Requests Data Restored to Redis.');
            }
        } catch (error) {
            logger.error('Failed to restore requests data', error);
        } finally {
            await this.releaseLock('lock:restore_requests');
        }
    }

    public async syncToLocal() {
        const acquired = await this.acquireLock('lock:sync_requests', 5000);
        if (!acquired) return;

        try {
            const counts = await redis.hgetall(this.KEY_COUNTS);
            const systemErrors = await redis.lrange(this.KEY_LOGS_SYSTEM, 0, 49);
            const clientErrors = await redis.lrange(this.KEY_LOGS_CLIENT, 0, 49);
            const intrusions = await redis.lrange(this.KEY_LOGS_INTRUSION, 0, 49);

            const data: RequestsData = {
                totalRequests: parseInt(counts.totalRequests || '0'),
                successfulRequests: parseInt(counts.successfulRequests || '0'),
                clientErrors: parseInt(counts.clientErrors || '0'),
                serverErrors: parseInt(counts.serverErrors || '0'),
                intrusionAttempts: parseInt(counts.intrusionAttempts || '0'),
                recentSystemErrors: systemErrors.map(s => JSON.parse(s)),
                recentClientErrors: clientErrors.map(s => JSON.parse(s)),
                recentIntrusions: intrusions.map(s => JSON.parse(s))
            };

            fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2));
            // logger.debug('💾 Requests Data Synced to Local File');
        } catch (error) {
            logger.error('Failed to sync requests data to local file', error);
        } finally {
            await this.releaseLock('lock:sync_requests');
        }
    }

    public incrementTotal() { this.safeHIncr(this.KEY_COUNTS, 'totalRequests'); }
    public incrementSuccess() { this.safeHIncr(this.KEY_COUNTS, 'successfulRequests'); }
    public incrementClientError() { this.safeHIncr(this.KEY_COUNTS, 'clientErrors'); }
    public incrementServerError() { this.safeHIncr(this.KEY_COUNTS, 'serverErrors'); }
    public incrementIntrusion() { this.safeHIncr(this.KEY_COUNTS, 'intrusionAttempts'); }

    private safeHIncr(key: string, field: string) {
        redis.hincrby(key, field, 1).catch(err => logger.error(`Redis Incr Failed: ${field}`, err));
    }

    public logClientWarning(req: Request, statusCode: number, message?: string) {
        const newError: SystemError = {
            id: this.genId(),
            timestamp: new Date().toISOString(),
            method: req.method,
            route: req.originalUrl || req.url,
            message: message || `Client Error ${statusCode}`,
        };
        this.pushLog(this.KEY_LOGS_CLIENT, newError);
        this.incrementClientError();
    }

    public logIntrusion(req: Request, threat: { severity: string, type: string, details?: string }) {
        const token = req.signedCookies ? req.signedCookies['access_token'] : undefined;
        const userId = (req as any).user?.id;

        const newIntrusion: IntrusionEvent = {
            id: this.genId(),
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

        this.pushLog(this.KEY_LOGS_INTRUSION, newIntrusion);
        this.incrementIntrusion();
    }

    public logSystemError(error: any, req: Request) {
        const newError: SystemError = {
            id: this.genId(),
            timestamp: new Date().toISOString(),
            method: req.method,
            route: req.originalUrl || req.url,
            message: error.message || 'Unknown Error',
            stack: error.stack
        };
        this.pushLog(this.KEY_LOGS_SYSTEM, newError);
        this.incrementServerError();
    }

    private pushLog(key: string, item: any) {
        redis.pipeline()
            .lpush(key, JSON.stringify(item))
            .ltrim(key, 0, 49) 
            .exec()
            .catch(err => logger.error('Redis Log Failed', err));
    }

    public async getStats() {
        const counts = await redis.hgetall(this.KEY_COUNTS);
        const failed = parseInt(counts.clientErrors || '0') + parseInt(counts.serverErrors || '0');
        return {
            totalRequests: parseInt(counts.totalRequests || '0'),
            successfulRequests: parseInt(counts.successfulRequests || '0'),
            clientErrors: parseInt(counts.clientErrors || '0'),
            serverErrors: parseInt(counts.serverErrors || '0'),
            intrusionAttempts: parseInt(counts.intrusionAttempts || '0'),
            failedRequests: failed,
            // Stats call typically needs simple counts, full logs might be separate call
            // If full dumps needed, implement separate getter
        };
    }

    public async dispose() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        await this.syncToLocal();
    }

    // --- Helpers ---

    private genId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private async acquireLock(key: string, ttl: number): Promise<boolean> {
        const result = await redis.set(key, 'locked', 'PX', ttl, 'NX');
        return result === 'OK';
    }

    private async releaseLock(key: string) {
        await redis.del(key);
    }
}

export const requestsService = new RequestsService();
