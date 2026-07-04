
import { User, USER_1_ID, USER_2_ID } from './types';

// Default configuration
export const PASSWORDS = {
  [USER_1_ID]: import.meta.env.VITE_USER_1_PASSWORD || 'change-me-user-1',
  [USER_2_ID]: import.meta.env.VITE_USER_2_PASSWORD || 'change-me-user-2',
  NOTEPAD: import.meta.env.VITE_NOTEPAD_PASSWORD || 'change-me-notepad',
};

export const DEFAULT_USERS: Record<string, User> = {
  [USER_1_ID]: {
    id: USER_1_ID,
    name: import.meta.env.VITE_USER_1_NAME || 'User 1',
    avatar: 'https://picsum.photos/seed/boy/200/200',
    themeColor: 'cyan',
    passwordHash: import.meta.env.VITE_USER_1_PASSWORD || 'change-me-user-1',
  },
  [USER_2_ID]: {
    id: USER_2_ID,
    name: import.meta.env.VITE_USER_2_NAME || 'User 2',
    avatar: 'https://picsum.photos/seed/girl/200/200',
    themeColor: 'rose',
    passwordHash: import.meta.env.VITE_USER_2_PASSWORD || 'change-me-user-2',
  },
};

export const WALLPAPERS = [
  'bg-slate-900', // Dark Default
  'bg-gradient-to-br from-indigo-900 to-purple-900', // Deep Space
  'bg-gradient-to-tr from-rose-100 to-teal-100', // Cotton Candy
  'bg-[url("https://images.unsplash.com/photo-1518098268026-4e18713f3641?q=80&w=1000&auto=format&fit=crop")]', // Stars
  'bg-[url("https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1000&auto=format&fit=crop")]', // Mountains
  'bg-[url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop")]', // Beach
  'bg-[url("https://images.unsplash.com/photo-1511300636408-a63a89df3482?q=80&w=1000&auto=format&fit=crop")]', // Geometric
  'bg-[url("https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1000&auto=format&fit=crop")]', // Classic Nature
  'bg-[url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop")]', // Bottle Green
  'bg-[url("https://images.unsplash.com/photo-1534067783865-24b510286010?q=80&w=1000&auto=format&fit=crop")]', // Dark Flowers
  'bg-[url("https://images.unsplash.com/photo-1604147706283-d7119b5b7ebc?q=80&w=1000&auto=format&fit=crop")]', // Abstract Paint
];
