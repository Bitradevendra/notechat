
import { ChatSettings, Message, USER_1_ID, USER_2_ID, AppTheme, Note } from '../types';
import { DEFAULT_USERS } from '../constants';
import * as FirebaseService from './firebaseService';
import { showDisguisedNotification } from './notificationService';

const DB_NAME = 'SecureNotepadDB';
const DB_VERSION = 1;
const STORE_MESSAGES = 'messages';
const STORE_SETTINGS = 'settings';
const STORE_NOTES = 'notes';

// Broadcast channel for real-time sync between tabs
const channel = new BroadcastChannel('duo_chat_sync');

// Current user tracking
let currentUserId: string | null = null;

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
                db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_NOTES)) {
                db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

// Generic DB Helpers
const dbGetAll = async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const dbPut = async (storeName: string, value: any): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const dbDelete = async (storeName: string, key: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const dbClear = async (storeName: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Initialize ---

export const initializeStorage = async (userId: string) => {
    currentUserId = userId;

    // Initialize Firebase authentication
    await FirebaseService.initializeAuth();

    // Set current user for presence tracking
    FirebaseService.setCurrentUser(userId);

    // Subscribe to Firebase messages and sync to IndexedDB
    if (FirebaseService.isFirebaseEnabled()) {
        FirebaseService.subscribeToMessages(async (firebaseMessages) => {
            // Sync Firebase messages to local IndexedDB
            for (const msg of firebaseMessages) {
                // Convert base64 content back to blob if needed
                if (msg.content && msg.content.startsWith('data:') && (msg.type === 'IMAGE' || msg.type === 'VIDEO' || msg.type === 'AUDIO' || msg.type === 'FILE')) {
                    try {
                        msg.fileBlob = await FirebaseService.base64ToBlob(msg.content);
                    } catch (e) {
                        console.error('Error converting base64 to blob:', e);
                    }
                }

                await dbPut(STORE_MESSAGES, msg);

                // Show notification if message is from other user
                if (msg.senderId !== currentUserId && !msg.read) {
                    showDisguisedNotification(msg.senderId === USER_1_ID ? 'Him' : 'Her');
                }
            }
            notifyChange('messages');
        });

        // Subscribe to Firebase settings
        FirebaseService.subscribeToSettings(async (firebaseSettings) => {
            if (firebaseSettings) {
                const settingsWithId = { ...firebaseSettings, id: 'main_settings' };
                await dbPut(STORE_SETTINGS, settingsWithId);
                notifyChange('settings');
            }
        });
    }
};

// --- Exported Async API ---

export const getMessages = async (): Promise<Message[]> => {
    return dbGetAll<Message>(STORE_MESSAGES);
};

export const saveMessage = async (msg: Message) => {
    try {
        // Save to IndexedDB first (for immediate UI update)
        await dbPut(STORE_MESSAGES, msg);
        notifyChange('messages');

        // Then sync to Firebase
        if (FirebaseService.isFirebaseEnabled()) {
            const success = await FirebaseService.saveMessageToFirebase(msg);
            if (!success) {
                console.warn('Message saved locally but failed to sync to Firebase');
            } else {
                // Send Push Notification to the other user
                const recipientId = msg.senderId === USER_1_ID ? USER_2_ID : USER_1_ID;
                await FirebaseService.sendPushNotification(recipientId, 'My Notes', 'New note update available');
            }
        }
    } catch (e) {
        console.error("Save Error", e);
        alert("Failed to save message. Database might be full.");
    }
};

export const updateMessage = async (updatedMsg: Message) => {
    try {
        // Update in IndexedDB
        await dbPut(STORE_MESSAGES, updatedMsg);
        notifyChange('messages');

        // Update in Firebase
        if (FirebaseService.isFirebaseEnabled()) {
            await FirebaseService.updateMessageInFirebase(updatedMsg);
        }
    } catch (e) {
        console.error("Update Error", e);
    }
};

export const markMessagesAsRead = async (senderId: string) => {
    const messages = await getMessages();
    let hasChanges = false;

    for (const msg of messages) {
        if (msg.senderId === senderId && !msg.read) {
            msg.read = true;
            await dbPut(STORE_MESSAGES, msg);

            // Update in Firebase
            if (FirebaseService.isFirebaseEnabled()) {
                await FirebaseService.updateMessageInFirebase(msg);
            }

            hasChanges = true;
        }
    }

    if (hasChanges) notifyChange('messages');
};

export const deleteMessageForEveryone = async (messageId: string) => {
    const messages = await getMessages();
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
        msg.isDeletedForEveryone = true;
        msg.content = '';
        msg.fileBlob = undefined;
        msg.fileName = undefined;
        msg.fileSize = undefined;

        await dbPut(STORE_MESSAGES, msg);
        notifyChange('messages');

        // Update in Firebase
        if (FirebaseService.isFirebaseEnabled()) {
            await FirebaseService.markMessageDeletedForEveryone(messageId);
        }
    }
};

export const deleteMessageForMe = async (messageId: string, userId: string) => {
    const messages = await getMessages();
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
        msg.deletedBy = msg.deletedBy || [];
        if (!msg.deletedBy.includes(userId)) {
            msg.deletedBy.push(userId);
            await dbPut(STORE_MESSAGES, msg);
            notifyChange('messages');

            // Update in Firebase
            if (FirebaseService.isFirebaseEnabled()) {
                await FirebaseService.updateMessageInFirebase(msg);
            }
        }
    }
};

export const clearChat = async () => {
    await dbClear(STORE_MESSAGES);
    notifyChange('messages');

    // Note: We don't clear Firebase here to preserve messages on other devices
    // If you want to clear for everyone, you'd need to implement that separately
};

// --- Settings ---

export const getSettings = async (): Promise<ChatSettings> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_SETTINGS, 'readonly');
        const store = tx.objectStore(STORE_SETTINGS);
        const request = store.get('main_settings');
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result);
            } else {
                resolve({
                    wallpaper: 'bg-slate-900',
                    themeColor: 'blue',
                    themeMode: 'system',
                    users: DEFAULT_USERS,
                });
            }
        };
        request.onerror = () => {
            resolve({
                wallpaper: 'bg-slate-900',
                themeColor: 'blue',
                themeMode: 'system',
                users: DEFAULT_USERS,
            });
        };
    });
};

