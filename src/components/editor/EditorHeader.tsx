import { Link } from 'react-router-dom';
import {
    Edit3, Code, Download, Zap, Sun, Moon, Maximize2, Minimize2, Settings, Save,
    ChevronDown, FileCode, ImageIcon, FileText, Frame, Cloud, Server, Cpu, RotateCcw, RotateCw,
    Menu, X, Home
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

// Mobile Menu Item Component - extracted outside to avoid hook issues
interface MobileMenuItemProps {
    icon: any;
    label: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    variant?: 'default' | 'primary' | 'success';
    iconColor?: string;
}

function MobileMenuItem({
    icon: Icon,
    label,
    onClick,
    active = false,
    disabled = false,
    variant = 'default',
    iconColor = ''
}: MobileMenuItemProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full min-h-[44px] flex items-center gap-4 px-4 py-3 rounded-xl transition-all
                ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-[0.98]'}
                ${active
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : variant === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-500'
                        : variant === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}
            `}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor || (active ? 'text-blue-500' : variant === 'primary' ? 'text-white' : 'text-slate-400 dark:text-slate-500')}`} />
            <span className="text-sm font-semibold flex-1 text-left">{label}</span>
            {active && <div className="w-2 h-2 rounded-full bg-blue-500" />}
        </button>
    );
}

