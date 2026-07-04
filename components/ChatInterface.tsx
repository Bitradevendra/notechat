
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, User, ChatSettings, MessageType, USER_1_ID, USER_2_ID, AppTheme } from '../types';
import {
    getMessages, saveMessage, getSettings, saveSettings, setTypingStatus,
    STORAGE_KEY_TYPING, updateMessage, deleteMessageForEveryone, deleteMessageForMe,
    markMessagesAsRead, subscribe
} from '../services/storageService';
import SettingsModal from './SettingsModal';

interface ChatInterfaceProps {
    currentUser: User;
    onLogout: () => void;
}

const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '😡'];
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

const THEME_STYLES: Record<AppTheme, any> = {
    blue: { primary: 'bg-blue-500', gradient: 'from-blue-500 to-cyan-500', light: 'bg-blue-50', text: 'text-blue-500', border: 'border-blue-100', shadow: 'shadow-blue-300/40', bubble: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white', ring: 'focus:ring-blue-500' },
    rose: { primary: 'bg-rose-500', gradient: 'from-rose-500 to-pink-500', light: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-100', shadow: 'shadow-rose-300/40', bubble: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white', ring: 'focus:ring-rose-500' },
    purple: { primary: 'bg-purple-500', gradient: 'from-purple-500 to-violet-500', light: 'bg-purple-50', text: 'text-purple-500', border: 'border-purple-100', shadow: 'shadow-purple-300/40', bubble: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white', ring: 'focus:ring-purple-500' },
    green: { primary: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-100', shadow: 'shadow-emerald-300/40', bubble: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white', ring: 'focus:ring-emerald-500' },
    amber: { primary: 'bg-amber-500', gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-50', text: 'text-amber-500', border: 'border-amber-100', shadow: 'shadow-amber-300/40', bubble: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white', ring: 'focus:ring-amber-500' },
    myth: { primary: 'bg-teal-700', gradient: 'from-teal-700 to-emerald-600', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', shadow: 'shadow-teal-300/40', bubble: 'bg-gradient-to-r from-teal-700 to-emerald-600 text-white', ring: 'focus:ring-teal-700' },
    midnight: { primary: 'bg-indigo-900', gradient: 'from-indigo-900 to-slate-800', light: 'bg-slate-100', text: 'text-indigo-900', border: 'border-slate-200', shadow: 'shadow-indigo-300/40', bubble: 'bg-gradient-to-r from-indigo-900 to-slate-800 text-white', ring: 'focus:ring-indigo-900' },
    sunset: { primary: 'bg-orange-500', gradient: 'from-orange-500 to-rose-500', light: 'bg-orange-50', text: 'text-orange-500', border: 'border-orange-100', shadow: 'shadow-orange-300/40', bubble: 'bg-gradient-to-r from-orange-500 to-rose-500 text-white', ring: 'focus:ring-orange-500' }
};

const AudioPlayer: React.FC<{ src: string; isMe: boolean; theme: any }> = ({ src, isMe, theme }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(src);
        audioRef.current = audio;
        audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) setDuration(audio.duration); });
        audio.addEventListener('timeupdate', () => { if (isFinite(audio.currentTime) && isFinite(audio.duration)) setProgress((audio.currentTime / audio.duration) * 100); });
        audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
        return () => { audio.pause(); audio.src = ''; };
    }, [src]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (audioRef.current) {
            isPlaying ? audioRef.current.pause() : audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time: number) => {
        if (!isFinite(time)) return "0:00";
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="flex items-center gap-3 min-w-[200px] p-1 select-none">
            <button onClick={togglePlay} className={`p-2 rounded-full transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'}`}>
                {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <div className="flex-1 flex flex-col gap-1">
                <div className="w-full h-1 bg-black/20 dark:bg-white/20 rounded-full overflow-hidden"><div className={`h-full ${isMe ? 'bg-white' : theme.primary.replace('bg-', 'bg-')}`} style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}></div></div>
                <div className="flex justify-between text-[10px] opacity-80 font-mono"><span>{formatTime(audioRef.current?.currentTime || 0)}</span><span>{formatTime(duration)}</span></div>
            </div>
        </div>
    );
};

