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

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        if (user === 'nextgen' && pass === 'nextgen105') {
            // Success
            errorMsg.style.opacity = '0';

            // Add a cinematic glitch/hide effect to the card
            loginCard.style.transform = 'scale(0.9)';
            loginCard.style.opacity = '0';

            setTimeout(() => {
                loginCard.style.display = 'none';

                // Show initial success popup
                document.getElementById('success-popup-overlay').style.display = 'flex';

                // Transition to decryption after 2.5s
                setTimeout(() => {
                    document.getElementById('success-popup-overlay').style.display = 'none';
                    document.getElementById('decryption-ui').style.display = 'flex';
                    startDecryptionAnimation();
                }, 2500);
            }, 500);

        } else {
            // Error
            errorMsg.textContent = 'ACCESS DENIED: INCOMPATIBLE CREDENTIALS';
            errorMsg.style.opacity = '1';

            // Show popup
            document.getElementById('error-popup-overlay').style.display = 'flex';

            // Shake effect
            loginCard.style.animation = 'none';
            loginCard.offsetHeight; // trigger reflow
            loginCard.style.animation = 'shake 0.5s';

            setTimeout(() => {
                loginCard.style.animation = 'card-anti-gravity 6s ease-in-out infinite alternate';
            }, 500);
        }
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
        progress += Math.random() * 0.8;
        if (progress >= 100) {
            progress = 100;
            clearInterval(simInterval);
            clearInterval(streamsInterval);

            // Success effect for initial load
            canvas.style.filter = 'hue-rotate(50deg) saturate(2) brightness(1.2)';
            title.innerText = 'ACCESS GRANTED';
            title.style.color = '#00ffaa';
            title.style.textShadow = '0 0 20px rgba(0, 255, 170, 0.8)';
            pb.style.stroke = '#00ffaa';
            pb.style.filter = 'drop-shadow(0 0 20px #00ffaa)';
            let pbText = document.getElementById('decrypt-progress-text');
            if (pbText) {
                pbText.style.color = '#00ffaa';
                pbText.style.textShadow = '0 0 20px #00ffaa';
                pbText.innerText = '100%';
            }

            setTimeout(() => {
                // Show Open Mobile popup
                document.getElementById('open-mobile-popup-overlay').style.display = 'flex';
            }, 1000);
        }

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
    loaderContent.style.display = 'flex';
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
    setTimeout(() => {
        decUi.style.display = 'none';
        document.getElementById('android-ui').style.display = 'flex';
        startClock();
    }, 500);
}
