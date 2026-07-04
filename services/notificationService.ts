
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

let isNotificationsInitialized = false;

import { saveFCMTokenToFirebase, sendPushNotification } from './firebaseService';

// Initialize push notifications (only on native platforms)
export const initializePushNotifications = async (userId?: string) => {
    // Only works on native platforms (Android/iOS)
    if (!Capacitor.isNativePlatform()) {
        console.log('⚠️ Push notifications only work on native platforms');
        return;
    }

    try {
        // Request permission
        const permResult = await PushNotifications.requestPermissions();

        if (permResult.receive === 'granted') {
            // Register with FCM
            await PushNotifications.register();
            console.log('✅ Push notifications registered');
            isNotificationsInitialized = true;
        } else {
            console.log('⚠️ Push notification permission denied');
        }

        // Listen for registration
        PushNotifications.addListener('registration', (token) => {
            console.log('📱 Push registration token:', token.value);
            if (userId) {
                saveFCMTokenToFirebase(userId, token.value);
            }
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Push registration error:', error);
        });

        // Listen for incoming notifications (when app is in foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('📬 Notification received:', notification);
            // Notification is automatically shown by the system
        });

        // Listen for notification taps
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('👆 Notification tapped:', notification);
            // You can navigate to chat here if needed
        });

    } catch (error) {
        console.error('❌ Push notification initialization failed:', error);
    }
};

// Send local notification (works without Firebase Cloud Messaging)
export const sendLocalNotification = async (title: string, body: string) => {
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    try {
        // Schedule a local notification
        await PushNotifications.createChannel({
            id: 'notepad_channel',
            name: 'Notepad Updates',
            description: 'Notifications for notepad updates',
            importance: 3, // Medium importance
            visibility: 0, // Public
            sound: 'default',
            vibration: true
        });

    } catch (error) {
        console.error('Local notification error:', error);
    }
};

// Show notification when new message arrives (disguised as notepad)
export const showDisguisedNotification = (senderName: string, recipientId?: string) => {
    if (!Capacitor.isNativePlatform()) {
        // For web, use browser notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('My Notes', {
                body: 'New note update available',
                icon: '/notepad-icon.png', // You should add this icon
                badge: '/notepad-badge.png',
                tag: 'notepad-update',
                silent: false,
            });
        }
        return;
    }

    // For native platforms, trigger a push notification to the other device
    if (recipientId) {
        sendPushNotification(recipientId, 'My Notes', 'New note update available');
    }

    console.log(`📝 Disguised notification triggered for ${senderName}`);
};

// Request notification permissions for web
export const requestWebNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('⚠️ Notifications not supported in this browser');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

// Check if notifications are enabled
export const areNotificationsEnabled = () => {
    if (Capacitor.isNativePlatform()) {
        return isNotificationsInitialized;
    }

    // For web
    return 'Notification' in window && Notification.permission === 'granted';
};

// Get FCM token for this device
export const getFCMToken = async (): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
        return null;
    }

    try {
        // The token is received in the 'registration' listener
        // For now, return null - in production, you'd store and return the actual token
        return null;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};
