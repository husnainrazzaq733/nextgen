const { Redis } = require('@upstash/redis');

// Fallback to empty to just test if the library throws.
const redis = new Redis({
  url: 'https://test-url.upstash.io',
  token: 'test-token'
});

async function run() {
  try {
    await redis.hset('user_states', { 'nextgen': 'white_page' });
    console.log('Redis OK');
  } catch(e) {
    console.log('Redis Error:', e.message);
  }
}
run();
