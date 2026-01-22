import { Request, Response } from 'express';
import os from 'os';
import { statfs } from 'fs/promises';
import { logger } from '../../config/logger.js';

let cachedDiskUsage: any = null;
let diskUsageLastUpdated = 0;
const DISK_CACHE_DURATION = 5 * 60 * 1000; 
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getCpuUsage = async () => {
    const cpusStart = os.cpus();
    await wait(100);
    const cpusEnd = os.cpus();
    let idle = 0;
    let total = 0;
    cpusStart.forEach((cpu, i) => {
        const start = cpu.times;
        const end = cpusEnd[i].times;

        const idleDiff = end.idle - start.idle;
        const totalDiff = (end.user + end.nice + end.sys + end.idle + end.irq) -
            (start.user + start.nice + start.sys + start.idle + start.irq);

        idle += idleDiff;
        total += totalDiff;
    });

    const usedPercentage = total > 0 ? ((total - idle) / total) * 100 : 0;
    return usedPercentage;
};

const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

const getSystemStats = async () => {
    const cpuUsagePromise = getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percent: (usedMem / totalMem) * 100,
        formatted: {
            total: formatBytes(totalMem),
            used: formatBytes(usedMem),
            free: formatBytes(freeMem)
        },
        process: {
            rss: process.memoryUsage().rss,
            heapTotal: process.memoryUsage().heapTotal,
            heapUsed: process.memoryUsage().heapUsed,
            formatted: {
                rss: formatBytes(process.memoryUsage().rss),
                heapUsed: formatBytes(process.memoryUsage().heapUsed)
            }
        }
    };
    let diskUsage = cachedDiskUsage;
    const now = Date.now();
    if (!diskUsage || (now - diskUsageLastUpdated) > DISK_CACHE_DURATION) {
        diskUsage = { total: 0, used: 0, free: 0, percent: 0, formatted: { total: 'N/A', used: 'N/A', free: 'N/A' } };
        try {
            const stats = await statfs(process.cwd());
            const totalDisk = stats.bsize * stats.blocks;
            const availableDisk = stats.bsize * stats.bavail;
            const usedDisk = totalDisk - availableDisk;
            diskUsage = {
                total: totalDisk,
                used: usedDisk,
                free: availableDisk, 
                percent: (usedDisk / totalDisk) * 100,
                formatted: {
                    total: formatBytes(totalDisk),
                    used: formatBytes(usedDisk),
                    free: formatBytes(availableDisk)
                }
            };
            cachedDiskUsage = diskUsage;
            diskUsageLastUpdated = now;
        } catch (err) {
            logger.warn('Failed to get disk stats', err);
        }
    }
    const uptimeSeconds = process.uptime();
    const uptime = formatUptime(uptimeSeconds);
    const cpuUsage = await cpuUsagePromise;
    return {
        cpu: cpuUsage,
        memory: memUsage,
        disk: diskUsage,
        uptime: uptime,
        timestamp: new Date().toISOString(),
        serviceName: process.env.SERVICE_NAME || 'Core-X Service'
    };
};

const getRealtimeStats = async () => {
    const cpuUsagePromise = getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percent: (usedMem / totalMem) * 100,
        formatted: {
            total: formatBytes(totalMem),
            used: formatBytes(usedMem),
            free: formatBytes(freeMem)
        },
        process: {
            rss: process.memoryUsage().rss,
            heapTotal: process.memoryUsage().heapTotal,
            heapUsed: process.memoryUsage().heapUsed,
            formatted: {
                rss: formatBytes(process.memoryUsage().rss),
                heapUsed: formatBytes(process.memoryUsage().heapUsed)
            }
        }
    };
    const uptimeSeconds = process.uptime();
    const uptime = formatUptime(uptimeSeconds);
    const cpuUsage = await cpuUsagePromise;
    return {
        cpu: cpuUsage,
        memory: memUsage,
        uptime: uptime,
        timestamp: new Date().toISOString(),
        serviceName: process.env.SERVICE_NAME || 'Core-X Service'
    };
};


export const getStatsJson = async (req: Request, res: Response) => {
    try {
        const stats = await getSystemStats();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(stats);
    } catch (error) {
        logger.error('Stats Data Error', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};


export const getRealtimeStatsJson = async (req: Request, res: Response) => {
    try {
        const stats = await getRealtimeStats();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(stats);
    } catch (error) {
        logger.error('Realtime Stats Data Error', error);
        res.status(500).json({ error: 'Failed to fetch realtime stats' });
    }
};
