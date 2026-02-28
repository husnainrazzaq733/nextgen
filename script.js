document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Status Bar Clock
    const clockElement = document.getElementById('clock');

    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();

        // Format to HH:MM format
        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;

        clockElement.textContent = `${hours}:${minutes}`;
    }

    updateClock(); // Initial call
    setInterval(updateClock, 1000); // Update every second

    // 2. Loading Screen Logic
    // User requested 20 to 30 seconds of loading time.
    const loadingDuration = 20000; // 20 seconds

    // Add dynamic dots to loading text to make it feel alive
    const loadingText = document.querySelector('.loading-text');
    let dots = 0;
    const loadingInterval = setInterval(() => {
        dots = (dots + 1) % 4;
        let text = 'Starting System';
        for (let i = 0; i < dots; i++) text += '.';
        loadingText.textContent = text;
    }, 600);

    // After loading duration, hide loader and show mobile UI
    setTimeout(() => {
        clearInterval(loadingInterval);
        loadingText.textContent = 'System Ready';

        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const mobileContainer = document.getElementById('mobile-container');

            // Fade out loader
            loadingScreen.style.opacity = '0';

            // Scale and fade in the mobile device
            mobileContainer.classList.remove('hidden');

            // Fully hide loader from DOM after transition
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 1000);
        }, 500);

    }, loadingDuration);

    // 3. App Click Interactions
    const apps = document.querySelectorAll('.app');
    const appLoadingOverlay = document.getElementById('app-loading-overlay');
    const appLoaderContainer = document.getElementById('app-loader-container');
    const appErrorContainer = document.getElementById('app-error-container');
    const androidBackBtn = document.getElementById('android-back-btn');

    let appLoadingTimeout;

    apps.forEach(app => {
        app.addEventListener('click', () => {
            // Provide a small tactile feedback simulation
            app.style.transform = 'scale(0.85)';
            setTimeout(() => {
                app.style.transform = '';
            }, 100);

            // Show the app loading overlay
            appLoadingOverlay.classList.remove('hidden');
            appLoaderContainer.classList.remove('hidden');
            appErrorContainer.classList.add('hidden');

            // 1 to 2 minutes loading (Randomly between 60,000ms to 120,000ms)
            const minTime = 60000;
            const maxTime = 120000;
            const loadTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;

            appLoadingTimeout = setTimeout(() => {
                appLoaderContainer.classList.add('hidden');
                appErrorContainer.classList.remove('hidden');
            }, loadTime);
        });
    });

    androidBackBtn.addEventListener('click', () => {
        // Only trigger if an app is currently trying to load or showing an error
        if (!appLoadingOverlay.classList.contains('hidden')) {
            appLoadingOverlay.classList.add('hidden');
            clearTimeout(appLoadingTimeout);

            // Optional android subtle ripple effect logic could go here
            console.log("Android back button pressed to exit app.");
        }
    });

    // 4. Scroll dots update
    const appScreen = document.getElementById('app-screen');
    const pageDots = document.querySelectorAll('.dot');

    if (appScreen && pageDots.length > 0) {
        appScreen.addEventListener('scroll', () => {
            const scrollLeft = appScreen.scrollLeft;
            const containerWidth = appScreen.clientWidth;
            const pageIndex = Math.round(scrollLeft / containerWidth);

            pageDots.forEach((dot, index) => {
                if (index === pageIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });

        // Drag to scroll functionality for desktop
        let isDown = false;
        let startX;
        let scrollLeftScroll;

        appScreen.style.cursor = 'grab';

        appScreen.addEventListener('mousedown', (e) => {
            isDown = true;
            appScreen.style.scrollSnapType = 'none'; // Disable snap while dragging
            appScreen.style.cursor = 'grabbing';
            startX = e.pageX - appScreen.offsetLeft;
            scrollLeftScroll = appScreen.scrollLeft;
        });

        appScreen.addEventListener('mouseleave', () => {
            isDown = false;
            appScreen.style.scrollSnapType = 'x mandatory';
            appScreen.style.cursor = 'grab';
        });

        appScreen.addEventListener('mouseup', () => {
            isDown = false;
            appScreen.style.scrollSnapType = 'x mandatory';
            appScreen.style.cursor = 'grab';
        });

        appScreen.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - appScreen.offsetLeft;
            const walk = (x - startX) * 1.5; // Scroll speed
            appScreen.scrollLeft = scrollLeftScroll - walk;
        });
    }
});
