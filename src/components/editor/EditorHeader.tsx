import { Link } from 'react-router-dom';
import {
    Edit3, Code, Download, Zap, Sun, Moon, Maximize2, Minimize2, Settings, Save,
    ChevronDown, FileCode, ImageIcon, FileText, Frame
} from 'lucide-react';
import { useFlowStore } from '../../store';
import {
    exportToPng, exportToJpg, exportToSvg,
    exportToTxt, downloadMermaid
} from '../../lib/exportUtils';
import { useState } from 'react';
import { SettingsModal } from '../Settings';

export function EditorHeader() {
    const {
        nodes, edges, leftPanelOpen, setLeftPanelOpen,
        rightPanelOpen, setRightPanelOpen,
        theme, toggleTheme,
        focusMode, setFocusMode,
        saveDiagram
    } = useFlowStore();

    const [showSettings, setShowSettings] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        const name = prompt('Enter diagram name:', `Diagram ${new Date().toLocaleDateString()}`);
        if (name) {
            saveDiagram(name);
        }
        setTimeout(() => setIsSaving(false), 800);
    };

    const handleExport = async (format: 'png' | 'jpg' | 'svg' | 'txt' | 'code') => {
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
                    exportToSvg(nodes, edges);
                    break;
                case 'txt':
                    exportToTxt(nodes, edges);
                    break;
                case 'code':
                    downloadMermaid(nodes, edges);
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
                    <span className="text-sm font-black tracking-tight text-slate-800 dark:text-primary">SystemArchitect</span>
                </Link>
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
            </div>

            <div className="flex items-center gap-2">
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
                    disabled={nodes.length === 0 || isSaving}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white dark:bg-surface border border-slate-200 dark:border-white/10 text-slate-600 dark:text-secondary hover:text-blue-600 dark:hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500/30 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <Save className={`w-3 h-3 ${isSaving ? 'animate-bounce' : ''}`} />
                    <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                {/* Export Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={nodes.length === 0}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed ${showExportMenu ? 'bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showExportMenu && (
                        <>
                            <div className="fixed inset-0 z-[70]" onClick={() => setShowExportMenu(false)} />
                            <div className="absolute top-full mt-2 right-0 w-48 floating-glass border titanium-border rounded-xl overflow-hidden z-[80] shadow-2xl animate-slide-up p-1">
                                <button onClick={() => handleExport('code')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-[10px] font-bold text-secondary transition-all group">
                                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                                    Mermaid Code
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
