
import React from 'react';

export function OrchestratorLoader() {
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className="relative w-16 h-16 mb-8">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse-slow" />

                {/* Rotating Diamond */}
                <div className="absolute inset-0 m-auto w-8 h-8 border-[3px] border-blue-500 rounded-lg animate-spin-slow shadow-[0_0_15px_rgba(59,130,246,0.5)] transform rotate-45" />

                {/* Inner accent (optional, based on image "feel") */}
                <div className="absolute inset-0 m-auto w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-20" />
            </div>

            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] animate-pulse">
                Orchestrating logic
            </p>
        </div>
    );
}
