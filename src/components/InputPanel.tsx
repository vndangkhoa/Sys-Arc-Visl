import { useCallback } from 'react';
import { ImageUpload } from './ImageUpload';
import { CodeEditor } from './CodeEditor';
import { Image, Code, MessageSquare, Loader2, Zap } from 'lucide-react';
import { useFlowStore } from '../store';
import { interpretText } from '../lib/aiService';
import { parseMermaid } from '../lib/mermaidParser';
import { getLayoutedElements } from '../lib/layoutEngine';

type Tab = 'image' | 'code' | 'describe';

export function InputPanel() {
    const {
        setNodes, setEdges, setLoading, setError,
        setSourceCode, isLoading, ollamaUrl, modelName,
        aiMode, onlineProvider, apiKey,
        generationComplexity, setGenerationComplexity,
        // Use global state for input persistence
        inputDescription: description, setInputDescription: setDescription,
        inputActiveTab: activeTab, setInputActiveTab: setActiveTab,

        // Actions for auto-sync and save
        setMermaidCode, saveDiagram
    } = useFlowStore();

    const handleTextGenerate = useCallback(async () => {
        if (!description.trim()) return;

        // Validate AI configuration before processing
        if (aiMode === 'offline') {
            if (!ollamaUrl) {
                setError('Please configure Ollama URL in Settings → Local mode');
                return;
            }
        } else if (aiMode === 'online') {
            if (onlineProvider !== 'ollama-cloud' && !apiKey) {
                setError(`Please enter your ${onlineProvider === 'gemini' ? 'Google Gemini' : 'OpenAI'} API key in Settings → Cloud mode`);
                return;
            }
            if (onlineProvider === 'ollama-cloud' && !ollamaUrl) {
                setError('Please configure the Remote Ollama endpoint in Settings → Cloud mode');
                return;
            }
        } else if (aiMode === 'browser') {
            // Browser mode is okay for text - just needs model loaded
        }

        setLoading(true);
        setError(null);

        try {
            const result = await interpretText(
                description,
                ollamaUrl,
                modelName,
                aiMode,
                onlineProvider,
                apiKey,
                generationComplexity
            );

            if (!result.success || !result.mermaidCode) {
                throw new Error(result.error || 'Could not interpret flow from description');
            }

            // Sync with global Mermaid code store so it appears in the Code tab
            setMermaidCode(result.mermaidCode);
            setSourceCode(result.mermaidCode);

            const { nodes: parsedNodes, edges: parsedEdges } = await parseMermaid(result.mermaidCode);

            if (result.metadata) {
                parsedNodes.forEach(node => {
                    const label = (node.data.label as string) || '';
                    if (label && result.metadata && result.metadata[label]) {
                        node.data.metadata = result.metadata[label];
                    }
                });
            }

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(parsedNodes, parsedEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            // Auto-save the generated diagram
            // Generate a name based on the description or a timestamp
            const autoSaveName = description.split(' ').slice(0, 4).join(' ') || `Auto-Save ${new Date().toLocaleTimeString()}`;
            saveDiagram(autoSaveName);

        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to process description');
        } finally {
            setLoading(false);
        }
    }, [description, ollamaUrl, modelName, aiMode, onlineProvider, apiKey, generationComplexity, setNodes, setEdges, setLoading, setError, setSourceCode, setMermaidCode, saveDiagram]);

    const tabs = [
        { id: 'image' as Tab, icon: Image, label: 'Upload' },
        { id: 'code' as Tab, icon: Code, label: 'Code' },
        { id: 'describe' as Tab, icon: MessageSquare, label: 'Describe' },
    ];

    return (
        <div className="h-full flex flex-col">
            {/* Floating Tabs */}
            <div className="px-4 pt-6 pb-2">
                <div className="flex bg-slate-100 dark:bg-black/20 p-1 rounded-full border border-black/5 dark:border-white/5 mx-auto max-w-[280px]">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full transition-all duration-300 relative
                                    ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}
                                `}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-blue-600 dark:bg-blue-500 rounded-full shadow-lg shadow-blue-500/25 animate-fade-in" />
                                )}
                                <div className="relative flex items-center gap-2 z-10">
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Complexity Toggle */}
            {(activeTab === 'image' || activeTab === 'describe') && (
                <div className="px-4 py-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1 mb-2 block">Diagram Complexity</label>
                    <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-black/30 border border-black/5 dark:border-white/5">
                        <button
                            onClick={() => setGenerationComplexity('simple')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all
                                ${generationComplexity === 'simple'
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/30'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className="text-base">⚡</span>
                            Simple
                        </button>
                        <button
                            onClick={() => setGenerationComplexity('complex')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all
                                ${generationComplexity === 'complex'
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-900/30'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className="text-base">🔮</span>
                            Complex
                        </button>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 px-4 pb-6 overflow-y-auto hide-scrollbar">
                {activeTab === 'image' && <ImageUpload />}
                {activeTab === 'code' && <CodeEditor />}
                {activeTab === 'describe' && (
                    <div className="h-full flex flex-col animate-slide-up">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your diagram in natural language...

Example: Create a user registration flow with login, verification, and dashboard access"
                            className="w-full flex-1 p-5 rounded-2xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-sm resize-none outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition-all font-sans leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                        <button
                            onClick={handleTextGenerate}
                            disabled={!description.trim() || isLoading}
                            className={`mt-4 w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3
                                ${!description.trim() || isLoading
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-900/30 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    <span>Generate Diagram</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
