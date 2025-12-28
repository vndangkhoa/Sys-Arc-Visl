import { Link } from 'react-router-dom';
import {
    Edit3, Code, Download, Zap, Sun, Moon, Maximize2, Minimize2, Settings, Save,
    ChevronDown, FileCode, ImageIcon, FileText, Frame, Cloud, Server, Cpu, RotateCcw, RotateCw
} from 'lucide-react';
import { useStore } from 'zustand';
import { useFlowStore, useDiagramStore } from '../../store';
import { useMobileDetect } from '../../hooks/useMobileDetect';
import {
    exportToPng, exportToJpg, exportToSvg,
    exportToTxt, downloadMermaid, exportToJson
} from '../../lib/exportUtils';
import { useState } from 'react';
import { SettingsModal } from '../Settings';

export function EditorHeader() {
    const {
        nodes, edges, leftPanelOpen, setLeftPanelOpen,
        rightPanelOpen, setRightPanelOpen,
        theme, toggleTheme,
        focusMode, setFocusMode,
        saveDiagram,
        aiMode, onlineProvider
    } = useFlowStore();
    const { isMobile } = useMobileDetect();

    const [showSettings, setShowSettings] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleSave = () => {
        const name = prompt('Enter diagram name:', `Diagram ${new Date().toLocaleDateString()}`);
        if (name) {
            setSaveStatus('saving');
            saveDiagram(name);

            // Show success state
            setTimeout(() => {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            }, 600);
        }
    };

    const handleExport = async (format: 'png' | 'jpg' | 'svg' | 'txt' | 'code' | 'json') => {
        setShowExportMenu(false);
        const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;

        try {
            switch (format) {
                case 'png':
                    if (viewport) await exportToPng(viewport);
                    break;
                case 'jpg':
                    if (viewport) await exportToJpg(viewport);
                    break;
                case 'svg':
                    if (viewport) await exportToSvg(viewport);
                    break;
                case 'txt':
                    exportToTxt(nodes, edges);
                    break;
                case 'code':
                    downloadMermaid(nodes, edges);
                    break;
                case 'json':
                    exportToJson(nodes, edges);
                    break;
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    return (
        <header className="h-14 px-6 flex items-center justify-between z-[60] border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all duration-500">
                        <Zap className="w-3.5 h-3.5 text-white fill-white/20" />
                    </div>
                    <span className="text-sm font-black tracking-tight text-slate-800 dark:text-primary hidden sm:inline">SystemArchitect</span>
                </Link>
                {/* Panel toggles - hidden on mobile */}
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>

                {/* History Controls */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => useDiagramStore.temporal.getState().undo()}
                        disabled={!useStore(useDiagramStore.temporal, (state: any) => state.pastStates.length > 0)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => useDiagramStore.temporal.getState().redo()}
                        disabled={!useStore(useDiagramStore.temporal, (state: any) => state.futureStates.length > 0)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>
                </div>

                {!isMobile && (
                    <>
                        <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-black/5 dark:border-white/5">
                            <button
                                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${leftPanelOpen
                                    ? 'bg-white dark:bg-blue-600/15 text-blue-600 dark:text-blue-500 shadow-sm dark:shadow-none border border-black/5 dark:border-blue-500/20'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}`}
                                title="Toggle Input Panel"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Input</span>
                            </button>
                            <button
                                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                                disabled={nodes.length === 0}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${nodes.length === 0
                                    ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600'
                                    : (rightPanelOpen
                                        ? 'bg-white dark:bg-blue-600/15 text-blue-600 dark:text-blue-500 shadow-sm dark:shadow-none border border-black/5 dark:border-blue-500/20'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent')}`}
                                title="Toggle Code Panel"
                            >
                                <Code className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Code</span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* AI Mode Status - Desktop Only */}
                {!isMobile && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 mr-2">
                        {aiMode === 'offline' ? (
                            <>
                                <Server className="w-3 h-3 text-blue-500" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Local</span>
                            </>
                        ) : aiMode === 'browser' ? (
                            <>
                                <Cpu className="w-3 h-3 text-purple-500" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Browser</span>
                            </>
                        ) : (
                            <>
                                <Cloud className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Cloud</span>
                            </>
                        )}
                    </div>
                )}

                <button
                    onClick={() => setFocusMode(!focusMode)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${focusMode ? 'text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-secondary hover:text-slate-800 dark:hover:text-primary hover:bg-black/5 dark:hover:bg-void'}`}
                    title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
                >
                    {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                    onClick={() => setShowSettings(true)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${showSettings ? 'text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-500 dark:text-secondary hover:text-slate-800 dark:hover:text-primary hover:bg-black/5 dark:hover:bg-void'}`}
                    title="System Settings"
                >
                    <Settings className="w-4 h-4" />
                </button>

                <button
                    onClick={toggleTheme}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-void transition-all text-slate-500 dark:text-secondary hover:text-slate-800 dark:hover:text-primary"
                >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-500/10 mx-2"></div>

                <button
                    onClick={handleSave}
                    disabled={nodes.length === 0 || saveStatus === 'saving'}
                    className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg bg-white dark:bg-surface border border-slate-200 dark:border-white/10 text-slate-600 dark:text-secondary hover:text-blue-600 dark:hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500/30 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                    title="Save Draft"
                >
                    <Save className={`w-3.5 h-3.5 ${saveStatus === 'saving' ? 'animate-bounce' : ''} ${saveStatus === 'saved' ? 'text-green-500' : ''}`} />
                    <span className={`hidden sm:inline ${saveStatus === 'saved' ? 'text-green-500' : ''}`}>
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
                    </span>
                </button>

                {/* Export Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={nodes.length === 0}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${showExportMenu ? 'bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        title="Export"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Export</span>
                        <ChevronDown className={`w-3 h-3 hidden sm:block transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showExportMenu && (
                        <>
                            <div className="fixed inset-0 z-[70]" onClick={() => setShowExportMenu(false)} />
                            <div className="absolute top-full mt-2 right-0 w-48 floating-glass border titanium-border rounded-xl overflow-hidden z-[80] shadow-2xl animate-slide-up p-1">
                                <button onClick={() => handleExport('code')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all group">
                                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                                    Interactive Code
                                </button>
                                <button onClick={() => handleExport('json')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all group">
                                    <FileCode className="w-3.5 h-3.5 text-purple-500" />
                                    JSON Data
                                </button>
                                <button onClick={() => handleExport('png')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all">
                                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                                    PNG Image
                                </button>
                                <button onClick={() => handleExport('jpg')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all">
                                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                                    JPG Image
                                </button>
                                <button onClick={() => handleExport('svg')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all">
                                    <Frame className="w-3.5 h-3.5 text-emerald-500" />
                                    SVG Vector
                                </button>
                                <button onClick={() => handleExport('txt')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all">
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    Logic Summary
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </header>
    );
}