export const saveSettings = async (settings: ChatSettings) => {
    // Add an ID to store it easily
    const settingsWithId = { ...settings, id: 'main_settings' };
    await dbPut(STORE_SETTINGS, settingsWithId);
    notifyChange('settings');

    // Sync to Firebase
    if (FirebaseService.isFirebaseEnabled()) {
        await FirebaseService.saveSettingsToFirebase(settings);
    }
};

// --- Notes ---

export const getNotes = async (): Promise<Note[]> => {
    return dbGetAll<Note>(STORE_NOTES);
};

export const saveNote = async (note: Note) => {
    await dbPut(STORE_NOTES, note);
    notifyChange('notes');
};

export const deleteNote = async (noteId: string) => {
    await dbDelete(STORE_NOTES, noteId);
    notifyChange('notes');
};

// --- Typing Status ---
export const STORAGE_KEY_TYPING = 'duo_chat_typing';

export const setTypingStatus = (userId: string, isTyping: boolean) => {
    // Local storage for immediate feedback
    const data = { userId, isTyping, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY_TYPING, JSON.stringify(data));

    // Sync to Firebase
    if (FirebaseService.isFirebaseEnabled()) {
        FirebaseService.setTypingStatusFirebase(userId, isTyping);
    }
};

export const getTypingStatus = (): { userId: string; isTyping: boolean; timestamp: number } | null => {
    const data = localStorage.getItem(STORAGE_KEY_TYPING);
    return data ? JSON.parse(data) : null;
};

// Subscribe to typing status from Firebase
export const subscribeToTypingStatus = (userId: string, callback: (isTyping: boolean) => void) => {
    if (FirebaseService.isFirebaseEnabled()) {
        return FirebaseService.subscribeToTyping(userId, callback);
    }
    return () => { }; // Return empty unsubscribe
};

// --- Realtime Sync ---
const listeners: Record<string, Function[]> = {};

export const subscribe = (event: string, callback: Function) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
};

const notifyChange = (event: string) => {
    // Trigger local listeners
    if (listeners[event]) {
        listeners[event].forEach(cb => cb());
    }
    // Trigger other tabs
    channel.postMessage({ type: event });
};

channel.onmessage = (event) => {
    const type = event.data.type;
    if (listeners[type]) {
        listeners[type].forEach(cb => cb());
    }
};

// --- Backup & Restore ---

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
const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return res.blob();
};

export const exportAllData = async () => {
    const messages = await getMessages();
    const notes = await getNotes();
    const settings = await getSettings();

    // Process messages to convert blobs to Base64 strings for JSON export
    const processedMessages = await Promise.all(messages.map(async (msg) => {
        if (msg.fileBlob) {
            const b64 = await blobToBase64(msg.fileBlob);
            return { ...msg, fileBlob: undefined, content: b64, isBlobContent: true };
        }
        return msg;
    }));

    const data = {
        version: 1,
        timestamp: Date.now(),
        messages: processedMessages,
        notes,
        settings
    };

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SecureNotepad_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

export const importData = async (jsonFile: File): Promise<boolean> => {
    try {
        const text = await jsonFile.text();
        const data = JSON.parse(text);

        if (!data.version || !data.messages) throw new Error("Invalid backup file");

        await dbClear(STORE_MESSAGES);
        await dbClear(STORE_NOTES);

        // Restore Messages
        for (const msg of data.messages) {
            if (msg.isBlobContent && msg.content.startsWith('data:')) {
                const blob = await base64ToBlob(msg.content);
                msg.fileBlob = blob;
            }
            delete msg.isBlobContent;
            await dbPut(STORE_MESSAGES, msg);
        }

        // Restore Notes
        if (data.notes) {
            for (const note of data.notes) {
                await dbPut(STORE_NOTES, note);
            }
        }

        // Restore Settings
        if (data.settings) {
            await dbPut(STORE_SETTINGS, { ...data.settings, id: 'main_settings' });
        }

        notifyChange('messages');
        notifyChange('notes');
        notifyChange('settings');
        return true;
    } catch (e) {
        console.error("Import Failed", e);
        return false;
    }
};
