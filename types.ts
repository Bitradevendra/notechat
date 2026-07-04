
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  FILE = 'FILE'
}

export interface User {
  id: string;
  name: string;
  avatar: string; // URL
  themeColor: string; 
  passwordHash: string; 
}

export interface Message {
  id: string;
  senderId: string;
  type: MessageType;
  content: string; // Text content or Base64/BlobUrl
  fileBlob?: Blob; // Raw binary for IndexedDB
  fileName?: string; 
  fileSize?: string; 
  timestamp: number;
  read: boolean;
  reactions?: Record<string, string>; 
  edited?: boolean;
  replyTo?: {
    id: string;
    content: string;
    type: MessageType;
    senderName: string;
  };
  isDeletedForEveryone?: boolean;
  deletedBy?: string[];
  status?: 'sending' | 'sent' | 'error'; 
}

export interface Note {
    id: string;
    title: string;
    content: string;
    timestamp: number;
}

export type AppTheme = 'rose' | 'blue' | 'purple' | 'green' | 'amber' | 'myth' | 'midnight' | 'sunset';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ChatSettings {
  wallpaper: string;
  themeColor: AppTheme;
  themeMode: ThemeMode;
  users: Record<string, User>;
}

export const USER_1_ID = 'user_1';
export const USER_2_ID = 'user_2';