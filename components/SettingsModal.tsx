
import React, { useState, useRef, useEffect } from 'react';
import { ChatSettings, User, USER_1_ID, USER_2_ID, AppTheme, ThemeMode } from '../types';
import { WALLPAPERS } from '../constants';
import { clearChat, exportAllData, importData } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: ChatSettings;
  onUpdateSettings: (newSettings: ChatSettings) => void;
}

const THEMES: { id: AppTheme; name: string; color: string }[] = [
  { id: 'blue', name: 'Ocean', color: 'bg-blue-500' },
  { id: 'rose', name: 'Romance', color: 'bg-rose-500' },
  { id: 'purple', name: 'Royal', color: 'bg-purple-500' },
  { id: 'green', name: 'Nature', color: 'bg-emerald-500' },
  { id: 'amber', name: 'Warmth', color: 'bg-amber-500' },
  { id: 'myth', name: 'Myth', color: 'bg-teal-700' },
  { id: 'midnight', name: 'Midnight', color: 'bg-indigo-900' },
  { id: 'sunset', name: 'Sunset', color: 'bg-orange-500' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdateSettings
}) => {
  const partnerId = currentUser.id === USER_1_ID ? USER_2_ID : USER_1_ID;
  const partner = settings.users[partnerId];

  const [name, setName] = useState(currentUser.name);
  const [partnerName, setPartnerName] = useState(partner.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [importing, setImporting] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setAvatarUrl(currentUser.avatar);
      setPartnerName(partner.name);
    }
  }, [isOpen, currentUser, partner]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedUsers = {
      ...settings.users,
      [currentUser.id]: { ...currentUser, name, avatar: avatarUrl },
      [partnerId]: { ...partner, name: partnerName }
    };
    onUpdateSettings({ ...settings, users: updatedUsers });
    onClose();
  };

  const handleWallpaperSelect = (wp: string) => onUpdateSettings({ ...settings, wallpaper: wp });
  const handleThemeSelect = (theme: AppTheme) => onUpdateSettings({ ...settings, themeColor: theme });
  const handleModeSelect = (mode: ThemeMode) => onUpdateSettings({ ...settings, themeMode: mode });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'wallpaper') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'avatar') setAvatarUrl(reader.result as string);
      else handleWallpaperSelect(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearChat = async () => {
    if (window.confirm("Delete all messages? Cannot be undone.")) {
      await clearChat();
      onClose();
    }
  };

  const handleExport = () => {
      exportAllData();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (window.confirm("Importing data will overwrite existing messages and notes. Continue?")) {
          setImporting(true);
          const success = await importData(file);
          setImporting(false);
          if (success) {
              alert("Data restored successfully!");
              onClose();
          } else {
              alert("Failed to restore data. Check file format.");
          }
      }
      e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-modalScale">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/50 backdrop-blur">
          <h2 className="text-xl font-bold dark:text-white">Customize</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 scrollbar-thin">
           {/* Identity Section */}
           <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identity</h3>
            <div className="flex items-center gap-6">
              <div className="relative group cursor-pointer w-20 h-20 shrink-0" onClick={() => avatarInputRef.current?.click()}>
                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-md" />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              </div>
              <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} accept="image/*" className="hidden" />
              
              <div className="flex-1 space-y-3">
                 <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500" placeholder="Your Name" />
                 <input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500" placeholder="Partner's Nickname" />
              </div>
            </div>
           </section>

           <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Appearance</h3>
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                 {['light', 'system', 'dark'].map((mode) => (
                    <button key={mode} onClick={() => handleModeSelect(mode as ThemeMode)} className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${settings.themeMode === mode ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{mode}</button>
                 ))}
              </div>
              <div className="grid grid-cols-4 gap-3">
                  {THEMES.map((theme) => (
                      <button key={theme.id} onClick={() => handleThemeSelect(theme.id)} className={`flex flex-col items-center gap-2 group`}>
                          <div className={`w-10 h-10 rounded-full ${theme.color} transition-transform ${settings.themeColor === theme.id ? 'scale-110 ring-2 ring-slate-400' : 'hover:scale-105'}`}></div>
                          <span className={`text-[10px] font-bold ${settings.themeColor === theme.id ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{theme.name}</span>
                      </button>
                  ))}
              </div>
           </section>

           {/* Wallpaper Section */}
           <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wallpaper</h3>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => wallpaperInputRef.current?.click()} className="h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="text-[10px] font-bold text-slate-500">Upload</span>
              </button>
              <input type="file" ref={wallpaperInputRef} onChange={(e) => handleFileChange(e, 'wallpaper')} accept="image/*" className="hidden" />

              {WALLPAPERS.map((wp, idx) => (
                <button key={idx} onClick={() => handleWallpaperSelect(wp)} className={`h-20 rounded-xl shadow-sm border-2 transition-all overflow-hidden relative ${settings.wallpaper === wp ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:scale-105'} ${wp.startsWith('bg-') ? wp : 'bg-cover bg-center'}`} style={!wp.startsWith('bg-') ? {backgroundImage: wp.replace('bg-[url("','').replace('")]','')} : {}}>
                    {settings.wallpaper === wp && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"><svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                </button>
              ))}
            </div>
           </section>

          <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Backup & Restore</h3>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={handleExport} className="py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-semibold text-slate-700 dark:text-white hover:bg-slate-200 transition-colors">Export Data</button>
                <button onClick={() => importInputRef.current?.click()} className="py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-semibold text-slate-700 dark:text-white hover:bg-slate-200 transition-colors">{importing ? "Restoring..." : "Import Data"}</button>
                <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
            </div>
          </section>

          <section className="pt-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={handleClearChat} className="w-full py-3 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl">Clear Chat History</button>
          </section>
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button onClick={handleSave} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
export default SettingsModal;
