import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#f0f0f0] dark:bg-slate-900 flex items-center justify-center z-50">
      <div className="relative w-full max-w-sm h-32 flex items-center justify-center overflow-hidden">
        <svg 
            viewBox="0 0 500 150" 
            className="w-full h-full drop-shadow-lg"
            preserveAspectRatio="none"
        >
            <path 
                d="M0,75 L150,75 L170,20 L190,130 L210,75 L500,75" 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-draw"
                style={{
                    strokeDasharray: 1000,
                    strokeDashoffset: 1000
                }}
            />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-r from-[#f0f0f0] via-transparent to-[#f0f0f0] dark:from-slate-900 dark:via-transparent dark:to-slate-900"></div>
      </div>
    </div>
  );
};

export default LoadingScreen;