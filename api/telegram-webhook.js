const Pusher = require('pusher');
const { Redis } = require('@upstash/redis');
const fetch = require('node-fetch');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || '2188434',
    key: process.env.PUSHER_KEY || '57e6b29567220f212fe5',
    secret: process.env.PUSHER_SECRET || '718c26f8c4ba7bc94948',
    cluster: process.env.PUSHER_CLUSTER || 'ap1',
    useTLS: true
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Helper function: Telegram ko message bhejne aur Errors catch karne ke liye
async function sendTgMessage(token, chatId, text, keyboard = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    };
    if (keyboard) {
        payload.reply_markup = { inline_keyboard: keyboard };
    }
    try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!tgRes.ok) {
            const err = await tgRes.json();
            // Agar formatting error ho, toh plain text mein error bhej do
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: `❌ API Error: ${err.description}` })
            });
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

export default async function handler(req, res) {
    const body = req.body;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    if (!body) return res.status(200).send('No body');

    // 1. Handle Messages / Commands
    if (body.message && body.message.text) {
        const text = body.message.text;
        const chatId = body.message.chat.id;

        if (text === '/start' || text === '/help') {
            const helpText = `🚀 <b>NEXTGEN ADMIN BOT</b> 🚀\n\nAvailable Commands:\n👤 <code>/add_user user pass</code> - Add new user\n👥 <code>/list_users</code> - Control specific users\n🗑️ <code>/clear_users</code> - Delete all users\n🔍 <code>/check_db</code> - Check database\n🔗 <code>/shortlink</code> - Shorten your main website URL\n🔗 <b>Send any URL</b> - To generate a hacker-themed short link`;
            await sendTgMessage(BOT_TOKEN, chatId, helpText);
            return res.status(200).send('OK');
        }

        if (text === '/check_db') {
            try {
                await redis.set('test_ping', 'pong');
                const status = (await redis.get('test_ping')) === 'pong' ? '✅ <b>DATABASE ONLINE</b>' : '❌ <b>DATABASE ERROR</b>';
                await sendTgMessage(BOT_TOKEN, chatId, status);
            } catch (e) {
                await sendTgMessage(BOT_TOKEN, chatId, `❌ <b>CONNECTION FAILED</b>\n${e.message}`);
            }
            return res.status(200).send('OK');
        }

        if (text.startsWith('/add_user')) {
            const parts = text.split(' ');
            if (parts.length === 3) {
                const u = parts[1].toLowerCase();
                const p = parts[2];
                await redis.hset('users', { [u]: p });
                await sendTgMessage(BOT_TOKEN, chatId, `✅ <b>USER ADDED:</b> <code>${u}</code>`);
            }
            return res.status(200).send('OK');
        }

        if (text.startsWith('/reset_user')) {
            const parts = text.split(' ');
            if (parts.length === 2) {
                const u = parts[1].toLowerCase();
                await redis.hdel('user_devices', u);
                await sendTgMessage(BOT_TOKEN, chatId, `🔄 <b>DEVICE RESET:</b> <code>${u}</code> can now login from a new device.`);
            }
            return res.status(200).send('OK');
        }

        if (text === '/list_users' || text === '/show_users') {
            try {
                const allUsers = await redis.hgetall('users');
                if (!allUsers || Object.keys(allUsers).length === 0) {
                    await sendTgMessage(BOT_TOKEN, chatId, '❌ No users found.');
                } else {
                    const keyboard = Object.keys(allUsers).map(u => ([{ text: `👤 Control ${u}`, callback_data: `ctrl_${u}` }]));
                    await sendTgMessage(BOT_TOKEN, chatId, '👥 <b>SELECT USER TO CONTROL:</b>', keyboard);
                }
            } catch (err) {
                await sendTgMessage(BOT_TOKEN, chatId, `❌ Database Error: ${err.message}`);
            }
            return res.status(200).send('OK');
        }

        if (text === '/clear_users') {
            await redis.del('users');
            await sendTgMessage(BOT_TOKEN, chatId, '🗑️ <b>ALL USERS DELETED</b>');
            return res.status(200).send('OK');
        }

        if (text === '/shortlink' || /^(https?:\/\/[^\s]+)$/.test(text.trim())) {
            const longUrl = text === '/shortlink' ? 'https://nextgen-ruddy.vercel.app/' : text.trim();
            const randomHex = Math.random().toString(16).substring(2, 6);
            const shortId = `0x${randomHex}`;

            try {
                await redis.hset('short_links', { [shortId]: longUrl });
                const host = req.headers['host'];
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const shortUrl = `${protocol}://${host}/s/${shortId}`;
                const responseText = `🚨 <b>SYSTEM LINK SHORTENED</b> 🚨\n\nTarget: <code>${longUrl}</code>\n\n<b>Hacker Link:</b> <a href="${shortUrl}">nextgenserver.hack/s/${shortId}</a>`;
                
                await sendTgMessage(BOT_TOKEN, chatId, responseText);
            } catch (err) {
                await sendTgMessage(BOT_TOKEN, chatId, `❌ <b>Link Error:</b> ${err.message}`);
            }
            return res.status(200).send('OK');
        }
    }

    // 2. Handle Callback Queries (Buttons)
    if (body.callback_query) {
        const action = body.callback_query.data;
        const chatId = body.callback_query.message.chat.id;
        const queryId = body.callback_query.id;

        // Telegram ko foran batana lazmi hai ke button press ho gaya hai warna wo block kar dega
        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: queryId })
            });
        } catch (e) {}

        if (action.startsWith('ctrl_')) {
            const user = action.replace('ctrl_', '');
            const keyboard = [
                [
                    { text: '⚪ White Page', callback_data: `set_white_${user}` },
                    { text: '📱 Mobile UI', callback_data: `set_mobile_${user}` }
                ]
            ];
            await sendTgMessage(BOT_TOKEN, chatId, `📱 <b>CONTROL:</b> <code>${user}</code>\nSelect screen:`, keyboard);
        } 
        else if (action.startsWith('set_')) {
            const isWhite = action.startsWith('set_white_');
            const state = isWhite ? 'white_page' : 'mobile_ui';
            const user = action.replace('set_white_', '').replace('set_mobile_', '');

            try {
                // Database aur live website update
                await redis.hset('user_states', { [user]: state });
                await pusher.trigger(`user-${user}`, 'screen-change', { state: state });
                
                // Success Message
                await sendTgMessage(BOT_TOKEN, chatId, `✅ <b>${state.toUpperCase()}</b> set and saved for <code>${user}</code>`);
            } catch (err) {
                // Agar DB ya Pusher crash ho to foran notification bhej do
                await sendTgMessage(BOT_TOKEN, chatId, `❌ <b>ERROR SETTING STATE:</b>\n<code>${err.message}</code>`);
            }
        }
        return res.status(200).send('OK');
    }

    return res.status(200).send('No message or callback');
}
