import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useFlowStore } from '../store';
import { parseMermaid, detectInputType } from '../lib/mermaidParser';
import { getLayoutedElements } from '../lib/layoutEngine';
import { interpretText, suggestFix } from '../lib/aiService';
import {
    Loader2, Zap, Trash2, FileText, Lightbulb,
    AlertCircle
} from 'lucide-react';

const SAMPLE_MERMAID = `flowchart TD
    subgraph AI [AI Director]
        A1[Analyze Trends]
        A2[Generate Script]
        A3[Create Draft]
    end

    subgraph Team [Intern Team]
        B1[Fine-tune Ideas]
        B2[Edit Content]
        B3[Review & Approve]
    end

    A1 --> A2 --> A3
    A3 --> B1
    B1 --> B2 --> B3`;

export function CodeEditor() {
    const [code, setCode] = useState<string>('');
    const [inputType, setInputType] = useState<'mermaid' | 'natural'>('mermaid');
    const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);
    const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

    // Use any for editor refs since OnMount type isn't reliably exported
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);

    const {
        setNodes, setEdges, setLoading, setError, setSourceCode, isLoading,
        ollamaUrl, modelName, aiMode, onlineProvider, apiKey, nodes, setSelectedNode, theme
    } = useFlowStore();

    // Listen for node click events from the canvas (bidirectional highlighting)
    useEffect(() => {
        const handleNodeSelected = (event: CustomEvent<{ nodeId: string; label: string }>) => {
            if (!editorRef.current || !code) return;

            const { label } = event.detail;
            const lines = code.split('\n');

            // Find line containing this node's label
            const lineIndex = lines.findIndex(line =>
                line.includes(label) ||
                line.includes(`[${label}]`) ||
                line.includes(`(${label})`) ||
                line.includes(`{${label}}`)
            );

            if (lineIndex !== -1) {
                setHighlightedLine(lineIndex + 1);

                // Scroll to and highlight the line
                editorRef.current.revealLineInCenter(lineIndex + 1);

                // Add decoration
                if (monacoRef.current) {
                    decorationsRef.current = editorRef.current.deltaDecorations(
                        decorationsRef.current,
                        [{
                            range: new monacoRef.current.Range(lineIndex + 1, 1, lineIndex + 1, 1),
                            options: {
                                isWholeLine: true,
                                className: 'highlighted-line',
                                glyphMarginClassName: 'highlighted-glyph',
                            }
                        }]
                    );

                    // Clear highlight after 3 seconds
                    setTimeout(() => {
                        if (editorRef.current) {
                            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
                            setHighlightedLine(null);
                        }
                    }, 3000);
                }
            }
        };

        window.addEventListener('node-selected', handleNodeSelected as EventListener);
        return () => window.removeEventListener('node-selected', handleNodeSelected as EventListener);
    }, [code]);

    const handleCodeChange = useCallback((value: string | undefined) => {
        const newCode = value || '';
        setCode(newCode);
        if (newCode.trim()) setInputType(detectInputType(newCode));
    }, [inputType]);

    const handleGenerate = useCallback(async () => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        setSyntaxErrors([]);

        try {
            let mermaidCode = code;
            let metadata: Record<string, any> | undefined;

            if (inputType === 'natural') {
                if (aiMode === 'offline' && !ollamaUrl) throw new Error('Configure Ollama URL in settings');
                const result = await interpretText(code, ollamaUrl, modelName, aiMode, onlineProvider, apiKey);
                if (!result.success || !result.mermaidCode) throw new Error(result.error || 'Interpretation failed');
                mermaidCode = result.mermaidCode;
            }

            setSourceCode(mermaidCode);
            const { nodes: parsedNodes, edges: parsedEdges } = await parseMermaid(mermaidCode);

            if (metadata) {
                parsedNodes.forEach(node => {
                    const label = (node.data.label as string) || '';
                    if (label && metadata && metadata[label]) node.data.metadata = metadata[label];
                });
            }

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(parsedNodes, parsedEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error processing code';
            setError(errorMessage);

            // Try to parse line number from error
            const lineMatch = errorMessage.match(/line (\d+)/i);
            if (lineMatch) {
                setSyntaxErrors([{ line: parseInt(lineMatch[1]), message: errorMessage }]);
            }
        } finally {
            setLoading(false);
        }
    }, [code, inputType, ollamaUrl, modelName, aiMode, onlineProvider, apiKey, setNodes, setEdges, setLoading, setError, setSourceCode]);

    const [suggestion, setSuggestion] = useState<string | null>(null);

    const handleSuggest = useCallback(async () => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        setSuggestion(null);

        try {
            const result = await suggestFix(code, ollamaUrl, modelName, aiMode, onlineProvider, apiKey);
            if (result.success && result.mermaidCode) {
                setCode(result.mermaidCode);
                setSuggestion(result.explanation || 'Code improved');
                setTimeout(() => setSuggestion(null), 5000);
            } else {
                throw new Error(result.error || 'Could not get suggestion');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Suggestion failed');
        } finally {
            setLoading(false);
        }
    }, [code, ollamaUrl, modelName, aiMode, onlineProvider, apiKey, setLoading, setError]);

    // Click on node ID in code to highlight on canvas
    const handleEditorClick = useCallback(() => {
        if (!editorRef.current) return;

        const position = editorRef.current.getPosition();
        if (!position) return;

        const line = editorRef.current.getModel()?.getLineContent(position.lineNumber);
        if (!line) return;

        // Extract node ID from line (e.g., "A1[Label]" -> find node with label "Label")
        const labelMatch = line.match(/\[([^\]]+)\]/) || line.match(/\(([^)]+)\)/) || line.match(/\{([^}]+)\}/);
        if (labelMatch) {
            const label = labelMatch[1];
            const matchingNode = nodes.find(n => (n.data.label as string)?.includes(label));
            if (matchingNode) {
                setSelectedNode(matchingNode);
            }
        }
    }, [nodes, setSelectedNode]);

    // Define themes once on mount, but update selection on theme change
    useEffect(() => {
        if (!monacoRef.current) return;

        // Define Dark Theme
        monacoRef.current.editor.defineTheme('architect-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' },
                { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
                { token: 'string', foreground: '34d399' },
                { token: 'number', foreground: 'fbbf24' },
                { token: 'type', foreground: 'c084fc' },
            ],
            colors: {
                'editor.background': '#0f172a',
                'editor.foreground': '#e2e8f0',
                'editorLineNumber.foreground': '#475569',
                'editorLineNumber.activeForeground': '#60a5fa',
                'editor.lineHighlightBackground': '#1e293b',
                'editor.selectionBackground': '#334155',
                'editorCursor.foreground': '#60a5fa',
            }
        });

        // Define Light Theme
        monacoRef.current.editor.defineTheme('architect-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '2563eb', fontStyle: 'bold' }, // Blue-600
                { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' }, // Slate-400
                { token: 'string', foreground: '059669' }, // Emerald-600
                { token: 'number', foreground: 'd97706' }, // Amber-600
                { token: 'type', foreground: '9333ea' }, // Purple-600
            ],
            colors: {
                'editor.background': '#f8fafc', // Slate-50
                'editor.foreground': '#334155', // Slate-700
                'editorLineNumber.foreground': '#cbd5e1', // Slate-300
                'editorLineNumber.activeForeground': '#2563eb', // Blue-600
                'editor.lineHighlightBackground': '#f1f5f9', // Slate-100
                'editor.selectionBackground': '#e2e8f0', // Slate-200
                'editorCursor.foreground': '#2563eb', // Blue-600
            }
        });

        monacoRef.current.editor.setTheme(theme === 'dark' ? 'architect-dark' : 'architect-light');
    }, [theme]);

    const handleEditorMount = useCallback((editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        // Initial theme set handled by useEffect
    }, []);

    return (
        <div className="h-full flex flex-col gap-4 animate-slide-up">
            {/* Editor Container with Badges */}
            <div className={`flex-1 rounded-2xl overflow-hidden border relative group shadow-inner transition-colors ${theme === 'dark' ? 'bg-[#0B1221] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                {/* Internal Badges */}
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 backdrop-blur-md">
                        Mermaid
                    </span>
                </div>
                <div className="absolute top-4 right-4 z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 backdrop-blur-md">
                        Manual
                    </span>
                </div>
                <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    // theme prop is controlled by monaco.editor.setTheme
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        lineNumbers: 'on',
                        padding: { top: 50, bottom: 20 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontLigatures: true,
                        renderLineHighlight: 'all',
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalSliderSize: 6,
                            horizontalSliderSize: 6
                        },
                        lineHeight: 1.7,
                        cursorSmoothCaretAnimation: 'on',
                        smoothScrolling: true,
                        contextmenu: false,
                        fixedOverflowWidgets: true,
                        wordWrap: 'on',
                        glyphMargin: true,
                    }}
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                />

                {/* Floating Action Buttons */}
                <div className="absolute top-4 right-24 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={() => setCode(SAMPLE_MERMAID)}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-all backdrop-blur-md shadow-lg"
                        title="Load Sample"
                    >
                        <FileText className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setCode('')}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all backdrop-blur-md shadow-lg"
                        title="Clear"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Syntax Errors */}
                {syntaxErrors.length > 0 && (
                    <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-fade-in">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Syntax Error</p>
                                <p className="text-[11px] text-red-300 mt-1">{syntaxErrors[0].message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Suggestion Toast */}
                {suggestion && (
                    <div className="absolute bottom-4 left-4 right-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl animate-fade-in z-20">
                        <div className="flex items-center gap-3">
                            <Lightbulb className="w-4 h-4 text-blue-400 shrink-0" />
                            <p className="text-[11px] text-blue-200 font-medium leading-relaxed">{suggestion}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
                <button
                    onClick={handleSuggest}
                    disabled={!code.trim() || isLoading}
                    className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                        <>
                            <Lightbulb className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                            <span className="text-[11px] font-black uppercase tracking-wider">AI Fix</span>
                        </>
                    )}
                </button>

                <button
                    onClick={handleGenerate}
                    disabled={!code.trim() || isLoading}
                    className="flex-[1.5] py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                    ) : (
                        <>
                            <Zap className="w-4 h-4 text-white" />
                            <span className="text-[11px] font-black uppercase tracking-wider">Visualize</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
