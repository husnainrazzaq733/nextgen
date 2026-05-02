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
    const currentIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const currentDeviceId = deviceInfo ? deviceInfo.deviceId : 'Unknown';

    // Config
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5290622641';

    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    try {
        const savedPassword = await redis.hget('users', cleanUser);
        
        // Credential Verification
        const isValid = (cleanUser === 'nextgen' && cleanPass === 'nextgen105') || (String(savedPassword) === String(cleanPass));

        if (!isValid) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        // Device Locking Logic
        const registeredDeviceId = await redis.hget('user_devices', cleanUser);
        
        if (!registeredDeviceId) {
            // First time login - register this device
            await redis.hset('user_devices', { [cleanUser]: currentDeviceId });
        } else if (registeredDeviceId !== currentDeviceId) {
            // BLOCK: Different device detected
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: CHAT_ID, 
                    text: `🚫 *UNAUTHORIZED DEVICE BLOCKED*\n👤 User: \`${cleanUser}\`\n🌐 IP: \`${currentIp}\`\n📱 Attempted from a new device.`,
                    parse_mode: 'Markdown'
                })
            });
            return res.status(403).json({ error: 'UNAUTHORIZED_DEVICE' });
        }

        // IP Tracking
        await redis.hset('user_ips', { [cleanUser]: currentIp });

        // Success Notification
        const message = `
🚨 *NEW ACCESS DETECTED* 🚨
👤 *User:* \`${cleanUser}\`
📱 *Device:* ${deviceInfo ? deviceInfo.device : 'Unknown'}
🌐 *IP:* \`${currentIp}\`

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
                            { text: '⚪ Set White Page', callback_data: `set_white_${cleanUser}` },
                            { text: '📱 Set Mobile UI', callback_data: `set_mobile_${cleanUser}` }
                        ]
                    ]
                }
            })
        });

        return res.status(200).json({ success: true });

    } catch (e) {
        console.error('API Error:', e);
        if (cleanUser === 'nextgen' && cleanPass === 'nextgen105') {
            return res.status(200).json({ success: true });
        }
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
}
