import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { useFlowStore } from '../store';
import { useDiagramStore } from '../store/diagramStore';
import { parseMermaid, detectInputType } from '../lib/mermaidParser';
import { getLayoutedElements } from '../lib/layoutEngine';
import { interpretText } from '../lib/aiService';
import { MonacoWrapper } from './editor/MonacoWrapper';
import { EditorToolbar } from './editor/EditorToolbar';



export function CodeEditor() {
    // ... (store access)
    // Use global mermaidCode from store for persistence across panel toggles
    const {
        setNodes, setEdges, setLoading, setError, setSourceCode, isLoading,
        ollamaUrl, modelName, aiMode, onlineProvider, apiKey, theme,
        mermaidCode: code, setMermaidCode: setCode
    } = useFlowStore();

    const [inputType, setInputType] = useState<'mermaid' | 'natural'>('mermaid');
    const [syntaxErrors, setSyntaxErrors] = useState<{ line: number; message: string }[]>([]);



    // ... (rest of logic up to handleTemplateSelect)

    // We need to inject the ShapePicker logic. 
    // Since I cannot match the exact lines perfectly without context, I will replace the component return and adding imports/states. 
    // But replace_file_content with 'context' is better. I will try to target specific blocks. 

    // I will use replace_file_content to add imports first.
    // Then add state.
    // Then add handleShapeSelect.
    // Then update return.

    // Wait, I am doing all of this in one tool call? Use separate blocks if possible? 
    // The previous tool calls are queued. This is the 5th tool call in this turn? No, 5th.

    // I will replace the imports first in this call.
    // Actually, I'll do a MultiReplace for CodeEditor.



    // Use any for editor refs since OnMount type isn't reliably exported
    // We'll keep these refs here to handle the node selection highlighting logic
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);

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
    }, [setCode]);

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
                metadata = result.metadata;
            }

            setSourceCode(mermaidCode);

            // First attempt to parse
            try {
                const { nodes: parsedNodes, edges: parsedEdges } = await parseMermaid(mermaidCode);
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(parsedNodes, parsedEdges);
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);

                if (metadata) {
                    parsedNodes.forEach(node => {
                        const label = (node.data.label as string) || '';
                        if (label && metadata && metadata[label]) node.data.metadata = metadata[label];
                    });
                }
            } catch (initialError) {
                // If parsing fails, try to Auto-Fix if we have an API key
                const errorMessage = initialError instanceof Error ? initialError.message : 'Error processing code';

                if (onlineProvider === 'gemini' && apiKey) {
                    console.log('Parsing failed, attempting Auto-Fix...');
                    try {
                        const { fixDiagram } = await import('../lib/aiService');
                        const fixedCode = await fixDiagram(mermaidCode, apiKey, errorMessage);

                        if (fixedCode && fixedCode !== mermaidCode) {
                            setCode(fixedCode);
                            // Retry parsing with fixed code
                            const { nodes: newNodes, edges: newEdges } = await parseMermaid(fixedCode);
                            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
                            setNodes(layoutedNodes);
                            setEdges(layoutedEdges);
                            return; // Success!
                        }
                    } catch (fixError) {
                        console.warn('Auto-Fix failed:', fixError);
                        // Fall through to throw original error
                    }
                }
                throw initialError;
            }

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
    }, [code, inputType, ollamaUrl, modelName, aiMode, onlineProvider, apiKey, setNodes, setEdges, setLoading, setError, setSourceCode, setCode]);





    // Handle Editor mount
    const handleEditorMount = useCallback((editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        // Define themes
        monaco.editor.defineTheme('architect-dark', {
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
                'editor.lineHighlightBorder': '#00000000', // No border for line highlight
            }
        });

        monaco.editor.defineTheme('architect-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '2563eb', fontStyle: 'bold' },
                { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
                { token: 'string', foreground: '059669' },
                { token: 'number', foreground: 'd97706' },
                { token: 'type', foreground: '9333ea' },
            ],
            colors: {
                'editor.background': '#f8fafc',
                'editor.foreground': '#334155',
                'editorLineNumber.foreground': '#cbd5e1',
                'editorLineNumber.activeForeground': '#2563eb',
                'editor.lineHighlightBackground': '#f1f5f9',
                'editor.selectionBackground': '#e2e8f0',
                'editorCursor.foreground': '#2563eb',
                'editor.lineHighlightBorder': '#00000000',
            }
        });

        monaco.editor.setTheme(theme === 'dark' ? 'architect-dark' : 'architect-light');

    }, [theme]);

    // Update theme when it changes
    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(theme === 'dark' ? 'architect-dark' : 'architect-light');
        }
    }, [theme]);

    return (
        <div className="h-full flex flex-col gap-4 animate-slide-up relative">
            <MonacoWrapper
                code={code}
                onChange={handleCodeChange}
                onMount={handleEditorMount}
                theme={(theme === 'light' || theme === 'dark') ? theme : 'dark'}
                syntaxErrors={syntaxErrors}
                setCode={setCode}
            />

            <EditorToolbar
                handleGenerate={handleGenerate}
                isLoading={isLoading}
                hasCode={!!code.trim()}



            />




        </div>
    );
}
