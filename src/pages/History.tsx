import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Search, Trash2, Activity, Clock,
    ArrowRight, Zap, Filter
} from 'lucide-react';
import { useFlowStore } from '../store';

export function History() {
    const navigate = useNavigate();
    const { savedDiagrams, deleteDiagram } = useFlowStore();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredDiagrams = useMemo(() => {
        return [...savedDiagrams]
            .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .reverse();
    }, [savedDiagrams, searchQuery]);

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this intelligence draft?')) {
            deleteDiagram(id);
        }
    };

    return (
        <div className="h-screen bg-void text-primary overflow-hidden font-sans relative flex flex-col">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-indigo-500/5 blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="h-20 px-12 flex items-center justify-between z-10 border-b titanium-border bg-surface/50 backdrop-blur-md">
                <div className="flex items-center gap-8">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface border titanium-border text-secondary hover:text-primary transition-all hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Zap className="w-4 h-4 text-white fill-white/20" />
                        </div>
                        <h1 className="text-lg font-display font-black tracking-tight">Intelligence Archive</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-xl mx-12">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Find specific logic draft..."
                            className="w-full bg-void/30 border titanium-border rounded-2xl py-2.5 pl-12 pr-4 text-sm outline-none focus:border-blue-500/50 transition-all text-primary"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border titanium-border text-[9px] font-black uppercase tracking-widest text-tertiary">
                        <Filter className="w-3 h-3" />
                        <span>{filteredDiagrams.length} Results</span>
                    </div>
                </div>
            </header>

            {/* Content List */}
            <main className="flex-1 overflow-y-auto p-12 relative z-10 hide-scrollbar">
                {filteredDiagrams.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto animate-slide-up">
                        {filteredDiagrams.map((diagram) => (
                            <div
                                key={diagram.id}
                                onClick={() => navigate(`/diagram?id=${diagram.id}`)}
                                className="group relative glass-panel rounded-3xl p-6 border titanium-border hover:border-blue-500/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-2xl hover:-translate-y-1"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Activity className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, diagram.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="space-y-1 mb-6">
                                    <h4 className="font-bold text-base truncate text-primary pr-4">{diagram.name}</h4>
                                    <div className="flex items-center gap-2 text-[10px] text-tertiary font-bold uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(diagram.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-500/5">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                                        {diagram.nodes.filter(n => n.type !== 'group').length} Entities
                                    </span>
                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase text-tertiary group-hover:text-blue-500 transition-colors">
                                        <span>Restore</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-center leading-relaxed">
                            {searchQuery ? 'No intelligence matching your query' : 'Your intelligence archive is empty'}
                        </p>
                    </div>
                )}
            </main>

            {/* Footer Statistics */}
            <footer className="h-12 border-t titanium-border bg-surface/50 backdrop-blur-md flex items-center justify-center px-12 z-10">
                <p className="text-[9px] font-black text-tertiary uppercase tracking-[0.5em]">
                    Active Persistence Engine • v3.1.2 • Total Capacity: {savedDiagrams.length}/100
                </p>
            </footer>
        </div>
    );
}
