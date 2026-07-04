
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, update, remove, serverTimestamp, onDisconnect } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebase.config';
import { Message, ChatSettings, User } from '../types';

// Initialize Firebase
let app;
let db;
let auth;
let isInitialized = false;
let currentUserId: string | null = null;

try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    isInitialized = true;
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.warn('⚠️ Firebase initialization failed. Running in offline mode.', error);
    isInitialized = false;
}

// Single chat room for the couple
const CHAT_ROOM_ID = 'couple_chat_room';

// Firebase paths
const MESSAGES_PATH = `chats/${CHAT_ROOM_ID}/messages`;
const SETTINGS_PATH = `chats/${CHAT_ROOM_ID}/settings`;
const TYPING_PATH = `chats/${CHAT_ROOM_ID}/typing`;
const PRESENCE_PATH = `chats/${CHAT_ROOM_ID}/presence`;

// Check if Firebase is available
export const isFirebaseEnabled = () => isInitialized;

// Authenticate anonymously on initialization
export const initializeAuth = async () => {
    if (!isInitialized) return null;

    // Return existing user if already authenticated
    if (auth.currentUser) {
        return auth.currentUser;
    }

    try {
        const result = await signInAnonymously(auth);
        console.log('✅ Authenticated anonymously with Firebase');
        return result.user;
    } catch (error) {
        console.error('❌ Firebase auth error:', error);
        return null;
    }
};

// Set current user for presence tracking
export const setCurrentUser = (userId: string) => {
    currentUserId = userId;
    if (isInitialized && currentUserId) {
        updatePresence(userId, true);
    }
};

// Update user presence (online/offline)
const updatePresence = async (userId: string, isOnline: boolean) => {
    if (!isInitialized) return;

    try {
        const presenceRef = ref(db, `${PRESENCE_PATH}/${userId}`);
        await set(presenceRef, {
            online: isOnline,
            lastSeen: serverTimestamp()
        });

        // Set offline on disconnect
        if (isOnline) {
            onDisconnect(presenceRef).set({
                online: false,
                lastSeen: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Presence update error:', error);
    }
};

// === MESSAGES ===

// Subscribe to real-time message updates
export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
    if (!isInitialized) {
        return () => { }; // Return empty unsubscribe function
    }

    const messagesRef = ref(db, MESSAGES_PATH);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const messages = Object.keys(data).map(key => ({
                ...data[key],
                id: key
            }));
            callback(messages);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error('Messages subscription error:', error);
        callback([]);
    });

    return unsubscribe;
};

// Save a new message to Firebase
export const saveMessageToFirebase = async (message: Message): Promise<boolean> => {
    if (!isInitialized) return false;

    try {
        // Create a clean copy of the message
        let messageData: any = { ...message };

        // Handle fileBlob
        if (message.fileBlob) {
            // Convert Blob to Base64
            const base64 = await blobToBase64(message.fileBlob);
            messageData.content = base64;
        }

        // STRICTLY remove fileBlob property (Firebase doesn't allow undefined)
        delete messageData.fileBlob;

        // Remove any other undefined properties
        Object.keys(messageData).forEach(key => {
            if (messageData[key] === undefined) {
                delete messageData[key];
            }
        });

        // Use the existing message ID as the key
        const newMessageRef = ref(db, `${MESSAGES_PATH}/${message.id}`);

        await set(newMessageRef, messageData);
        return true;
    } catch (error) {
        console.error('Error saving message to Firebase:', error);
        return false;
    }
};

// Update a message in Firebase
export const updateMessageInFirebase = async (message: Message): Promise<boolean> => {
    if (!isInitialized) return false;

    try {
        const messageRef = ref(db, `${MESSAGES_PATH}/${message.id}`);

        let messageData: any = { ...message };

        // STRICTLY remove fileBlob property
        delete messageData.fileBlob;

        // Remove any other undefined properties
        Object.keys(messageData).forEach(key => {
            if (messageData[key] === undefined) {
                delete messageData[key];
            }
        });

        await update(messageRef, messageData);
        return true;
    } catch (error) {
        console.error('Error updating message in Firebase:', error);
        return false;
    }
};

// Delete a message from Firebase
export const deleteMessageFromFirebase = async (messageId: string): Promise<boolean> => {
    if (!isInitialized) return false;

    try {
        const messageRef = ref(db, `${MESSAGES_PATH}/${messageId}`);
        await remove(messageRef);
        return true;
    } catch (error) {
        console.error('Error deleting message from Firebase:', error);
        return false;
    }
};

// Mark message as deleted for everyone
export const markMessageDeletedForEveryone = async (messageId: string): Promise<boolean> => {
    if (!isInitialized) return false;

    try {
        const messageRef = ref(db, `${MESSAGES_PATH}/${messageId}`);
        await update(messageRef, {
            isDeletedForEveryone: true,
            content: '',
            fileBlob: null,
            fileName: null,
            fileSize: null
        });
        return true;
    } catch (error) {
        console.error('Error marking message as deleted:', error);
        return false;
    }
};

