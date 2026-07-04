# NoteChat

NoteChat is a private React + Vite chat app with a disguised notepad mode, Firebase realtime sync, optional Gemini smart replies, and Capacitor Android support.

This public repository contains the app source and safe setup templates only. Personal chats, private passwords, Firebase project files, API keys, generated builds, and local environment files are intentionally excluded.

## Requirements

- Windows 10 or Windows 11
- Node.js 20+
- npm
- Firebase project with Realtime Database and Anonymous Auth enabled
- Android Studio and JDK, only for Android builds

## Web Setup

1. Install dependencies:
   ```bat
   npm install
   ```

2. Create your local environment file:
   ```bat
   copy .env.example .env.local
   ```

3. Open `.env.local` and fill in your private passwords, Firebase config, and optional Gemini key.

4. Start the app:
   ```bat
   npm run dev
   ```

5. Open the Vite URL shown in the terminal, usually:
   ```text
   http://localhost:3000
   ```

## Android Setup

1. Create `android\app\google-services.json` from your Firebase Android app settings.

2. Build and sync web assets:
   ```bat
   npm run build
   npx cap sync android
   ```

3. Open Android Studio:
   ```bat
   npm run android
   ```

## Privacy Rules

Never commit these files or folders:

- `.env`, `.env.local`, or other private env files
- `android/app/google-services.json`
- `dist/`
- `node_modules/`
- Android build/cache folders
- exported chats, local databases, screenshots, or backups

Use `.env.example` and `android/app/google-services.example.json` as safe templates.
