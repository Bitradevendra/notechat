# Android Build Instructions

Your project has been successfully configured for Android using Capacitor.

## Prerequisites
- **Android Studio**: You must have Android Studio installed on your machine.
- **Java/JDK 11 or higher**: The project requires Java 11+. 
  - **Your current system has Java 8**, which is not compatible with modern Android build tools.
  - **Solution**: Android Studio comes with its own JDK 17. When you open the project in Android Studio, it will use the correct Java version automatically.

## Steps to Build and Run

1.  **Open the Android Project**
    Run the following command in your terminal:
    ```bash
    npx cap open android
    ```
    This will launch Android Studio with your project loaded.

2.  **Wait for Gradle Sync**
    When Android Studio opens, it will start syncing the project with Gradle. Wait for this process to finish (you'll see progress bars at the bottom).

3.  **Run on Emulator or Device**
    -   **Emulator**: Create or select an Android Virtual Device (AVD) from the device manager in Android Studio. Click the green "Run" (Play) button in the toolbar.
    -   **Physical Device**: Enable "Developer Options" and "USB Debugging" on your Android phone. Connect it via USB. It should appear in the device dropdown. Click "Run".

## Updating the App
If you make changes to your React/web code (`App.tsx`, etc.):

1.  Rebuild the web app:
    ```bash
    npm run build
    ```
2.  Sync the changes to the Android project:
    ```bash
    npx cap sync
    ```
3.  Re-run the app from Android Studio.
