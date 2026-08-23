const Pusher = require('pusher');
const pusher = new Pusher({
    appId: '2149356',
    key: '5628e828c0ecf46c7de1',
    secret: 'c3f522d273a4f329faa3',
    cluster: 'ap1',
    useTLS: true
});
async function run() {
    try {
        const res = await pusher.trigger('test-channel', 'test-event', { message: 'hello' });
        console.log('Pusher success:', res.status);
    } catch(e) {
        console.log('Pusher error:', e.message);
    }
}
run();
