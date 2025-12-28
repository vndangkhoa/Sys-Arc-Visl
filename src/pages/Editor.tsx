import { ReactFlowProvider } from '@xyflow/react';
import { InputPanel } from '../components/InputPanel';
import { FlowCanvas } from '../components/FlowCanvas';
import { NodeDetailsPanel } from '../components/NodeDetailsPanel';
import InteractiveLegend from '../components/InteractiveLegend';
import OnboardingTour from '../components/OnboardingTour';
import { useFlowStore } from '../store';
import { useMobileDetect } from '../hooks/useMobileDetect';
import { useState, useCallback, useEffect, useRef } from 'react';
import { PanelLeft, PanelRight, Zap, Sparkles, Minimize2, X } from 'lucide-react';
import { OrchestratorLoader } from '../components/ui/OrchestratorLoader';
import { EditorHeader } from '../components/editor/EditorHeader';
import { VisualOrganizerFAB } from '../components/VisualOrganizerFAB';
import { useDiagramAPI } from '../hooks/useDiagramAPI';

export function Editor() {
    // Enable Programmatic API
    useDiagramAPI();

    const { nodes, isLoading, leftPanelOpen, setLeftPanelOpen, rightPanelOpen, setRightPanelOpen, focusMode, setFocusMode, mobileEditorOpen, setMobileEditorOpen } = useFlowStore();
    const { isMobile } = useMobileDetect();
    const [sidebarWidth, setSidebarWidth] = useState(384); // Default w-96
    const isResizing = useRef(false);
    const hasInitializedMobile = useRef(false);

    // Mobile: Hide panels by default on mount
    useEffect(() => {
        if (isMobile && !hasInitializedMobile.current) {
            setLeftPanelOpen(false);
            setRightPanelOpen(false);
            hasInitializedMobile.current = true;
        }
    }, [isMobile, setLeftPanelOpen, setRightPanelOpen]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = Math.min(Math.max(e.clientX, 300), 700);
        setSidebarWidth(newWidth);
    }, []);

    // Cleanup listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);

    return (
        <ReactFlowProvider>
            <div className="h-screen w-screen flex flex-col bg-void text-primary overflow-hidden font-sans relative">
                {!focusMode && <EditorHeader />}

                {/* Exit Focus Mode Trigger */}
                {focusMode && (
                    <button
                        onClick={() => setFocusMode(false)}
                        className="absolute top-6 right-6 z-[100] w-10 h-10 glass-panel rounded-xl flex items-center justify-center text-blue-500 hover:scale-110 transition-all shadow-2xl animate-fade-in border-blue-500/20"
                        title="Exit Focus Mode"
                    >
                        <Minimize2 className="w-5 h-5" />
                    </button>
                )}

                <div className="flex-1 flex overflow-hidden relative z-10">
                    {/* Left Resizable Panel */}
                    <div
                        className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] border-r border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/95 backdrop-blur-xl relative flex flex-col ${(leftPanelOpen && !focusMode) ? 'opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
                        style={{ width: (leftPanelOpen && !focusMode) ? sidebarWidth : 0 }}
                    >
                        {/* System Architect Header */}
                        <div className="h-12 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-blue-500/10">
                                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-tertiary">System Architect</span>
                            </div>
                            <button
                                onClick={() => setLeftPanelOpen(false)}
                                className="text-slate-400 dark:text-tertiary hover:text-slate-600 dark:hover:text-primary transition-colors"
                            >
                                <PanelLeft className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col relative overflow-hidden" style={{ width: sidebarWidth }}>
                            <div className="flex-1 overflow-y-auto hide-scrollbar">
                                <InputPanel />
                            </div>
                        </div>

                        {/* Resize Handle */}
                        {leftPanelOpen && (
                            <div
                                onMouseDown={startResizing}
                                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/30 transition-colors z-[100] group"
                            >
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-slate-200 dark:bg-slate-500/20 group-hover:bg-blue-500 rounded-full transition-colors" />
                            </div>
                        )}
                    </div>


                    {(!leftPanelOpen && !focusMode && !isMobile) && (
                        <button
                            onClick={() => setLeftPanelOpen(true)}
                            className="absolute left-6 top-1/2 -translate-y-1/2 z-40 w-10 h-10 glass-panel rounded-xl flex items-center justify-center text-slate-500 dark:text-secondary hover:text-blue-500 hover:scale-110 transition-all shadow-xl bg-white/80 dark:bg-slate-900/50 border border-black/5 dark:border-white/10"
                        >
                            <PanelLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Panoramic Canvas */}
                    <main className="flex-1 relative overflow-hidden">
                        <FlowCanvas />

                        <InteractiveLegend />
                        <OnboardingTour />

                        {/* Loading State */}
                        {isLoading && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl animate-fade-in">
                                <OrchestratorLoader />
                            </div>
                        )}

                        {/* Empty Workspace - Hidden on mobile (FAB provides access) */}
                        {nodes.length === 0 && !isLoading && !isMobile && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="text-center p-12 floating-glass rounded-[2.5rem] max-w-sm pointer-events-auto shadow-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-600/20">
                                        <Zap className="w-6 h-6 text-white fill-white/20" />
                                    </div>
                                    <h2 className="text-xl font-display font-black tracking-tight text-slate-800 dark:text-primary mb-2">Void Canvas Ready</h2>
                                    <p className="text-slate-500 dark:text-secondary text-[11px] leading-relaxed mb-6 italic">
                                        Initialize the interface via the terminal or drop a blueprint to begin neural synthesis.
                                    </p>
                                    {!leftPanelOpen && (
                                        <button
                                            onClick={() => setLeftPanelOpen(true)}
                                            className="btn-primary w-full py-2.5"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Engage Interface
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* Right Inspector Panel - Sidebar on desktop, Sheet on mobile */}
                    {!isMobile ? (
                        <div
                            className={`transition-all duration-500 ease-out border-l border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col ${(rightPanelOpen && !focusMode) ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
                        >
                            <div className="h-12 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-tertiary">Inspector</span>
                                <button onClick={() => setRightPanelOpen(false)} className="text-slate-400 dark:text-tertiary hover:text-slate-600 dark:hover:text-primary transition-colors">
                                    <PanelRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto hide-scrollbar">
                                <NodeDetailsPanel />
                            </div>
                        </div>
                    ) : (
                        rightPanelOpen && !focusMode && (
                            <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in">
                                <div
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                    onClick={() => setRightPanelOpen(false)}
                                />
                                <div className="relative mt-auto h-[70vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
                                    <div className="flex justify-center py-3">
                                        <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    </div>
                                    <div className="h-12 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Inspector</span>
                                        <button
                                            onClick={() => setRightPanelOpen(false)}
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <NodeDetailsPanel />
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {(nodes.length > 0 && !rightPanelOpen && !focusMode && !isMobile) && (
                        <button
                            onClick={() => setRightPanelOpen(true)}
                            className="absolute right-6 top-1/2 -translate-y-1/2 z-40 w-10 h-10 glass-panel rounded-xl flex items-center justify-center text-secondary hover:text-indigo-500 hover:scale-110 transition-all shadow-xl"
                        >
                            <PanelRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Mobile FAB - Opens Bottom Sheet */}
                {isMobile && !mobileEditorOpen && !focusMode && (
                    <>
                        {/* Visual Organizer FAB (Above Main FAB) */}
                        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end pointer-events-none">
                            <div className="pointer-events-auto">
                                <VisualOrganizerFAB />
                            </div>
                        </div>

                        <button
                            onClick={() => setMobileEditorOpen(true)}
                            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                            title="Open Editor"
                        >
                            <Sparkles className="w-6 h-6 text-white" />
                        </button>
                    </>
                )}

                {/* Mobile Bottom Sheet */}
                {isMobile && mobileEditorOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setMobileEditorOpen(false)}
                        />

                        {/* Sheet Content */}
                        <div className="relative mt-auto h-[85vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
                            {/* Handle */}
                            <div className="flex justify-center py-3">
                                <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                            </div>

                            {/* Header */}
                            <div className="h-14 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                                        <Sparkles className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">System Architect</span>
                                </div>
                                <button
                                    onClick={() => setMobileEditorOpen(false)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto">
                                <InputPanel />
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </ReactFlowProvider>
    );
}
