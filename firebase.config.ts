import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const requiredFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfig = {
  ...requiredFirebaseConfig,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = Object.values(requiredFirebaseConfig).every(Boolean);

export const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const analytics = app
  ? isSupported().then((supported) => (supported ? getAnalytics(app) : null))
  : Promise.resolve(null);
