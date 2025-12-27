import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

interface SidebarProps {
    side: 'left' | 'right';
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function Sidebar({ side, isOpen, onToggle, children, footer }: SidebarProps) {
    const isLeft = side === 'left';

    return (
        <div className="relative flex h-full shrink-0">
            <aside
                className={`transition-all duration-500 ease-in-out flex flex-col overflow-hidden border-white/5 bg-slate-950/50 backdrop-blur-xl ${isOpen ? 'w-80' : 'w-0'
                    } ${isLeft ? 'border-r' : 'border-l'}`}
            >
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isOpen && children}
                </div>
                {isOpen && footer && (
                    <div className="p-3 border-t border-white/5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/30">
                        {footer}
                    </div>
                )}
            </aside>

            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className={`absolute top-1/2 -translate-y-1/2 z-40 w-6 h-12 flex items-center justify-center glass-panel shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${isLeft
                        ? 'rounded-r-xl border-l-0 left-full -translate-x-full group-hover:left-full'
                        : 'rounded-l-xl border-r-0 right-full translate-x-full group-hover:right-full'
                    }`}
                style={{
                    [isLeft ? 'left' : 'right']: isOpen ? '100%' : '0',
                    transform: `translateY(-50%) ${!isOpen && !isLeft ? 'translateX(0)' : ''}`
                }}
            >
                {isLeft ? (
                    isOpen ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                ) : (
                    isOpen ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronLeft className="w-4 h-4 text-slate-400" />
                )}
            </button>
        </div>
    );
}
