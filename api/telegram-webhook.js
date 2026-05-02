const Pusher = require('pusher');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || '2149356',
    key: process.env.PUSHER_KEY || '5628e828c0ecf46c7de1',
    secret: process.env.PUSHER_SECRET || 'c3f522d273a4f329faa3',
    cluster: process.env.PUSHER_CLUSTER || 'ap1',
    useTLS: true
});

export default async function handler(req, res) {
    // Note: In a real production app, you should verify that the request comes from Telegram.
    
    const body = req.body;

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
