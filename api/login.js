import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { username, password, deviceInfo } = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8929507323:AAG3whvK92MuhmaPX2OI0HEP82ejxnQGYKQ';
    const CHAT_ID = '5290622641';

    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();
    const currentDeviceId = deviceInfo?.deviceId || 'Unknown';
    const currentIp = req.headers['x-forwarded-for'] || 'Unknown IP';

    try {
        // 1. Get Password from Redis
        const savedPass = await redis.hget('users', u);
        
        // 2. Validate Credentials
        const isDefaultAdmin = (u === 'nextgen' && p === 'nextgen105');
        const isDynamicUser = (savedPass && String(savedPass) === String(p));

        if (!isDefaultAdmin && !isDynamicUser) {
            await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, false, '❌ INCORRECT PASSWORD');
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        // 3. Device Locking (Skip for default admin)
        if (!isDefaultAdmin) {
            const registeredId = await redis.hget('user_devices', u);
            if (!registeredId) {
                await redis.hset('user_devices', { [u]: currentDeviceId });
            } else if (registeredId !== currentDeviceId) {
                await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, false, '🚫 UNAUTHORIZED DEVICE BLOCKED');
                // Return 403 and a clear error string
                return res.status(403).json({ error: 'UNAUTHORIZED_DEVICE' });
            }
        }

        // 4. Check for Saved State
        const savedState = await redis.hget('user_states', u);

        // 5. Success Path
        await notifyTelegram(BOT_TOKEN, CHAT_ID, u, currentIp, deviceInfo, true, savedState);
        return res.status(200).json({ success: true, savedState: savedState });

    } catch (e) {
        console.error('API Error:', e);
        if (u === 'nextgen' && p === 'nextgen105') return res.status(200).json({ success: true });
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
}

async function notifyTelegram(token, chatId, user, ip, device, success, savedState = '') {
    const text = success 
        ? `🚨 *NEW ACCESS DETECTED* 🚨\n👤 User: \`${user}\`\n🌐 IP: \`${ip}\`\n📱 Device: ${device?.device || 'Unknown'}\n⏱️ Auto-Applied: ${savedState || 'None'}`
        : `⚠️ *LOGIN ALERT* ⚠️\n👤 User: \`${user}\`\nℹ️ Status: ${savedState}`;

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
