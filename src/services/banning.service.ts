import { adminDB } from '../config/supabase.js';
import { logger } from '../config/logger.js';

class BanningService {
    private blacklistedIps: Set<string> = new Set();
    private bannedUsers: Set<string> = new Set();
    private revokedTokens: Set<string> = new Set();
    private refreshInterval: NodeJS.Timeout | null = null;
    private readonly CACHE_TTL = 60000; // 60 seconds

    constructor() {
        this.refresh();
        this.startAutoRefresh();
    }

    private startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.refresh(), this.CACHE_TTL);
    }

    public stopAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
    }

    public async refresh() {
        try {
            const { data: ips, error: ipError } = await adminDB
                .from('blacklisted_ips')
                .select('ip_address');
            if (ipError) throw ipError;
            const { data: users, error: userError } = await adminDB
                .from('banned_users')
                .select('user_id');
            if (userError) throw userError;
            const { data: tokens, error: tokenError } = await adminDB
                .from('revoked_tokens')
                .select('token_signature');
            if (tokenError) throw tokenError;
            this.blacklistedIps = new Set(ips?.map((row: any) => row.ip_address) || []);
            this.bannedUsers = new Set(users?.map((row: any) => row.user_id) || []);
            this.revokedTokens = new Set(tokens?.map((row: any) => row.token_signature) || []);
            logger.info('Banning/Security lists refreshed successfully', {
                ips: this.blacklistedIps.size,
                users: this.bannedUsers.size,
                tokens: this.revokedTokens.size
            });

        } catch (error: any) {
            logger.error('Failed to refresh banning lists from Supabase', { message: error.message });
        }
    }

    public async banIp(ip: string, reason: string) {
        try {
            const normalizedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
            if (this.blacklistedIps.has(normalizedIp)) return;
            const { error } = await adminDB
                .from('blacklisted_ips')
                .insert({
                    ip_address: normalizedIp,
                    reason: reason || 'Automated Ban'
                });

            if (error) throw error;
            this.blacklistedIps.add(normalizedIp);
            logger.warn(`🚫 IP Banned Automatically: ${normalizedIp} | Reason: ${reason}`);
        } catch (error: any) {
            logger.error('Failed to ban IP via Supabase', { error: error.message });
            throw error;
        }
    }

    public async banUser(userId: string, reason: string) {
        try {
            if (this.bannedUsers.has(userId)) return;
            const { error } = await adminDB
                .from('banned_users')
                .insert({
                    user_id: userId,
                    reason: reason || 'Manual Ban'
                });

            if (error) throw error;
            this.bannedUsers.add(userId);
            logger.warn(`🚫 User Banned: ${userId} | Reason: ${reason}`);
        } catch (error: any) {
            logger.error('Failed to ban User via Supabase', { error: error.message });
            throw error;
        }
    }

    public async revokeToken(token: string, reason: string) {
        try {
            if (this.revokedTokens.has(token)) return;
            const { error } = await adminDB
                .from('revoked_tokens')
                .insert({
                    token_signature: token,
                    reason: reason || 'Security Revocation'
                });
            if (error) throw error;
            this.revokedTokens.add(token);
            logger.warn(`🚫 Token Revoked: ${token.substring(0, 15)}...`);
        } catch (error: any) {
            logger.error('Failed to revoke Token via Supabase', { error: error.message });
            throw error;
        }
    }

    public async unbanIp(ip: string) {
        try {
            const normalizedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
            const { error } = await adminDB
                .from('blacklisted_ips')
                .delete()
                .eq('ip_address', normalizedIp);

            if (error) throw error;
            this.blacklistedIps.delete(normalizedIp);
            logger.info(`✅ IP Unbanned: ${normalizedIp}`);
        } catch (error: any) {
            logger.error('Failed to unban IP', { error: error.message });
            throw error;
        }
    }

    public async unbanUser(userId: string) {
        try {
            const { error } = await adminDB
                .from('banned_users')
                .delete()
                .eq('user_id', userId);
            if (error) throw error;
            this.bannedUsers.delete(userId);
            logger.info(`✅ User Unbanned: ${userId}`);
        } catch (error: any) {
            logger.error('Failed to unban User', { error: error.message });
            throw error;
        }
    }

    public async unrevokeToken(token: string) {
        try {
            const { error } = await adminDB
                .from('revoked_tokens')
                .delete()
                .eq('token_signature', token);
            if (error) throw error;
            this.revokedTokens.delete(token);
            logger.info(`✅ Token Restored: ${token.substring(0, 15)}...`);
        } catch (error: any) {
            logger.error('Failed to restore Token', { error: error.message });
            throw error;
        }
    }

    public getBlacklistedIps() { return Array.from(this.blacklistedIps); }
    public getBannedUsers() { return Array.from(this.bannedUsers); }
    public getRevokedTokens() { return Array.from(this.revokedTokens); }

    public isIpBanned(ip: string): boolean {
        const normalizedIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
        return this.blacklistedIps.has(normalizedIp);
    }

    public isUserBanned(userId: string): boolean {
        return this.bannedUsers.has(userId);
    }

    public isTokenRevoked(token: string): boolean {
        return this.revokedTokens.has(token);
    }
}

export const banningService = new BanningService();
