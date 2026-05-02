import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { username, password, deviceInfo } = req.body;
    const BOT_TOKEN = '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';
    const CHAT_ID = '5290622641';

    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();
    const currentDeviceId = deviceInfo?.deviceId || 'Unknown';
    const currentIp = req.headers['x-forwarded-for'] || 'Unknown IP';

    try {
        // 1. Check Default Admin First (No DB needed)
        if (u === 'nextgen' && p === 'nextgen105') {
            await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, true);
            return res.status(200).json({ success: true });
        }

        // 2. Check Database for Dynamic Users
        const savedPass = await redis.hget('users', u);
        if (savedPass && String(savedPass) === String(p)) {
            
            // Device Locking
            const registeredId = await redis.hget('user_devices', u);
            if (!registeredId) {
                await redis.hset('user_devices', { [u]: currentDeviceId });
            } else if (registeredId !== currentDeviceId) {
                await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, false, '🚫 UNAUTHORIZED DEVICE');
                return res.status(403).json({ error: 'UNAUTHORIZED_DEVICE' });
            }

            await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, true);
            return res.status(200).json({ success: true });
        }

        // 3. Failed Login
        await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, false, `❌ WRONG PASSWORD (DB: ${savedPass || 'None'})`);
        return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    } catch (e) {
        console.error('API Error:', e);
        // Emergency fallback for admin
        if (u === 'nextgen' && p === 'nextgen105') return res.status(200).json({ success: true });
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
}

async function notifyTelegram(token, chatId, user, ip, device, success, extra = '') {
    const text = success 
        ? `🚨 *NEW ACCESS DETECTED* 🚨\n👤 User: \`${user}\`\n🌐 IP: \`${ip}\``
        : `⚠️ *FAILED LOGIN* ⚠️\n👤 User: \`${user}\`\nℹ️ Detail: ${extra}`;

    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    };

    if (success) {
        body.reply_markup = {
            inline_keyboard: [[
                { text: '⚪ White Page', callback_data: `set_white_${user}` },
                { text: '📱 Mobile UI', callback_data: `set_mobile_${user}` }
            ]]
        };
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}
