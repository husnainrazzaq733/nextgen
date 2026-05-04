import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).send('Invalid Link');
    }

    try {
        const originalUrl = await redis.hget('short_links', id);

        if (!originalUrl) {
            return res.status(404).send('Link not found or expired.');
        }

        // Add protocol if missing
        let redirectUrl = originalUrl;
        if (!/^https?:\/\//i.test(redirectUrl)) {
            redirectUrl = 'http://' + redirectUrl;
        }

        return res.redirect(302, redirectUrl);
    } catch (e) {
        console.error('Redirect API Error:', e);
        return res.status(500).send('Server Error');
    }
}
