
import React, { useState, useEffect } from 'react';
import { getNotes, saveNote, deleteNote, subscribe } from '../services/storageService';
import { Note } from '../types';

const NotepadInterface: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        getNotes().then(setNotes);
        const unsub = subscribe('notes', () => getNotes().then(setNotes));
        return unsub;
    }, []);

    const handleSave = async () => {
        if (!title.trim() && !content.trim()) return;
        const note: Note = {
            id: selectedNote?.id || Date.now().toString(),
            title: title || 'Untitled Note',
            content: content,
            timestamp: Date.now()
        };
        await saveNote(note);
        setIsEditing(false);
        setSelectedNote(null);
    };

    const handleCreate = () => { setSelectedNote(null); setTitle(''); setContent(''); setIsEditing(true); };

    const handleSelect = (note: Note) => { setSelectedNote(note); setTitle(note.title); setContent(note.content); setIsEditing(true); };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm("Delete this note?")) {
            await deleteNote(id);
            if(selectedNote?.id === id) { setIsEditing(false); setSelectedNote(null); }
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    if (isEditing) {
        return (
            <div className="min-h-screen bg-yellow-50 flex flex-col font-sans">
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <span className="font-bold text-gray-700">{selectedNote ? 'Edit Note' : 'New Note'}</span>
                    <button onClick={handleSave} className="text-yellow-600 font-bold hover:bg-yellow-100 px-4 py-1.5 rounded-full transition-colors">Save</button>
                </div>
                <div className="flex-1 p-6 max-w-3xl mx-auto w-full flex flex-col gap-4">
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="text-2xl font-bold bg-transparent border-none focus:ring-0 placeholder-gray-300 p-0 text-gray-800" />
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Start typing..." className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-0 text-gray-600 leading-relaxed text-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-800">Notes</h1>
                <button onClick={onLogout} className="text-sm text-gray-400 hover:text-red-500">Lock</button>
            </div>
            <div className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto">
                <button onClick={handleCreate} className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all group h-40">
                    <div className="p-3 bg-gray-100 rounded-full group-hover:bg-yellow-200 group-hover:text-yellow-700 transition-colors"><svg className="w-6 h-6 text-gray-400 group-hover:text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                    <span className="mt-2 text-sm font-semibold text-gray-400 group-hover:text-yellow-700">Create New</span>
                </button>
                {notes.map(note => (
                    <div key={note.id} onClick={() => handleSelect(note)} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group cursor-pointer h-40 flex flex-col">
                        <h3 className="font-bold text-gray-800 mb-2 truncate pr-8">{note.title}</h3>
                        <p className="text-gray-500 text-sm line-clamp-3 flex-1">{note.content || "No content"}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50"><span className="text-[10px] text-gray-400">{formatDate(note.timestamp)}</span></div>
                        <button onClick={(e) => handleDelete(e, note.id)} className="absolute top-3 right-3 p-2 bg-white hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full shadow-sm border border-transparent hover:border-red-100 transition-all z-20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default NotepadInterface;
