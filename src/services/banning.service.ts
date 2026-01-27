import { adminDB } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { redis } from '../config/redis.js';

class BanningService {
    // Redis Hash Keys
    private readonly REDIS_HASH_IPS = 'banned:ips';
    private readonly REDIS_HASH_USERS = 'banned:users';
    private readonly REDIS_HASH_TOKENS = 'revoked:tokens';

    private syncInterval: NodeJS.Timeout | null = null;
    private readonly SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 Hour

    constructor() {
        // Start background sync
        this.startSync();
    }

    private startSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => this.syncToDb(), this.SYNC_INTERVAL_MS);
        logger.info('⏰ Banning Service: Background sync scheduled (Every 1 hour)');
    }

    public stopSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
    }


    public async restoreFromDb() {
        try {
            logger.info('📥 Restoring Banning Lists from DB to Redis...');
            const { data: ips } = await adminDB.from('blacklisted_ips').select('ip_address, reason');
            const { data: users } = await adminDB.from('banned_users').select('user_id, reason');
            const { data: tokens } = await adminDB.from('revoked_tokens').select('token_signature, reason');

            const pipeline = redis.pipeline();

            if (ips && ips.length > 0) {
                const ipMap = new Map();
                ips.forEach((r: any) => ipMap.set(r.ip_address, r.reason || 'Imported'));
                pipeline.hmset(this.REDIS_HASH_IPS, ipMap);
            }

            if (users && users.length > 0) {
                const userMap = new Map();
                users.forEach((r: any) => userMap.set(r.user_id, r.reason || 'Imported'));
                pipeline.hmset(this.REDIS_HASH_USERS, userMap);
            }

            if (tokens && tokens.length > 0) {
                const tokenMap = new Map();
                tokens.forEach((r: any) => tokenMap.set(r.token_signature, r.reason || 'Imported'));
                pipeline.hmset(this.REDIS_HASH_TOKENS, tokenMap);
            }

            await pipeline.exec();
            logger.info('✅ Restoration Complete: defined bans loaded into Redis.');

        } catch (error: any) {
            logger.error('❌ Failed to restore banning lists from DB', { error: error.message });
        }
    }

    public async syncToDb() {
        try {
            logger.info('📤 Syncing (Backup) Banning Lists from Redis to DB...');

            const ipData = await redis.hgetall(this.REDIS_HASH_IPS);
            const userData = await redis.hgetall(this.REDIS_HASH_USERS);
            const tokenData = await redis.hgetall(this.REDIS_HASH_TOKENS);
            const ipPayload = Object.entries(ipData).map(([ip, reason]) => ({
                ip_address: ip,
                reason: reason
            }));

            const userPayload = Object.entries(userData).map(([userId, reason]) => ({
                user_id: userId,
                reason: reason
            }));

            const tokenPayload = Object.entries(tokenData).map(([token, reason]) => ({
                token_signature: token,
                reason: reason
            }));

            const promises = [];

            if (ipPayload.length > 0) {
                promises.push(adminDB.from('blacklisted_ips').upsert(ipPayload, { onConflict: 'ip_address' }));
            }
            if (userPayload.length > 0) {
                promises.push(adminDB.from('banned_users').upsert(userPayload, { onConflict: 'user_id' }));
            }
            if (tokenPayload.length > 0) {
                promises.push(adminDB.from('revoked_tokens').upsert(tokenPayload, { onConflict: 'token_signature' }));
            }

            const results = await Promise.all(promises);
            const errors = results.filter(r => r.error);

            if (errors.length > 0) {
                logger.error('⚠️ Some sync operations failed', { errors });
            } else {
                logger.info('✅ Banning lists successfully backed up to Supabase.');
            }

        } catch (error: any) {
            logger.error('❌ Failed to sync banning lists to DB', { error: error.message });
        }
    }

    // --- IPS ---
    public async banIp(ip: string, reason: string = 'Automated Ban') {
        const normalizedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
        try {
            await Promise.all([
                redis.hset(this.REDIS_HASH_IPS, normalizedIp, reason),
                adminDB.from('blacklisted_ips').upsert({ ip_address: normalizedIp, reason }, { onConflict: 'ip_address' })
            ]);
            logger.warn(`🚫 IP Banned (Redis + DB): ${normalizedIp}`);
        } catch (error: any) {
            logger.error(`Failed to ban IP: ${normalizedIp}`, { error: error.message });
            throw error; // Re-throw to inform controller
        }
    }

    public async unbanIp(ip: string) {
        const normalizedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
        try {
            await Promise.all([
                redis.hdel(this.REDIS_HASH_IPS, normalizedIp),
                adminDB.from('blacklisted_ips').delete().eq('ip_address', normalizedIp)
            ]);
            logger.info(`✅ IP Unbanned (Redis + DB): ${normalizedIp}`);
        } catch (error: any) {
            logger.error(`Failed to unban IP: ${normalizedIp}`, { error: error.message });
            throw error;
        }
    }

    public async isIpBanned(ip: string): Promise<boolean> {
        const normalizedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
        return (await redis.hexists(this.REDIS_HASH_IPS, normalizedIp)) === 1;
    }

    // --- USERS ---
    public async banUser(userId: string, reason: string = 'Manual Ban') {
        try {
            await Promise.all([
                redis.hset(this.REDIS_HASH_USERS, userId, reason),
                adminDB.from('banned_users').upsert({ user_id: userId, reason }, { onConflict: 'user_id' })
            ]);
            logger.warn(`🚫 User Banned (Redis + DB): ${userId}`);
        } catch (error: any) {
            logger.error(`Failed to ban User: ${userId}`, { error: error.message });
            throw error;
        }
    }

    public async unbanUser(userId: string) {
        try {
            await Promise.all([
                redis.hdel(this.REDIS_HASH_USERS, userId),
                adminDB.from('banned_users').delete().eq('user_id', userId)
            ]);
            logger.info(`✅ User Unbanned (Redis + DB): ${userId}`);
        } catch (error: any) {
            logger.error(`Failed to unban User: ${userId}`, { error: error.message });
            throw error;
        }
    }

    public async isUserBanned(userId: string): Promise<boolean> {
        return (await redis.hexists(this.REDIS_HASH_USERS, userId)) === 1;
    }

    // --- TOKENS ---
    public async revokeToken(token: string, reason: string = 'Security Revocation') {
        try {
            await Promise.all([
                redis.hset(this.REDIS_HASH_TOKENS, token, reason),
                adminDB.from('revoked_tokens').upsert({ token_signature: token, reason }, { onConflict: 'token_signature' })
            ]);
            logger.warn(`🚫 Token Revoked (Redis + DB)`);
        } catch (error: any) {
            logger.error(`Failed to revoke Token`, { error: error.message });
            throw error;
        }
    }

    public async unrevokeToken(token: string) {
        try {
            await Promise.all([
                redis.hdel(this.REDIS_HASH_TOKENS, token),
                adminDB.from('revoked_tokens').delete().eq('token_signature', token)
            ]);
            logger.info(`✅ Token Restored (Redis + DB)`);
        } catch (error: any) {
            logger.error(`Failed to restore Token`, { error: error.message });
            throw error;
        }
    }

    public async isTokenRevoked(token: string): Promise<boolean> {
        return (await redis.hexists(this.REDIS_HASH_TOKENS, token)) === 1;
    }

    // --- GETTERS (For Admin UI) ---
    public async getBlacklistedIps() {
        return await redis.hgetall(this.REDIS_HASH_IPS);
    }

    public async getBannedUsers() {
        return await redis.hgetall(this.REDIS_HASH_USERS);
    }

    public async getRevokedTokens() {
        return await redis.hgetall(this.REDIS_HASH_TOKENS);
    }
}

export const banningService = new BanningService();
