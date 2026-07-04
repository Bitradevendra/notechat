
import React, { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import ChatInterface from './components/ChatInterface';
import NotepadInterface from './components/NotepadInterface';
import { User } from './types';
import { getSettings, initializeStorage } from './services/storageService';
import { initializePushNotifications, requestWebNotificationPermission } from './services/notificationService';

type ViewMode = 'login' | 'chat' | 'notepad';

const App: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [isHeartLoading, setIsHeartLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Load user data whenever currentUserId changes
  useEffect(() => {
    if (currentUserId) {
      getSettings().then(settings => {
        if (settings.users[currentUserId]) {
          setUser(settings.users[currentUserId]);
        }
      });

      // Initialize Firebase and notifications
      initializeStorage(currentUserId).catch(err => {
        console.error('Failed to initialize storage:', err);
      });

      // Request notification permissions
      initializePushNotifications(currentUserId).catch(err => {
        console.error('Failed to initialize push notifications:', err);
      });

      // Request web notifications (for browser)
      requestWebNotificationPermission().catch(err => {
        console.error('Failed to request web notifications:', err);
      });
    } else {
      setUser(null);
    }
  }, [currentUserId]);

  const handleLogin = (userId: string, mode: 'chat' | 'notepad') => {
    if (mode === 'chat') {
      setIsHeartLoading(true);
      setTimeout(() => {
        setCurrentUserId(userId);
        setViewMode('chat');
        setIsHeartLoading(false);
      }, 1000);
    } else {
      setViewMode('notepad');
    }
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setViewMode('login');
  };

  if (isHeartLoading) {
    return <LoadingScreen />;
  }

  if (viewMode === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (viewMode === 'notepad') {
    return <NotepadInterface onLogout={handleLogout} />;
  }

  if (viewMode === 'chat' && user) {
    return (
      <ChatInterface
        currentUser={user}
        onLogout={handleLogout}
      />
    );
  }

  return <LoginScreen onLogin={handleLogin} />;
};

export default App;
