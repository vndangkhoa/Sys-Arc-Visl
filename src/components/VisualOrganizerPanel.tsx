import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useVisualOrganizer } from '../hooks/useVisualOrganizer';
import { useDiagramStore } from '../store';
import { Sparkles, Wand2, Layout, Scan, CheckCircle2, RotateCcw } from 'lucide-react';
import type { LayoutSuggestion } from '../types/visualOrganization';

export const VisualOrganizerPanel: React.FC = () => {
    const { analyzeLayout, generateSuggestions, applySuggestion } = useVisualOrganizer();
    const { nodes, edges, setNodes, setEdges } = useDiagramStore();

    // UI States
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'applied'>('idle');
    const [bestSuggestion, setBestSuggestion] = useState<LayoutSuggestion | null>(null);
    const [snapshot, setSnapshot] = useState<{ nodes: any[], edges: any[] } | null>(null);

    // AI Organize Handler
    const handleAIOrganize = async () => {
        setStatus('analyzing');

        // 1. Analyze (Simulate brief delay for effect)
        analyzeLayout();

        // 2. Generate Suggestions
        try {
            // Artificial delay for "Scanning" animation effect
            await new Promise(resolve => setTimeout(resolve, 1500));

            const results = await generateSuggestions();

            // Pick best suggestion (or default to first non-current)
            if (results.length > 0) {
                setBestSuggestion(results[0]);
                setStatus('ready');
            } else {
                // Fallback if no suggestions
                setStatus('idle');
            }
        } catch (error) {
            console.error(error);
            setStatus('idle');
        }
    };

    const handleApply = () => {
        if (!bestSuggestion) return;

        // Take snapshot before applying
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

    const handleReset = () => {
        setStatus('idle');
        setSnapshot(null);
        setBestSuggestion(null);
    };

    return (
        <div className="visual-organizer-panel w-full">
            <Card className="p-0 overflow-hidden border-none shadow-none bg-transparent">

                {/* IDLE STATE: Main AI Button */}
                {status === 'idle' && (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
                        <div className="relative group cursor-pointer" onClick={handleAIOrganize}>
                            <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
                            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-all duration-300 border border-white/20">
                                <Sparkles className="w-10 h-10 text-white animate-pulse" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-100 dark:border-slate-700">
                                <Wand2 className="w-4 h-4 text-purple-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white">AI Visual Organizer</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                                Click to instantly analyze and reorganize your flow for maximum clarity.
                            </p>
                        </div>

                        <Button
                            onClick={handleAIOrganize}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 hover:dark:bg-slate-100 px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all font-bold tracking-wide"
                        >
                            <Scan className="w-4 h-4 mr-2" />
                            Start Organization
                        </Button>
                    </div>
                )}

                {/* ANALYZING STATE: Scanning Animation */}
                {status === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Scan className="w-8 h-8 text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                            Analyzing Layout Logic...
                        </h3>
                    </div>
                )}

                {/* READY STATE: Suggestion Found */}
                {status === 'ready' && bestSuggestion && (
                    <div className="flex flex-col p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 text-green-600 dark:text-green-400 mb-2">
                            <CheckCircle2 className="w-6 h-6" />
                            <span className="font-bold text-lg">Optimization Found!</span>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                            <div className="flex items-center gap-3 mb-2">
                                <Layout className="w-5 h-5 text-indigo-500" />
                                <h4 className="font-bold">{bestSuggestion.title}</h4>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                {bestSuggestion.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={handleReset}
                                variant="secondary"
                                className="h-12"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleApply}
                                className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/25"
                            >
                                <Wand2 className="w-4 h-4 mr-2" />
                                Apply Magic
                            </Button>
                        </div>
                    </div>
                )}

                {/* APPLIED STATE: Success & Undo */}
                {status === 'applied' && (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Beautifully Organized!</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Your graph has been transformed.
                            </p>
                        </div>

                        <div className="flex gap-3 w-full">
                            <Button
                                onClick={handleUndo}
                                variant="secondary"
                                className="flex-1 h-12 border-slate-200 dark:border-white/10 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:text-red-400 transition-colors"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Undo
                            </Button>
                            <Button
                                onClick={handleReset} // Goes back to idle
                                className="flex-1 h-12"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                )}

            </Card>
        </div>
    );
};
