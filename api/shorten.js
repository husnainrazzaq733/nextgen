import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const HACKER_PREFIXES = [
    'system-override',
    'secure-bypass',
    'unauthorized-access',
    'root-kit',
    'data-leak',
    'security-vulnerability',
    'terminal-remote',
    'decrypt-session',
    'admin-exploit',
    'network-breach'
];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { url, maskType } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const prefix = maskType || HACKER_PREFIXES[Math.floor(Math.random() * HACKER_PREFIXES.length)];
        const randomHex = Math.random().toString(16).substring(2, 6);
        const shortId = `${prefix}-0x${randomHex}`;

        // Store mapping in Redis (expire in 30 days)
        await redis.hset('short_links', { [shortId]: url });
        
        // Construct the shortened URL
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers['host'];
        const shortUrl = `${protocol}://${host}/api/l?id=${shortId}`;

        return res.status(200).json({ 
            success: true, 
            shortId, 
            shortUrl 
        });
    } catch (e) {
        console.error('Shorten API Error:', e);
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
}
