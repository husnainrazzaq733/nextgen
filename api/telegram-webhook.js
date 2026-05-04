const Pusher = require('pusher');
const { Redis } = require('@upstash/redis');
const fetch = require('node-fetch');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || '2149356',
    key: process.env.PUSHER_KEY || '5628e828c0ecf46c7de1',
    secret: process.env.PUSHER_SECRET || 'c3f522d273a4f329faa3',
    cluster: process.env.PUSHER_CLUSTER || 'ap1',
    useTLS: true
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    const body = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';

    // 1. Handle Messages / Commands
    if (body.message && body.message.text) {
        const text = body.message.text;
        const chatId = body.message.chat.id;

        if (text === '/start' || text === '/help') {
            const helpText = `
🚀 *NEXTGEN ADMIN BOT* 🚀

Available Commands:
👤 \`/add_user user pass\` - Add new user
👥 \`/list_users\` - Control specific users
🗑️ \`/clear_users\` - Delete all users
🔍 \`/check_db\` - Check database
🔗 \`/shortlink\` - Shorten your main website URL
🔗 *Send any URL* - To generate a hacker-themed short link
            `;
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: helpText, parse_mode: 'Markdown' })
            });
            return res.status(200).send('OK');
        }

        if (text === '/check_db') {
            try {
                await redis.set('test_ping', 'pong');
                const status = (await redis.get('test_ping')) === 'pong' ? '✅ *DATABASE ONLINE*' : '❌ *DATABASE ERROR*';
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: status, parse_mode: 'Markdown' })
                });
            } catch (e) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: `❌ *CONNECTION FAILED*\n${e.message}`, parse_mode: 'Markdown' })
                });
            }
            return res.status(200).send('OK');
        }

        if (text.startsWith('/add_user')) {
            const parts = text.split(' ');
            if (parts.length === 3) {
                const u = parts[1].toLowerCase();
                const p = parts[2];
                await redis.hset('users', { [u]: p });
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: `✅ *USER ADDED:* \`${u}\``, parse_mode: 'Markdown' })
                });
            }
            return res.status(200).send('OK');
        }

        if (text.startsWith('/reset_user')) {
            const parts = text.split(' ');
            if (parts.length === 2) {
                const u = parts[1].toLowerCase();
                await redis.hdel('user_devices', u);
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: `🔄 *DEVICE RESET:* \`${u}\` can now login from a new device.`, parse_mode: 'Markdown' })
                });
            }
            return res.status(200).send('OK');
        }

        if (text === '/list_users' || text === '/show_users') {
            const allUsers = await redis.hgetall('users');
            if (!allUsers || Object.keys(allUsers).length === 0) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: '❌ No users found.', parse_mode: 'Markdown' })
                });
            } else {
                const keyboard = Object.keys(allUsers).map(u => ([{ text: `👤 Control ${u}`, callback_data: `ctrl_${u}` }]));
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        chat_id: chatId, 
                        text: '👥 *SELECT USER TO CONTROL:*', 
                        parse_mode: 'Markdown',
                        reply_markup: { inline_keyboard: keyboard }
                    })
                });
            }
            return res.status(200).send('OK');
        }

        if (text === '/clear_users') {
            await redis.del('users');
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: '🗑️ *ALL USERS DELETED*', parse_mode: 'Markdown' })
            });
            return res.status(200).send('OK');
        }

        if (text === '/shortlink') {
            const longUrl = 'https://nextgen-ruddy.vercel.app/';
            const hackerPrefixes = ['system-override', 'secure-bypass', 'root-kit', 'unauthorized-access', 'data-leak', 'server-root'];
            const prefix = hackerPrefixes[Math.floor(Math.random() * hackerPrefixes.length)];
            const randomHex = Math.random().toString(16).substring(2, 6);
            const shortId = `${prefix}-0x${randomHex}`;

            try {
                await redis.hset('short_links', { [shortId]: longUrl });
                const host = req.headers['host'];
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const shortUrl = `${protocol}://${host}/verify/${shortId}`;

                const responseText = `🚨 *SYSTEM LINK SHORTENED* 🚨\n\nTarget: \`${longUrl}\`\n\n*Hacker Link:* \`${shortUrl}\``;
                
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: responseText, parse_mode: 'Markdown' })
                });
            } catch (err) {
                console.error('Bot /shortlink Error:', err);
            }
            return res.status(200).send('OK');
        }

        // 3. Auto-Shorten URL
        const urlRegex = /^(https?:\/\/[^\s]+)$/;
        if (urlRegex.test(text.trim())) {
            const longUrl = text.trim();
            const hackerPrefixes = ['system-override', 'secure-bypass', 'root-kit', 'unauthorized-access', 'data-leak'];
            const prefix = hackerPrefixes[Math.floor(Math.random() * hackerPrefixes.length)];
            const randomHex = Math.random().toString(16).substring(2, 6);
            const shortId = `${prefix}-0x${randomHex}`;

            try {
                await redis.hset('short_links', { [shortId]: longUrl });
                const host = req.headers['host'];
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const shortUrl = `${protocol}://${host}/verify/${shortId}`;

                const responseText = `🔗 *HACKER LINK GENERATED* 🔗\n\nOriginal: \`${longUrl}\`\n\n*Shortened:* \`${shortUrl}\``;
                
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: responseText, parse_mode: 'Markdown' })
                });
            } catch (err) {
                console.error('Bot Shorten Error:', err);
            }
            return res.status(200).send('OK');
        }
    }

    // 2. Handle Callback Queries (Buttons)
    if (body.callback_query) {
        const action = body.callback_query.data;
        const chatId = body.callback_query.message.chat.id;

        if (action.startsWith('ctrl_')) {
            const user = action.replace('ctrl_', '');
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `📱 *CONTROL:* \`${user}\`\nSelect screen:`,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '⚪ White Page', callback_data: `set_white_${user}` },
                                { text: '📱 Mobile UI', callback_data: `set_mobile_${user}` }
                            ]
                        ]
                    }
                })
            });
        } 
        else if (action.startsWith('set_')) {
            const isWhite = action.startsWith('set_white_');
            const state = isWhite ? 'white_page' : 'mobile_ui';
            const user = action.replace('set_white_', '').replace('set_mobile_', '');

            // 1. Save state so it automatically applies next time
            await redis.hset('user_states', { [user]: state });

            // 2. Send live trigger to active browsers
            await pusher.trigger(`user-${user}`, 'screen-change', { state: state });

            // 3. Notify admin
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `✅ *${state.toUpperCase()}* set and saved for \`${user}\``,
                    parse_mode: 'Markdown'
                })
            });
        }
        return res.status(200).send('OK');
    }

    return res.status(200).send('No message or callback');
}