const renderContentWithLinks = (text: string, isMe: boolean, theme: any) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
        if (part.match(urlRegex)) return <a key={index} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={`underline break-all hover:opacity-80 font-medium ${isMe ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`}>{part}</a>;
        return part;
    });
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentUser, onLogout }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [settings, setSettings] = useState<ChatSettings | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [mediaToView, setMediaToView] = useState<{ content: string, type: MessageType, filename?: string } | null>(null);
    const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);

    // Recording State: 'idle' -> 'locked' (recording) -> 'review'
    const [recordingState, _setRecordingState] = useState<'idle' | 'locked' | 'review'>('idle');
    const recordingStateRef = useRef<'idle' | 'locked' | 'review'>('idle');
    const setRecordingState = (newState: any) => { recordingStateRef.current = newState; _setRecordingState(newState); };
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [micPermissionError, setMicPermissionError] = useState(false);
    const [reviewAudioUrl, setReviewAudioUrl] = useState<string | null>(null);
    const [reviewAudioBlob, setReviewAudioBlob] = useState<Blob | null>(null);

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);

    // Interaction State
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const urlCache = useRef<Record<string, string>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const galleryInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const cameraRecorderRef = useRef<MediaRecorder | null>(null);
    const videoChunksRef = useRef<Blob[]>([]);
    const shutterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const partnerId = currentUser.id === USER_1_ID ? USER_2_ID : USER_1_ID;
    const myself = currentUser;
    const partner = settings ? settings.users[partnerId] : { name: 'Partner', avatar: '' };
    const theme = THEME_STYLES[(settings?.themeColor) || 'blue'];

    // --- Blob Helpers ---
    const getMessageContent = (msg: Message): string => {
        if (msg.fileBlob) {
            if (!urlCache.current[msg.id]) {
                urlCache.current[msg.id] = URL.createObjectURL(msg.fileBlob);
            }
            return urlCache.current[msg.id];
        }
        return msg.content;
    };

    const allMessages = useMemo(() => [...messages, ...pendingMessages].sort((a, b) => a.timestamp - b.timestamp), [messages, pendingMessages]);

    useEffect(() => {
        const root = window.document.documentElement;
        if (settings?.themeMode === 'dark') root.classList.add('dark');
        else if (settings?.themeMode === 'light') root.classList.remove('dark');
        else { if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark'); else root.classList.remove('dark'); }
    }, [settings?.themeMode]);

    useEffect(() => {
        // Check if we've asked for permissions before
        const hasAsked = localStorage.getItem('duo_permissions_asked');
        if (!hasAsked) {
            setShowPermissionModal(true);
        }

        const loadData = async () => { setMessages(await getMessages()); setSettings(await getSettings()); };
        loadData();
        const unsubS = subscribe('settings', async () => setSettings(await getSettings()));
        const unsubM = subscribe('messages', async () => {
            const msgs = await getMessages();
            setMessages(msgs.filter(m => !m.deletedBy?.includes(currentUser.id)));
            if (document.hidden && Notification.permission === 'granted') {
                const last = msgs[msgs.length - 1];
                if (last && last.senderId === partnerId) new Notification('Notepad', { body: 'System backup updated.', icon: 'https://fonts.gstatic.com/s/i/materialicons/edit/v6/24px.svg' });
            }
        });
        return () => { unsubS(); unsubM(); };
    }, [currentUser.id, partnerId]);

    const handleRequestPermissions = async () => {
        try {
            if ('Notification' in window) {
                await Notification.requestPermission();
            }
            // Requesting media perms triggers the browser prompt. 
            // We stop them immediately as we just want the permission grant.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            stream.getTracks().forEach(t => t.stop());
        } catch (e) {
            console.warn("Permission initial request:", e);
            // Fallback: try just audio if video failed (e.g. no camera)
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
            } catch (e2) { }
        } finally {
            localStorage.setItem('duo_permissions_asked', 'true');
            setShowPermissionModal(false);
        }
    };

    useEffect(() => {
        const unreadExists = messages.some(m => m.senderId === partnerId && !m.read);
        if (unreadExists) markMessagesAsRead(partnerId);
    }, [messages, partnerId]);

    // Scroll to bottom logic
    useEffect(() => {
        if (!activeOptionId && !mediaToView && !messageToDelete && !isSearchOpen) {
            // Use 'auto' (instant) for initial load or large jumps, 'smooth' for new messages
            const behavior = messages.length > 0 ? 'smooth' : 'auto';

            // Small timeout to ensure DOM is ready
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); // Force instant scroll for now to be sure
            }, 100);
        }
    }, [allMessages.length, activeOptionId, recordingState, isAttachmentMenuOpen, mediaToView, replyingTo, messageToDelete]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [inputText]);

    const handleInputChange = (val: string) => {
        setInputText(val);
        if (!typingTimeoutRef.current) setTypingStatus(myself.id, true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { setTypingStatus(myself.id, false); typingTimeoutRef.current = null; }, 2000);
    };

    const sendMessage = async (type: MessageType, content: string, fileBlob?: Blob, fileName?: string, fileSize?: string) => {
        if (editingMessage) {
            const updated = { ...editingMessage, content, edited: true };
            await updateMessage(updated);
            setEditingMessage(null);
            setInputText('');
        } else {
            const replyContext = replyingTo ? { id: replyingTo.id, content: replyingTo.type === MessageType.TEXT ? replyingTo.content : `[${replyingTo.type}]`, type: replyingTo.type, senderName: replyingTo.senderId === myself.id ? 'You' : partner.name } : undefined;
            const newMsg: Message = {
                id: Date.now().toString(), senderId: myself.id, type, content, fileBlob, fileName, fileSize,
                timestamp: Date.now(), read: false, reactions: {}, replyTo: replyContext, status: 'sent'
            };
            await saveMessage(newMsg);
            setInputText('');
            setReplyingTo(null);
        }
        setIsAttachmentMenuOpen(false);
    };

    const processFile = (file: File) => {
        if (file.size > MAX_FILE_SIZE_BYTES) { alert(`File too large. Limit is 500MB.`); return; }
        const tempId = `temp-${Date.now()}`;
        const objectUrl = URL.createObjectURL(file);
        let type = MessageType.FILE;
        if (file.type.startsWith('image/')) type = MessageType.IMAGE;
        else if (file.type.startsWith('video/')) type = MessageType.VIDEO;
        else if (file.type.startsWith('audio/')) type = MessageType.AUDIO;
        const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`;

        setPendingMessages(prev => [...prev, { id: tempId, senderId: myself.id, type, content: objectUrl, fileName: file.name, fileSize: sizeStr, timestamp: Date.now(), read: false, status: 'sending' }]);
        setIsAttachmentMenuOpen(false);

        setTimeout(async () => {
            await sendMessage(type, '', file, file.name, sizeStr);
            setPendingMessages(prev => prev.filter(m => m.id !== tempId));
            URL.revokeObjectURL(objectUrl);
        }, 500);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''; };

    // --- Audio Logic ---
    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = null;
            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            mediaRecorderRef.current = null;
        }

        if (reviewAudioUrl) URL.revokeObjectURL(reviewAudioUrl);
        setReviewAudioUrl(null);
        setReviewAudioBlob(null);

        setRecordingState('idle');
        setRecordingDuration(0);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        audioChunksRef.current = [];
    };

    const startRecording = async () => {
        // 1. Clean up any existing state to avoid conflicts
        cancelRecording();

        try {
            // Request simple audio first
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream);
            mediaRecorderRef.current = rec;
            audioChunksRef.current = [];

            rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            rec.start();

            setRecordingState('locked');
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
        } catch (e: any) {
            console.error("Mic Access Error:", e);
            setMicPermissionError(true);
            setRecordingState('idle'); // Reset UI to allow retry

            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                alert("Microphone permission denied. Please allow access in your browser/device settings.");
            } else if (e.name === 'NotFoundError') {
                alert("No microphone found.");
            } else {
                alert("Could not access microphone: " + e.message);
            }
            setTimeout(() => setMicPermissionError(false), 3000);
        }
    };

    const stopRecordingAndReview = () => {
        if (!mediaRecorderRef.current) return;
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setReviewAudioBlob(blob);
            setReviewAudioUrl(URL.createObjectURL(blob));
            setRecordingState('review');
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };
        mediaRecorderRef.current.stop();
    };

    const sendReviewedAudio = () => {
        if (reviewAudioBlob) {
            sendMessage(MessageType.AUDIO, '', reviewAudioBlob, 'Voice Note');
            cancelRecording();
        }
    };

    // --- Camera Logic ---
    const startCamera = async () => {
        try {
            setIsCameraOpen(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode }, audio: true });
            setCameraStream(stream);
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
            setIsCameraOpen(false);
            alert("Camera access failed. Please check permissions.");
        }
    };
    const stopCamera = () => { cameraStream?.getTracks().forEach(t => t.stop()); setIsCameraOpen(false); setIsRecordingVideo(false); };
    const takePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (cameraFacingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
            ctx.drawImage(videoRef.current, 0, 0);
            canvas.toBlob(blob => { if (blob) sendMessage(MessageType.IMAGE, '', blob, 'photo.jpg'); }, 'image/jpeg', 0.8);
            stopCamera();
        }
    };
    const startVideoRecording = () => { if (!cameraStream) return; setIsRecordingVideo(true); videoChunksRef.current = []; const rec = new MediaRecorder(cameraStream); cameraRecorderRef.current = rec; rec.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data) }; rec.onstop = () => { const blob = new Blob(videoChunksRef.current, { type: 'video/webm' }); sendMessage(MessageType.VIDEO, '', blob, 'video.webm'); stopCamera(); }; rec.start(); videoTimerRef.current = setInterval(() => setVideoDuration(p => p + 1), 1000); };
    const stopVideoRecording = () => { cameraRecorderRef.current?.stop(); clearInterval(videoTimerRef.current!); setVideoDuration(0); };

    // --- Message Options ---
    const toggleReaction = async (msg: Message, emoji: string) => {
        const newReactions = { ...msg.reactions };
        if (newReactions[myself.id] === emoji) delete newReactions[myself.id]; else newReactions[myself.id] = emoji;
        await updateMessage({ ...msg, reactions: newReactions });
        setActiveOptionId(null);
    };

    const handleEdit = (msg: Message) => { setEditingMessage(msg); setInputText(msg.content); setActiveOptionId(null); textareaRef.current?.focus(); };
    const handleDeleteConfirm = (msg: Message) => { setMessageToDelete(msg); setShowDeleteConfirm(true); setActiveOptionId(null); };
    const performDelete = async (everyone: boolean) => {
        if (!messageToDelete) return;
        if (everyone) await deleteMessageForEveryone(messageToDelete.id);
        else await deleteMessageForMe(messageToDelete.id, myself.id);
        setMessageToDelete(null); setShowDeleteConfirm(false);
    };

    const updateSettings = async (s: ChatSettings) => { await saveSettings(s); setSettings(s); };

    if (!settings) return null;

    return (
        <div className={`flex flex-col h-screen ${settings.wallpaper.startsWith('bg-') ? settings.wallpaper : 'bg-cover bg-no-repeat bg-center'} font-sans relative`} style={!settings.wallpaper.startsWith('bg-') ? { backgroundImage: `url(${settings.wallpaper})`, backgroundSize: '100% 100%' } : {}}>

            {/* Permission Modal */}
            {showPermissionModal && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2 dark:text-white">Enable Permissions</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed">
                        To use voice notes, video messages, and receive notifications, please allow access when prompted.
                    </p>
                    <button
                        onClick={handleRequestPermissions}
                        className="w-full max-w-xs py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
                    >
                        Allow Access
                    </button>
                    <button
                        onClick={() => { localStorage.setItem('duo_permissions_asked', 'true'); setShowPermissionModal(false); }}
                        className="mt-6 text-sm text-slate-400 font-medium hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        Maybe Later
                    </button>
                </div>
            )}

            {/* --- Overlays --- */}
            {mediaToView && <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center animate-fadeIn" onClick={() => setMediaToView(null)}><div className="absolute top-4 right-4 flex gap-4"><a href={mediaToView.content} download={mediaToView.filename || 'media'} onClick={e => e.stopPropagation()} className="text-white p-2 bg-white/10 rounded-full hover:bg-white/20"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></a><button className="text-white p-2 bg-white/10 rounded-full hover:bg-white/20"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>{mediaToView.type === MessageType.IMAGE ? <img src={mediaToView.content} className="max-w-full max-h-[90vh] object-contain" /> : <video src={mediaToView.content} controls autoPlay className="max-w-full max-h-[90vh]" />}</div>}

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-modalScale">
                        <h3 className="text-lg font-bold mb-2 dark:text-white">Delete Message?</h3>
                        <p className="text-slate-500 text-sm mb-6">You can delete this message for yourself or for everyone in the chat.</p>
                        <div className="flex flex-col gap-2">
                            {messageToDelete?.senderId === myself.id && <button onClick={() => performDelete(true)} className="w-full py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors">Delete for Everyone</button>}
                            <button onClick={() => performDelete(false)} className="w-full py-3 bg-slate-100 dark:bg-slate-700 dark:text-white text-slate-700 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Delete for Me</button>
                            <button onClick={() => { setShowDeleteConfirm(false); setMessageToDelete(null); }} className="w-full py-3 text-slate-400 font-medium hover:text-slate-600">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {isCameraOpen && (
                <div className="fixed inset-0 z-[70] bg-black flex flex-col">
                    <video ref={videoRef} autoPlay playsInline muted className={`flex-1 object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white">
                        <button onClick={stopCamera} className="p-2 bg-black/40 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        {isRecordingVideo && <div className="px-3 py-1 bg-red-600 rounded-full font-mono text-sm animate-pulse">{new Date(videoDuration * 1000).toISOString().substr(14, 5)}</div>}
                        <button onClick={() => setCameraFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-2 bg-black/40 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                    </div>
                    <div className="p-8 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                        <button onMouseDown={(e) => { e.preventDefault(); shutterTimeoutRef.current = setTimeout(startVideoRecording, 300); }} onMouseUp={(e) => { e.preventDefault(); if (shutterTimeoutRef.current) clearTimeout(shutterTimeoutRef.current); if (isRecordingVideo) stopVideoRecording(); else takePhoto(); }} onTouchStart={(e) => { e.preventDefault(); shutterTimeoutRef.current = setTimeout(startVideoRecording, 300); }} onTouchEnd={(e) => { e.preventDefault(); if (shutterTimeoutRef.current) clearTimeout(shutterTimeoutRef.current); if (isRecordingVideo) stopVideoRecording(); else takePhoto(); }} className={`w-20 h-20 rounded-full border-4 border-white transition-all transform active:scale-95 ${isRecordingVideo ? 'bg-red-500 scale-110' : 'bg-white/20 hover:bg-white/30'}`}></button>
                    </div>
                </div>
            )}

            {/* --- Header --- */}
            <div className={`bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl border-b ${theme.border} dark:border-slate-700/50 p-4 flex flex-col gap-2 sticky top-0 z-30 shadow-sm`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src={partner.avatar} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                        <div><h3 className="font-bold text-lg dark:text-white">{partner.name}</h3><p className="text-xs text-slate-500 font-medium">{partnerTyping ? 'Typing...' : 'Online'}</p></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><svg className="w-6 h-6 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={2} /></svg></button>
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><svg className="w-6 h-6 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth={2} /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2} /></svg></button>
                        <button onClick={onLogout} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth={2} /></svg></button>
                    </div>
                </div>
                {isSearchOpen && <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search messages..." className="w-full bg-slate-100 dark:bg-slate-700 p-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />}
            </div>

            {/* --- Chat List --- */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" onClick={() => { setActiveOptionId(null); setIsAttachmentMenuOpen(false); }}>
                {allMessages.map((msg, i) => {
                    const isMe = msg.senderId === myself.id;
                    const contentUrl = getMessageContent(msg);
                    const showOptions = activeOptionId === msg.id;
                    const showDate = i === 0 || new Date(msg.timestamp).toDateString() !== new Date(allMessages[i - 1].timestamp).toDateString();

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && <div className="flex justify-center py-4"><span className="bg-slate-200/50 dark:bg-slate-700/50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest backdrop-blur-sm">{new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>}

                            <div ref={el => { messageRefs.current[msg.id] = el }} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group relative mb-1`}>
                                {/* Message Bubble */}
                                <div
                                    className={`relative px-3 py-1.5 max-w-[75%] rounded-2xl shadow-sm transition-all duration-200 ${isMe ? `${theme.bubble} rounded-tr-sm` : 'bg-white dark:bg-slate-800 dark:text-white rounded-tl-sm'} ${showOptions ? 'z-30 ring-2 ring-offset-2 ring-offset-transparent ring-blue-400' : 'z-0'}`}
                                    onClick={(e) => { e.stopPropagation(); setActiveOptionId(showOptions ? null : msg.id); }}
                                >
                                    {/* Reply Context */}
                                    {msg.replyTo && (
                                        <div className={`mb-1 px-2 py-1 rounded-lg text-[10px] border-l-2 opacity-90 ${isMe ? 'bg-black/10 border-white/50' : 'bg-slate-100 dark:bg-slate-700 border-blue-500'}`}>
                                            <p className="font-bold">{msg.replyTo.senderName}</p>
                                            <p className="truncate">{msg.replyTo.content}</p>
                                        </div>
                                    )}

                                    {msg.isDeletedForEveryone ? (
                                        <div className="flex items-center gap-2 text-sm italic opacity-70 py-1"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> This message was deleted</div>
                                    ) : (
                                        <>
                                            {msg.type === MessageType.TEXT && <p className="whitespace-pre-wrap text-[15px] leading-snug break-words">{renderContentWithLinks(msg.content, isMe, theme)}</p>}
                                            {msg.type === MessageType.IMAGE && <div className="mt-1"><img src={contentUrl} className="rounded-lg max-h-72 object-cover w-full cursor-pointer" onClick={(e) => { e.stopPropagation(); setMediaToView({ content: contentUrl, type: MessageType.IMAGE, filename: msg.fileName }); }} /></div>}
                                            {msg.type === MessageType.VIDEO && <div className="mt-1 relative cursor-pointer" onClick={(e) => { e.stopPropagation(); setMediaToView({ content: contentUrl, type: MessageType.VIDEO, filename: msg.fileName }); }}><video src={contentUrl} className="rounded-lg max-h-72 w-full object-cover" /><div className="absolute inset-0 flex items-center justify-center"><div className="bg-black/40 p-3 rounded-full"><svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg></div></div></div>}
                                            {msg.type === MessageType.AUDIO && <AudioPlayer src={contentUrl} isMe={isMe} theme={theme} />}
                                            {msg.type === MessageType.FILE && <div className="flex items-center gap-3 p-1"><div className="p-2 bg-black/10 rounded-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><div className="flex flex-col overflow-hidden"><a href={contentUrl} download={msg.fileName} onClick={e => e.stopPropagation()} className="font-medium underline truncate text-sm">{msg.fileName}</a><span className="text-[10px] opacity-70">{msg.fileSize}</span></div></div>}

                                            {msg.status === 'sending' && <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                                        </>
                                    )}

                                    <div className="flex items-end justify-between gap-2 mt-1 min-w-[50px]">
                                        <div className="flex gap-0.5">
                                            {msg.reactions && Object.entries(msg.reactions).map(([uid, emoji]) => (
                                                <span key={uid} className="text-[10px] bg-black/10 dark:bg-white/10 rounded-full px-1 py-0.5 animate-popIn">{emoji}</span>
                                            ))}
                                        </div>
                                        <div className="text-[9px] opacity-70 font-medium flex items-center gap-1">
                                            {msg.edited && <span>(edited)</span>}
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {isMe && (msg.status === 'sending' ? '...' : (msg.read ? <span className="text-pink-300">✓✓</span> : <span>✓✓</span>))}
                                        </div>
                                    </div>
                                </div>

                                {/* Options Menu */}
                                {showOptions && !msg.isDeletedForEveryone && (
                                    <div className={`absolute top-full ${isMe ? 'right-0' : 'left-0'} mt-1 z-40 bg-white dark:bg-slate-700 rounded-xl shadow-xl p-2 animate-popIn flex flex-col gap-1 min-w-[150px]`}>
                                        <div className="flex justify-between p-1 bg-slate-50 dark:bg-slate-600 rounded-lg mb-1">
                                            {EMOJIS.map(emoji => <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg, emoji); }} className="hover:scale-125 transition-transform text-lg p-0.5">{emoji}</button>)}
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setActiveOptionId(null); textareaRef.current?.focus(); }} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-sm text-left dark:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg> Reply</button>
                                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content); setActiveOptionId(null); }} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-sm text-left dark:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy</button>
                                        {isMe && msg.type === MessageType.TEXT && <button onClick={(e) => { e.stopPropagation(); handleEdit(msg); }} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg text-sm text-left dark:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Edit</button>}
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteConfirm(msg); }} className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm text-left text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete</button>
                                    </div>
                                )}
                            </div>
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* --- Input Area --- */}
            <div className={`bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl p-3 sticky bottom-0 z-40 border-t ${theme.border} dark:border-slate-700`}>
                {replyingTo && (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-2 rounded-t-xl border-l-4 border-blue-500 mb-2">
                        <div className="text-sm overflow-hidden"><p className="font-bold text-blue-500">Replying to {replyingTo.senderId === myself.id ? 'Yourself' : partner.name}</p><p className="truncate text-slate-500 dark:text-slate-300">{replyingTo.content}</p></div>
                        <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full"><svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}

                {isAttachmentMenuOpen && (
                    <div className="absolute bottom-20 left-4 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl flex flex-col gap-2 animate-popIn">
                        <button onClick={() => { startCamera(); setIsAttachmentMenuOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><div className="p-2 bg-pink-100 text-pink-500 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg></div><span className="font-medium dark:text-white">Camera</span></button>
                        <button onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><div className="p-2 bg-purple-100 text-purple-500 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><span className="font-medium dark:text-white">Gallery</span></button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><div className="p-2 bg-blue-100 text-blue-500 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><span className="font-medium dark:text-white">Files</span></button>
                    </div>
                )}
                <input type="file" ref={galleryInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="*/*" className="hidden" />

                {recordingState === 'review' ? (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl animate-slideUp">
                        <button onClick={cancelRecording} className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500" title="Delete Recording"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        <div className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-between">
                            {reviewAudioUrl && <audio src={reviewAudioUrl} controls className="h-8 w-full" />}
                        </div>
                        <button onClick={sendReviewedAudio} className="p-3 bg-blue-500 text-white rounded-full shadow-lg" title="Send Recording"><svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                    </div>
                ) : recordingState === 'locked' ? (
                    <div className="flex items-center gap-4 p-2 bg-slate-50 dark:bg-slate-800 rounded-full animate-slideUp">
                        <div className="flex-1 flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="font-mono text-red-500 font-bold">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                            <div className="flex-1 h-8 flex items-center gap-0.5 opacity-50"><div className="w-1 h-4 bg-red-400 rounded-full animate-pulse"></div><div className="w-1 h-6 bg-red-400 rounded-full animate-pulse delay-75"></div><div className="w-1 h-3 bg-red-400 rounded-full animate-pulse delay-150"></div><div className="w-1 h-5 bg-red-400 rounded-full animate-pulse delay-100"></div></div>
                        </div>
                        <button onClick={stopRecordingAndReview} className="w-10 h-10 flex items-center justify-center bg-red-500 rounded-full shadow-lg hover:scale-105 transition-transform" title="Stop Recording"><div className="w-4 h-4 bg-white rounded-sm"></div></button>
                    </div>
                ) : (
                    <div className="flex gap-2 items-end">
                        <button onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"><svg className={`w-6 h-6 transition-transform ${isAttachmentMenuOpen ? 'rotate-45' : ''} text-slate-500 dark:text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-[24px] flex items-center px-4 py-2 border border-transparent focus-within:border-blue-400 transition-colors">
                            <textarea ref={textareaRef} value={inputText} onChange={e => handleInputChange(e.target.value)} placeholder="Message" className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[24px] py-1 dark:text-white scrollbar-hide" rows={1} />
                        </div>
                        {inputText ? (
                            <button onClick={() => sendMessage(MessageType.TEXT, inputText)} className={`p-3 rounded-full text-white shadow-lg transform active:scale-90 transition-all ${theme.primary}`}><svg className="w-6 h-6 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                        ) : (
                            <button onClick={(e) => { e.preventDefault(); startRecording() }} className="p-3 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors active:scale-95" title="Record Voice Note"><svg className="w-6 h-6 text-slate-600 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                        )}
                    </div>
                )}
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} currentUser={myself} settings={settings} onUpdateSettings={updateSettings} />
        </div>
    );
};

export default ChatInterface;
