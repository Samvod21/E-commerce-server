const { createClient } = require('redis');

const redisUrl = process.env.REDIS_URL;
const redisClient = createClient({
    url: redisUrl
});

redisClient.on('error', (error) => {
    if (isReady) {
        console.warn('Redis error; continuing without cache:', error.message);
    }
});

let isReady = false;

const connectCache = async () => {
    if (!redisUrl) {
        console.log('Redis disabled; set REDIS_URL to enable caching');
        return;
    }

    try {
        await redisClient.connect();
        isReady = true;
        console.log('Redis connected successfully');
    } catch (error) {
        console.warn('Redis connection failed; continuing without cache:', error.message);
    }
};

const get = async (key) => {
    if (!isReady) return null;
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.warn(`Redis read failed for ${key}:`, error.message);
        return null;
    }
};

const set = async (key, value, ttlSeconds = 300) => {
    if (!isReady) return;
    try {
        await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
        console.warn(`Redis write failed for ${key}:`, error.message);
    }
};

const del = async (...keys) => {
    if (!isReady || keys.length === 0) return;
    try {
        await redisClient.del(keys);
    } catch (error) {
        console.warn('Redis invalidation failed:', error.message);
    }
};

const delByPattern = async (pattern) => {
    if (!isReady) return;
    try {
        const keys = [];
        for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
            keys.push(key);
        }
        await del(...keys);
    } catch (error) {
        console.warn(`Redis pattern invalidation failed for ${pattern}:`, error.message);
    }
};

module.exports = { connectCache, get, set, del, delByPattern };