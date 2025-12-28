import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings, Zap, ChevronRight, Activity, ArrowRight, Sun, Moon, Eye, Upload, Trash2
} from 'lucide-react';
import { useFlowStore } from '../store';
import { SettingsModal } from '../components/Settings';

export function Dashboard() {
    const navigate = useNavigate();
    const {
        savedDiagrams, theme, toggleTheme, deleteDiagram, clearAllDiagrams
    } = useFlowStore();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    // ... (keep handleFileSelect) ...

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            setUploadProgress(0);

            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setTimeout(() => navigate('/diagram'), 800);
                        return 100;
                    }
                    return prev + Math.random() * 30;
                });
            }, 80);
        }
    };

    return (
        <div className="h-screen bg-void text-primary overflow-hidden font-sans relative">
            {/* ... (keep background and header) ... */}
            {/* Top Navigation */}
            <header className="absolute top-0 left-0 right-0 h-20 px-12 flex items-center justify-between z-50">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-500">
                        <Zap className="w-4 h-4 text-white fill-white/20" />
                    </div>
                    <span className="text-xl font-display font-black tracking-tight">SystemArchitect</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface border titanium-border text-secondary hover:text-primary transition-all"
                    >
                        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`btn-ghost ${showSettings ? 'active' : ''}`}
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                </div>
            </header>

            {/* Floating Settings Panel */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />

            {/* Main Content Area */}
            <main className="min-h-screen flex flex-col items-center justify-start relative z-10 px-6 sm:px-12 pt-28 pb-24 overflow-y-auto">
                <div className="max-w-4xl w-full text-center mb-16 animate-slide-up">
                    <h1 className="text-7xl font-display font-black tracking-tighter leading-[0.9] mb-6 text-primary">
                        Design the <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Unseen logic</span>.
                    </h1>
                    <p className="text-lg text-secondary max-w-lg mx-auto leading-relaxed mb-12 italic">
                        Transform complex architectures into living, collaborative diagrams with the help of local neural vision.
                    </p>

                    <div className="flex flex-col items-center gap-8">
                        <div className="flex flex-wrap items-center justify-center gap-4 w-full max-w-2xl">
                            {/* ... (keep Upload and Direct Access buttons) ... */}
                            <button
                                className="btn-primary flex-1 min-w-[240px] group h-14"
                                onClick={() => !isUploading && document.getElementById('main-upload')?.click()}
                            >
                                {!isUploading ? (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Scan Architecture
                                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                ) : (
                                    <>
                                        <Activity className="w-4 h-4 animate-pulse" />
                                        Processing: {Math.round(uploadProgress)}%
                                    </>
                                )}
                            </button>

                            <button
                                className="btn-secondary flex-1 min-w-[240px] h-14 group"
                                onClick={() => navigate('/diagram')}
                            >
                                <Eye className="w-5 h-5 text-blue-500" />
                                Direct Access
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform opacity-40" />
                            </button>
                        </div>
                        <input id="main-upload" type="file" className="hidden" onChange={handleFileSelect} />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-tertiary">
                            Drop files anywhere or click to start
                        </p>
                    </div>
                </div>

                {/* Compact Recent Intelligence */}
                <div className="w-full max-w-5xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    {savedDiagrams.length > 0 && (
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete ALL saved diagrams?')) {
                                        clearAllDiagrams();
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-bold uppercase tracking-widest transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear All
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {savedDiagrams.length > 0 ? (
                            [...savedDiagrams].reverse().slice(0, 3).map((diagram) => (
                                <div
                                    key={diagram.id}
                                    className="glass-panel rounded-2xl p-6 flex items-center justify-between group cursor-pointer hover:border-blue-500/30 shadow-sm hover:shadow-xl transition-all relative overflow-hidden"
                                    onClick={() => navigate(`/diagram?id=${diagram.id}`)}
                                >
                                    <div className="flex items-center gap-4 overflow-hidden z-10 w-full pr-8">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                            <Activity className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                        </div>
                                        <div className="truncate text-left">
                                            <h4 className="font-bold text-sm truncate text-primary">{diagram.name}</h4>
                                            <p className="text-[9px] font-black text-tertiary uppercase tracking-widest">{diagram.nodes.filter(n => n.type !== 'group').length} Entities</p>
                                        </div>
                                    </div>

                                    {/* Delete Button (visible on hover) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteDiagram(diagram.id);
                                        }}
                                        className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 dark:hover:bg-red-500/20 transition-all z-20 hover:scale-110"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            [1, 2, 3].map(i => (
                                <div key={i} className="glass-panel border-dashed rounded-2xl p-6 opacity-20" />
                            ))
                        )}
                    </div>
                </div>

                {savedDiagrams.length > 3 && (
                    <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <button
                            onClick={() => navigate('/history')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-surface border titanium-border text-[10px] font-black uppercase tracking-widest text-tertiary hover:text-blue-500 hover:border-blue-500/30 transition-all hover:scale-105"
                        >
                            <span>Search Intelligence Archive</span>
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </main>

            {/* Status indicators */}
            <footer className="absolute bottom-10 left-12 flex items-center gap-10 text-[9px] font-black tracking-[0.3em] text-tertiary uppercase">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-px bg-slate-500/20" />
                    Neural Engine v3.1.2
                </div>
            </footer>
        </div>
    );
}
