import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useVisualOrganizer } from '../hooks/useVisualOrganizer';
import { useDiagramStore } from '../store';
import { Sparkles, Wand2, Scan, CheckCircle2, X } from 'lucide-react';
import type { LayoutSuggestion } from '../types/visualOrganization';

export const VisualOrganizerFAB: React.FC = () => {
    const { analyzeLayout, generateSuggestions, applySuggestion } = useVisualOrganizer();
    const { nodes, edges, setNodes, setEdges } = useDiagramStore();

    // UI States
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'applied'>('idle');
    const [bestSuggestion, setBestSuggestion] = useState<LayoutSuggestion | null>(null);
    const [snapshot, setSnapshot] = useState<{ nodes: any[], edges: any[] } | null>(null);

    const handleAIOrganize = async () => {
        setStatus('analyzing');
        setIsOpen(true);

        analyzeLayout();

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const results = await generateSuggestions();

            if (results.length > 0) {
                setBestSuggestion(results[0]);
                setStatus('ready');
            } else {
                setStatus('idle');
                // Could show a generic "No suggestions" toast here
                setIsOpen(false);
            }
        } catch (error) {
            console.error(error);
            setStatus('idle');
            setIsOpen(false);
        }
    };

    const handleApply = () => {
        if (!bestSuggestion) return;
        setSnapshot({ nodes: [...nodes], edges: [...edges] });
        applySuggestion(bestSuggestion);
        setStatus('applied');
    };

    const handleUndo = () => {
        if (snapshot) {
            setNodes(snapshot.nodes);
            setEdges(snapshot.edges);
            setSnapshot(null);
            setStatus('ready');
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        if (status === 'applied') {
            setStatus('idle');
            setSnapshot(null);
            setBestSuggestion(null);
        }
    };

    // If closed, show just the FAB
    if (!isOpen) {
        return (
            <button
                onClick={handleAIOrganize}
                className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/30 shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center group transition-all hover:scale-110 active:scale-95"
                title="AI Visual Organizer"
            >
                <Sparkles className="w-5 h-5 text-indigo-500 group-hover:rotate-12 transition-transform" />
            </button>
        );
    }

    // Expanded State (Floating Card)
    return (
        <div className="relative animate-in slide-in-from-bottom-4 fade-in duration-300">
            <Card className="w-80 p-0 overflow-hidden shadow-2xl border-indigo-100 dark:border-indigo-900/30">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Organizer</span>
                    </div>
                    <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {status === 'analyzing' && (
                        <div className="flex flex-col items-center py-4 space-y-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Scan className="w-6 h-6 text-indigo-500 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-xs font-medium text-slate-500 animate-pulse">Analyzing structure...</p>
                        </div>
                    )}

                    {status === 'ready' && bestSuggestion && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Optimization Ready</h4>
                                <p className="text-xs text-slate-500 mt-1">{bestSuggestion.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="secondary" onClick={handleClose}>Cancel</Button>
                                <Button size="sm" onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-500 text-white">Apply</Button>
                            </div>
                        </div>
                    )}

                    {status === 'applied' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Clean & Organized!</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button size="sm" variant="secondary" onClick={handleUndo}>Undo</Button>
                                <Button size="sm" onClick={handleClose} className="bg-slate-900 text-white dark:bg-white dark:text-slate-900">Done</Button>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
