
import React, { useState } from 'react';
import { PASSWORDS } from '../constants';
import { USER_1_ID, USER_2_ID } from '../types';

interface LoginScreenProps {
  onLogin: (userId: string, mode: 'chat' | 'notepad') => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 4) setPin(val);
    setError(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin === PASSWORDS[USER_1_ID]) {
      onLogin(USER_1_ID, 'chat');
    } else if (pin === PASSWORDS[USER_2_ID]) {
      onLogin(USER_2_ID, 'chat');
    } 
    else if (pin === PASSWORDS['NOTEPAD']) {
        onLogin('guest', 'notepad');
    }
    else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-yellow-50 mb-4">
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">My Notes</h2>
          <p className="text-gray-400 text-sm mt-1">Locked Notes Storage</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <label className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Enter PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={handlePinChange}
            className={`w-2/3 bg-gray-100 text-center text-3xl tracking-[0.5em] text-gray-800 py-3 rounded-lg border-2 outline-none transition-all ${
              error ? 'border-red-400 bg-red-50' : 'border-transparent focus:bg-white focus:border-yellow-400 shadow-inner'
            }`}
            placeholder="••••"
            autoFocus
          />
          
          {error && (
            <p className="text-red-500 text-xs mt-3 font-medium">
              Incorrect PIN.
            </p>
          )}

          <button
            type="submit"
            className="mt-8 w-full bg-gray-900 text-white py-3 rounded-lg font-medium shadow-lg hover:bg-gray-800 transition-all active:scale-95"
          >
            Unlock
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-300">Secure Local Storage v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