export function EditorHeader() {
    const {
        nodes, edges, leftPanelOpen, setLeftPanelOpen,
        rightPanelOpen, setRightPanelOpen,
        theme, toggleTheme,
        focusMode, setFocusMode,
        saveDiagram,
        aiMode,
        onlineProvider
    } = useFlowStore();
    const { isMobile } = useMobileDetect();

    // Temporal state hooks - MUST be called unconditionally at top level
    const canUndo = useStore(useDiagramStore.temporal, (state: any) => state.pastStates.length > 0);
    const canRedo = useStore(useDiagramStore.temporal, (state: any) => state.futureStates.length > 0);

    const [showSettings, setShowSettings] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    const handleSave = () => {
        setShowMobileMenu(false);
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
        setShowMobileMenu(false);
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

    const handleOpenSettings = () => {
        setShowMobileMenu(false);
        setShowSettings(true);
    };



    // MOBILE HEADER
    if (isMobile) {
        return (
            <>
                <header className="h-14 px-4 flex items-center justify-between z-[60] border-b border-black/5 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                    {/* Left: Logo + Back */}
                    <div className="flex items-center gap-3">
                        <Link
                            to="/"
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
                            title="Home"
                        >
                            <Home className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Zap className="w-3.5 h-3.5 text-white fill-white/20" />
                            </div>
                            <span className="text-sm font-bold text-slate-800 dark:text-white">SysVis</span>
                        </div>
                    </div>

                    {/* Center: Node count (if any) */}
                    {nodes.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {nodes.filter(n => n.type !== 'group').length} nodes
                            </span>
                        </div>
                    )}

                    {/* Right: Menu Button */}
                    <button
                        onClick={() => setShowMobileMenu(true)}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 active:scale-95 transition-transform"
                        title="Menu"
                    >
                        <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>

                {/* Mobile Full-Screen Menu */}
                {showMobileMenu && (
                    <div className="fixed inset-0 z-[200] animate-fade-in">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowMobileMenu(false)}
                        />

                        {/* Menu Panel - slides from right */}
                        <div className="absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-slate-900 shadow-2xl animate-slide-in-right flex flex-col">
                            {/* Menu Header */}
                            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-white/10 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-base font-bold text-slate-800 dark:text-white">Menu</span>
                                </div>
                                <button
                                    onClick={() => setShowMobileMenu(false)}
                                    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Menu Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* AI Mode Indicator */}
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5">
                                    {aiMode === 'offline' ? (
                                        <>
                                            <Server className="w-5 h-5 text-blue-500" />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Local Mode</span>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Using Ollama</p>
                                            </div>
                                        </>
                                    ) : aiMode === 'browser' ? (
                                        <>
                                            <Cpu className="w-5 h-5 text-purple-500" />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Browser Mode</span>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">WebLLM In-Device</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Cloud className="w-5 h-5 text-emerald-500" />
                                            <div>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Cloud Mode</span>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {onlineProvider === 'openai' ? 'OpenAI' : onlineProvider === 'gemini' ? 'Gemini' : 'Cloud AI'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* History Section */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">History</h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                useDiagramStore.temporal.getState().undo();
                                                setShowMobileMenu(false);
                                            }}
                                            disabled={!canUndo}
                                            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all disabled:opacity-30"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                            <span className="text-sm font-semibold">Undo</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                useDiagramStore.temporal.getState().redo();
                                                setShowMobileMenu(false);
                                            }}
                                            disabled={!canRedo}
                                            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all disabled:opacity-30"
                                        >
                                            <RotateCw className="w-5 h-5" />
                                            <span className="text-sm font-semibold">Redo</span>
                                        </button>
                                    </div>
                                </div>

                                {/* View Section */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">View</h3>
                                    <div className="space-y-1">
                                        <MobileMenuItem
                                            icon={focusMode ? Minimize2 : Maximize2}
                                            label={focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
                                            onClick={() => {
                                                setFocusMode(!focusMode);
                                                setShowMobileMenu(false);
                                            }}
                                            active={focusMode}
                                        />
                                        <MobileMenuItem
                                            icon={theme === 'light' ? Moon : Sun}
                                            label={theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                                            onClick={() => {
                                                toggleTheme();
                                                setShowMobileMenu(false);
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">Actions</h3>
                                    <div className="space-y-1">
                                        <MobileMenuItem
                                            icon={Save}
                                            label={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Diagram'}
                                            onClick={handleSave}
                                            disabled={nodes.length === 0 || saveStatus === 'saving'}
                                            variant={saveStatus === 'saved' ? 'success' : 'default'}
                                        />
                                        <MobileMenuItem
                                            icon={Settings}
                                            label="Settings"
                                            onClick={handleOpenSettings}
                                        />
                                    </div>
                                </div>

                                {/* Export Section */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">Export</h3>
                                    <div className="space-y-1">
                                        <MobileMenuItem
                                            icon={FileCode}
                                            label="Interactive Code"
                                            onClick={() => handleExport('code')}
                                            disabled={nodes.length === 0}
                                            iconColor="text-blue-500"
                                        />
                                        <MobileMenuItem
                                            icon={FileCode}
                                            label="JSON Data"
                                            onClick={() => handleExport('json')}
                                            disabled={nodes.length === 0}
                                            iconColor="text-purple-500"
                                        />
                                        <MobileMenuItem
                                            icon={ImageIcon}
                                            label="PNG Image"
                                            onClick={() => handleExport('png')}
                                            disabled={nodes.length === 0}
                                            iconColor="text-indigo-500"
                                        />
                                        <MobileMenuItem
                                            icon={ImageIcon}
                                            label="JPG Image"
                                            onClick={() => handleExport('jpg')}
                                            disabled={nodes.length === 0}
                                            iconColor="text-amber-500"
                                        />
                                        <MobileMenuItem
                                            icon={Frame}
                                            label="SVG Vector"
                                            onClick={() => handleExport('svg')}
                                            disabled={nodes.length === 0}
                                            iconColor="text-emerald-500"
                                        />
                                        <MobileMenuItem
                                            icon={FileText}
                                            label="Logic Summary"
                                            onClick={() => handleExport('txt')}
                                            disabled={nodes.length === 0}
                                            iconColor="text-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Menu Footer */}
                            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
                                <Link
                                    to="/"
                                    className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
                                >
                                    <Home className="w-5 h-5" />
                                    <span className="text-sm font-semibold">Back to Dashboard</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <SettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                />
            </>
        );
    }

    // DESKTOP HEADER (unchanged)
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
                        disabled={!canUndo}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => useDiagramStore.temporal.getState().redo()}
                        disabled={!canRedo}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>
                </div>

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
                {/* AI Mode Status - Desktop Only */}
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
