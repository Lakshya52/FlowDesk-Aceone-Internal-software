export async function registerPushNotifications() {
    // Web Push is completely disabled in favor of Electron-only notifications
    console.info('ℹ️ Web Push notifications are reaching their end of life in this app. Using Electron-only socket notifications.');
    return;

    /* Remaining code is kept for reference but is unreachable
    try {
        console.log('📡 Initializing push notification registration...');
        // Register service worker if not already registered
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered with scope:', registration.scope);

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('✅ Service Worker is ready.');

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log('ℹ️ No existing subscription found. Requesting permission...');
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('⚠️ Notification permission:', permission);
                return;
            }

            console.log('📡 Creating new push subscription...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('✅ New subscription created:', subscription.endpoint);
            
            // Send subscription to server
            await api.post('/notifications/subscribe', { subscription });
            console.log('✅ Subscription synced with server.');
        } else {
            console.log('ℹ️ User is already subscribed. Syncing latest subscription with server...');
            // Send to server anyway to ensure it's up to date
            await api.post('/notifications/subscribe', { subscription });
        }
    } catch (error: any) {
        console.error('❌ Failed to register push notifications:', error);
    }
    */
}
