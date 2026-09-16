(function (global) {
    'use strict';

    const toUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
    };

    const getCurrentEmail = () => {
        const user = global.AuthService ? global.AuthService.getCurrentUser() : null;
        return user ? user.email : '';
    };

    const enablePushNotifications = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in global) || !('Notification' in global)) {
            throw new Error('This browser does not support push notifications.');
        }

        const email = getCurrentEmail();
        if (!email) throw new Error('Please sign in before enabling notifications.');

        const configResponse = await fetch('/api/push/config');
        if (!configResponse.ok) throw new Error('Push notifications are not configured yet.');
        const { publicKey } = await configResponse.json();

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Notification permission was not granted.');

        const registration = await navigator.serviceWorker.register('/sw.js');
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: toUint8Array(publicKey)
            });
        }

        const response = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, subscription: subscription.toJSON() })
        });
        if (!response.ok) throw new Error('Could not save this device subscription.');

        return subscription;
    };

    global.IpapoPush = { enablePushNotifications };
})(window);
