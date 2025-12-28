import { useState, useEffect, useCallback } from 'react';
import { Cpu, X, Database, Globe, ShieldCheck, ChevronDown, RefreshCw, Zap, Download, Eye, Smartphone } from 'lucide-react';
import { useFlowStore } from '../store';
import { useMobileDetect } from '../hooks/useMobileDetect';
import { webLlmService } from '../lib/webLlmService';
import type { WebLlmProgress } from '../lib/webLlmService';
import { visionService } from '../lib/visionService';
import type { VisionProgress } from '../lib/visionService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OllamaModel {
    name: string;
    size: number;
    modified_at: string;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const {
        ollamaUrl, setOllamaUrl,
        modelName, setModelName,
        apiKey, setApiKey,
        aiMode, setAiMode,
        onlineProvider, setOnlineProvider
    } = useFlowStore();
    const { isMobile } = useMobileDetect();

    const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('offline');
    const [isVerifying, setIsVerifying] = useState(false);
    const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Browser Model State
    const [browserProgress, setBrowserProgress] = useState<WebLlmProgress | null>(null);
    const [isBrowserLoading, setIsBrowserLoading] = useState(false);
    const [isBrowserReady, setIsBrowserReady] = useState(false);

    // Vision Model State
    const [visionProgress, setVisionProgress] = useState<VisionProgress | null>(null);
    const [isVisionLoading, setIsVisionLoading] = useState(false);
    const [isVisionReady, setIsVisionReady] = useState(false);

    // API Key Verification State
    const [keyVerificationStatus, setKeyVerificationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const [keyVerificationError, setKeyVerificationError] = useState<string | null>(null);

    const checkBrowserStatus = useCallback(() => {
        const llmStatus = webLlmService.getStatus();
        setIsBrowserReady(llmStatus.isReady);
        setIsBrowserLoading(llmStatus.isLoading);

        const visionStatus = visionService.getStatus();
        setIsVisionReady(visionStatus.isReady);
        setIsVisionLoading(visionStatus.isLoading);
    }, []);

    const initBrowserModel = async () => {
        setIsBrowserLoading(true);
        try {
            await webLlmService.initialize((progress) => {
                setBrowserProgress(progress);
            });
            setIsBrowserReady(true);
            setSystemStatus('online'); // Logic is ready
        } catch (error) {
            console.error(error);
            setSystemStatus('offline');
        } finally {
            setIsBrowserLoading(false);
            setBrowserProgress(null);
        }
    };

    const initVisionModel = async () => {
        setIsVisionLoading(true);
        try {
            await visionService.initialize((progress) => {
                setVisionProgress(progress);
            });
            setIsVisionReady(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsVisionLoading(false);
            setVisionProgress(null);
        }
    };

    const fetchModels = useCallback(async () => {
        if (!ollamaUrl) return;
        setIsLoadingModels(true);
        try {
            const res = await fetch(`${ollamaUrl}/api/tags`);
            if (res.ok) {
                const data = await res.json();
                setAvailableModels(data.models || []);
                setSystemStatus('online');
            } else {
                setAvailableModels([]);
                setSystemStatus('offline');
            }
        } catch {
            setAvailableModels([]);
            setSystemStatus('offline');
        }
        setIsLoadingModels(false);
    }, [ollamaUrl]);

    const checkStatus = useCallback(async () => {
        setIsVerifying(true);
        if (aiMode === 'offline') {
            await fetchModels();
        } else if (aiMode === 'browser') {
            checkBrowserStatus();
            setSystemStatus(webLlmService.getStatus().isReady ? 'online' : 'offline');
        } else {
            if (onlineProvider === 'ollama-cloud') {
                await fetchModels();
            } else {
                // Just check format, actual verification is done with verify button
                const isKeyFormatValid = apiKey.length > 20 && (apiKey.startsWith('sk-') || apiKey.startsWith('AIza') || apiKey.length > 30);
                setSystemStatus(isKeyFormatValid && keyVerificationStatus === 'valid' ? 'online' : 'offline');
            }
        }
        setIsVerifying(false);
    }, [aiMode, fetchModels, apiKey, onlineProvider, checkBrowserStatus, keyVerificationStatus]);

    // Verify API key by making a test request
    const verifyApiKey = async () => {
        if (!apiKey || apiKey.length < 10) {
            setKeyVerificationStatus('invalid');
            setKeyVerificationError('API key is too short');
            return;
        }

        setKeyVerificationStatus('checking');
        setKeyVerificationError(null);

        try {
            if (onlineProvider === 'openai') {
                // Test OpenAI key with models list endpoint (lightweight)
                const response = await fetch('https://api.openai.com/v1/models', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (response.ok) {
                    setKeyVerificationStatus('valid');
                    setSystemStatus('online');
                } else {
                    const error = await response.json().catch(() => ({}));
                    setKeyVerificationStatus('invalid');
                    setKeyVerificationError(error.error?.message || `Error: ${response.status}`);
                }
            } else if (onlineProvider === 'gemini') {
                // Test Gemini key with a minimal request
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
                );
                if (response.ok) {
                    setKeyVerificationStatus('valid');
                    setSystemStatus('online');
                } else {
                    const error = await response.json().catch(() => ({}));
                    setKeyVerificationStatus('invalid');
                    setKeyVerificationError(error.error?.message || `Error: ${response.status}`);
                }
            }
        } catch (error) {
            setKeyVerificationStatus('invalid');
            setKeyVerificationError(error instanceof Error ? error.message : 'Connection failed');
        }
    };

    useEffect(() => {
        if (isOpen) {
            checkStatus();
            const interval = setInterval(checkStatus, 5000); // Check more frequently for browser status
            return () => clearInterval(interval);
        }
    }, [isOpen, checkStatus]);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className={`fixed z-[9999] flex flex-col gap-4
                ${isMobile
                    ? 'left-4 right-4 top-16 max-h-[80vh] rounded-[2rem]'
                    : 'top-24 right-12 w-96 rounded-[2rem]'
                } floating-glass p-6 titanium-border shadow-2xl overflow-hidden`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Cpu className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-primary tracking-tight">System Settings</h3>
                            <p className="text-[10px] text-tertiary font-medium uppercase tracking-wider">Configuration</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isMobile && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                                <Smartphone className="w-3 h-3 text-amber-400" />
                                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Lite</span>
                            </div>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                            <X className="w-5 h-5 text-tertiary group-hover:text-primary transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className={`${isMobile ? 'flex-1 overflow-y-auto' : ''} space-y-6`}>
                    {/* Mode Selection */}
                    <div className="flex items-center gap-1 p-1 bg-black/20 rounded-xl border border-white/5">
                        <button
                            onClick={() => setAiMode('offline')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide
                                ${aiMode === 'offline'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                    : 'text-tertiary hover:text-primary hover:bg-white/5'
                                }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Local
                        </button>
                        <button
                            onClick={() => setAiMode('browser')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide
                                ${aiMode === 'browser'
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/20'
                                    : 'text-tertiary hover:text-primary hover:bg-white/5'
                                }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            Browser
                        </button>
                        <button
                            onClick={() => setAiMode('online')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wide
                                ${aiMode === 'online'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                    : 'text-tertiary hover:text-primary hover:bg-white/5'
                                }`}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            Cloud
                        </button>
                    </div>

                    {aiMode === 'browser' && (
                        <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {/* Mobile Warning */}
                            {isMobile && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-start gap-2">
                                        <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Performance Warning</p>
                                            <p className="text-[9px] text-amber-400/70 mt-1 leading-relaxed">Browser AI requires 1GB+ download and may drain battery. Cloud mode is recommended for mobile.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Neural Engine Card */}
                            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-violet-500/10">
                                        <Zap className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-bold text-violet-200">Neural Engine (Text)</h4>
                                        <p className="text-[9px] text-violet-400/60">Qwen3-0.6B (Fast!)</p>
                                    </div>
                                    {isBrowserReady && <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                </div>

                                {isBrowserLoading ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-violet-300">
                                            <span>{browserProgress?.text || 'Initializing...'}</span>
                                            <span>{Math.round(browserProgress?.progress || 0)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-500 transition-all duration-300"
                                                style={{ width: `${browserProgress?.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    !isBrowserReady ? (
                                        <button
                                            onClick={initBrowserModel}
                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-violet-900/20"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Load Text Engine (~800MB)
                                        </button>
                                    ) : (
                                        <div className="text-[10px] text-green-400 flex items-center gap-2 bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Text Engine Ready
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Vision Engine Card */}
                            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-violet-500/10">
                                        <Eye className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-bold text-violet-200">Vision Engine (Image)</h4>
                                        <p className="text-[9px] text-violet-400/60">ViT-GPT2 (~300MB, Fast!)</p>
                                    </div>
                                    {isVisionReady && <div className="ml-auto w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                                </div>

                                {isVisionLoading ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-violet-300">
                                            <span>{visionProgress?.status || 'Loading...'}</span>
                                            {visionProgress?.progress !== undefined && <span>{Math.round(visionProgress.progress)}%</span>}
                                        </div>
                                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-500 transition-all duration-300"
                                                style={{ width: `${visionProgress?.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    !isVisionReady ? (
                                        <button
                                            onClick={initVisionModel}
                                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-violet-900/20"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Load Vision Engine (~200MB)
                                        </button>
                                    ) : (
                                        <div className="text-[10px] text-green-400 flex items-center gap-2 bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Vision Engine Ready
                                        </div>
                                    )
                                )}
                            </div>

                            <p className="text-[9px] text-slate-500 leading-relaxed text-center px-2">
                                Runs entirely in your browser using WebGPU/WASM. No internet required after initial download.
                            </p>
                        </div>
                    )}

                    {aiMode === 'offline' && (
                        <>
                            <div className="space-y-3 animate-fade-in">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-tertiary pl-1">Ollama Connection</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={ollamaUrl}
                                        onChange={(e) => setOllamaUrl(e.target.value)}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-[12px] outline-none focus:border-blue-500/50 font-mono transition-all text-primary placeholder:text-slate-600"
                                        placeholder="http://localhost:11434"
                                    />
                                    <button
                                        onClick={checkStatus}
                                        disabled={isVerifying}
                                        className="px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center"
                                        title="Test Connection"
                                    >
                                        <Database className={`w-4 h-4 text-tertiary ${isVerifying ? 'animate-pulse text-blue-500' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-tertiary pl-1">Local Model</label>
                                    <button
                                        onClick={fetchModels}
                                        disabled={isLoadingModels}
                                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                        title="Refresh models"
                                    >
                                        <RefreshCw className={`w-3 h-3 text-tertiary ${isLoadingModels ? 'animate-spin text-blue-500' : ''}`} />
                                    </button>
                                </div>

                                {availableModels.length > 0 ? (
                                    <div className="relative">
                                        <select
                                            value={modelName}
                                            onChange={(e) => setModelName(e.target.value)}
                                            className="w-full appearance-none bg-black/20 border border-white/10 rounded-xl p-3 pr-10 text-[12px] font-bold outline-none focus:border-blue-500/50 transition-all text-primary cursor-pointer"
                                        >
                                            {!availableModels.find(m => m.name === modelName) && modelName && (
                                                <option value={modelName}>{modelName}</option>
                                            )}
                                            {availableModels.map((model) => (
                                                <option key={model.name} value={model.name}>
                                                    {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-[12px] font-bold outline-none focus:border-blue-500/50 transition-all text-primary placeholder:text-slate-600"
                                        placeholder="llava"
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {aiMode === 'online' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Provider Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-tertiary pl-1">AI Engine</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'openai', label: 'OpenAI (GPT-4o)', color: 'bg-green-500', apiUrl: 'https://platform.openai.com/api-keys' },
                                        { id: 'gemini', label: 'Google Gemini Pro', color: 'bg-blue-500', apiUrl: 'https://aistudio.google.com/apikey' },
                                        { id: 'ollama-cloud', label: 'Remote Ollama', color: 'bg-orange-500', apiUrl: null }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setOnlineProvider(p.id as any)}
                                            className={`relative overflow-hidden w-full px-4 py-3 rounded-xl border transition-all text-left group
                                                ${onlineProvider === p.id
                                                    ? 'border-blue-500/50 bg-blue-500/10'
                                                    : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between relative z-10">
                                                <span className={`text-[11px] font-bold ${onlineProvider === p.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                                    {p.label}
                                                </span>
                                                {onlineProvider === p.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-tertiary pl-1">
                                    {onlineProvider === 'ollama-cloud' ? 'API Endpoint' : 'Secret Key'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type={onlineProvider === 'ollama-cloud' ? 'text' : 'password'}
                                        value={onlineProvider === 'ollama-cloud' ? ollamaUrl : apiKey}
                                        onChange={(e) => {
                                            if (onlineProvider === 'ollama-cloud') {
                                                setOllamaUrl(e.target.value);
                                            } else {
                                                setApiKey(e.target.value);
                                                setKeyVerificationStatus('idle');
                                            }
                                        }}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-[12px] outline-none focus:border-blue-500/50 font-mono transition-all text-primary placeholder:text-slate-600"
                                        placeholder={onlineProvider === 'ollama-cloud' ? 'https://api.example.com' : 'sk-...'}
                                    />
                                    {onlineProvider !== 'ollama-cloud' && (
                                        <button
                                            onClick={verifyApiKey}
                                            disabled={keyVerificationStatus === 'checking' || !apiKey}
                                            className={`px-4 rounded-xl border transition-all flex items-center justify-center min-w-[80px] text-[10px] font-bold uppercase tracking-wider
                                                ${keyVerificationStatus === 'valid'
                                                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                                    : keyVerificationStatus === 'invalid'
                                                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            {keyVerificationStatus === 'checking' ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : keyVerificationStatus === 'valid' ? (
                                                <>✓ Valid</>
                                            ) : keyVerificationStatus === 'invalid' ? (
                                                <>✗ Invalid</>
                                            ) : (
                                                'Verify'
                                            )}
                                        </button>
                                    )}
                                </div>
                                {keyVerificationStatus === 'invalid' && keyVerificationError && (
                                    <p className="text-[9px] text-red-400 pl-1">{keyVerificationError}</p>
                                )}
                                {keyVerificationStatus === 'valid' && (
                                    <p className="text-[9px] text-emerald-400 pl-1">API key verified successfully!</p>
                                )}
                                {/* Get API Key Link */}
                                {onlineProvider !== 'ollama-cloud' && (
                                    <a
                                        href={onlineProvider === 'openai'
                                            ? 'https://platform.openai.com/api-keys'
                                            : 'https://aistudio.google.com/apikey'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors pl-1 mt-1"
                                    >
                                        <Globe className="w-3 h-3" />
                                        Get {onlineProvider === 'openai' ? 'OpenAI' : 'Google Gemini'} API Key →
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Live Status - Clean No Border */}
                <div className="flex items-center gap-3 pl-1 pt-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 
                        ${systemStatus === 'online'
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : (aiMode === 'browser' && isBrowserLoading ? 'bg-violet-500 animate-pulse' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]')
                        }`}
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-wider 
                        ${systemStatus === 'online' ? 'text-emerald-500' : (aiMode === 'browser' && isBrowserLoading ? 'text-violet-500' : 'text-red-500')}`}
                    >
                        {isVerifying || (aiMode === 'browser' && isBrowserLoading) ? 'Initializing Neural Engine...' : (systemStatus === 'online' ? 'Systems Nominal' : 'No Connection')}
                    </span>

                    {(isVerifying || (aiMode === 'browser' && isBrowserLoading)) && (
                        <div className="ml-auto">
                            <div className="w-3 h-3 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