// === SETTINGS ===

// Subscribe to settings updates
export const subscribeToSettings = (callback: (settings: ChatSettings | null) => void) => {
    if (!isInitialized) {
        return () => { };
    }

    const settingsRef = ref(db, SETTINGS_PATH);

    const unsubscribe = onValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        callback(data || null);
    }, (error) => {
        console.error('Settings subscription error:', error);
        callback(null);
    });

    return unsubscribe;
};

// Save settings to Firebase
export const saveSettingsToFirebase = async (settings: ChatSettings): Promise<boolean> => {
    if (!isInitialized) return false;

    try {
        const settingsRef = ref(db, SETTINGS_PATH);
        await set(settingsRef, settings);
        return true;
    } catch (error) {
        console.error('Error saving settings to Firebase:', error);
        return false;
    }
};

// === TYPING INDICATOR ===

// Update typing status
export const setTypingStatusFirebase = async (userId: string, isTyping: boolean) => {
    if (!isInitialized) return;

    try {
        const typingRef = ref(db, `${TYPING_PATH}/${userId}`);

        if (isTyping) {
            await set(typingRef, {
                typing: true,
                timestamp: serverTimestamp()
            });

            // Auto-remove after 5 seconds
            setTimeout(async () => {
                await set(typingRef, {
                    typing: false,
                    timestamp: serverTimestamp()
                });
            }, 5000);
        } else {
            await set(typingRef, {
                typing: false,
                timestamp: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Typing status error:', error);
    }
};

// Subscribe to typing status
export const subscribeToTyping = (userId: string, callback: (isTyping: boolean) => void) => {
    if (!isInitialized) {
        return () => { };
    }

    const typingRef = ref(db, `${TYPING_PATH}/${userId}`);

    const unsubscribe = onValue(typingRef, (snapshot) => {
        const data = snapshot.val();
        callback(data?.typing || false);
    }, (error) => {
        console.error('Typing subscription error:', error);
        callback(false);
    });

    return unsubscribe;
};

// === PRESENCE ===

// Subscribe to user presence
export const subscribeToPresence = (userId: string, callback: (online: boolean, lastSeen: number) => void) => {
    if (!isInitialized) {
        return () => { };
    }

    const presenceRef = ref(db, `${PRESENCE_PATH}/${userId}`);

    const unsubscribe = onValue(presenceRef, (snapshot) => {
        const data = snapshot.val();
        callback(data?.online || false, data?.lastSeen || 0);
    });

    return unsubscribe;
};

// === NOTIFICATIONS ===

// Save FCM Token to Firebase
export const saveFCMTokenToFirebase = async (userId: string, token: string) => {
    if (!isInitialized) return;

    try {
        const tokenRef = ref(db, `users/${userId}/fcmToken`);
        await set(tokenRef, token);
        console.log('✅ FCM Token saved to Firebase');
    } catch (error) {
        console.error('Error saving FCM token:', error);
    }
};

// Get FCM Token for a user
export const getUserFCMToken = async (userId: string): Promise<string | null> => {
    if (!isInitialized) return null;

    try {
        const tokenRef = ref(db, `users/${userId}/fcmToken`);
        return new Promise((resolve) => {
            onValue(tokenRef, (snapshot) => {
                resolve(snapshot.val() || null);
            }, { onlyOnce: true });
        });
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
};

// Send Push Notification (Client-side trigger)
export const sendPushNotification = async (recipientId: string, title: string, body: string) => {
    // ⚠️ REPLACE THIS WITH YOUR FIREBASE SERVER KEY
    // Go to Project Settings -> Cloud Messaging -> Cloud Messaging API (Legacy) -> Server Key
    const SERVER_KEY = "YOUR_SERVER_KEY_HERE";

    if (SERVER_KEY === "YOUR_SERVER_KEY_HERE") {
        console.warn("⚠️ Cannot send push: Missing Server Key in firebaseService.ts");
        return;
    }

    const token = await getUserFCMToken(recipientId);
    if (!token) {
        console.warn("⚠️ No FCM token found for user:", recipientId);
        return;
    }

    try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${SERVER_KEY}`
            },
            body: JSON.stringify({
                to: token,
                notification: {
                    title: title,
                    body: body,
                    sound: 'default',
                    click_action: 'FCM_PLUGIN_ACTIVITY',
                },
                data: {
                    // Add any extra data here
                    type: 'chat_message'
                }
            })
        });

        const data = await response.json();
        console.log('🚀 Push notification sent:', data);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

// === HELPER FUNCTIONS ===

// Convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Convert Base64 to Blob
export const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return res.blob();
};

// Clear all chat data (for testing purposes)
export const clearAllChatData = async (): Promise<boolean> => {
    if (!isInitialized) return false;

    try {
        const chatRef = ref(db, `chats/${CHAT_ROOM_ID}`);
        await remove(chatRef);
        return true;
    } catch (error) {
        console.error('Error clearing chat data:', error);
        return false;
    }
};
