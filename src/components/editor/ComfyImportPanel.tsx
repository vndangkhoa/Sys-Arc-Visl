import React, { useState } from 'react';
import { workflowToMermaid } from '../../lib/comfy2mermaid';
import { Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { useFlowStore } from '../../store';
import { parseMermaid } from '../../lib/mermaidParser';
import { getLayoutedElements } from '../../lib/layoutEngine';

export function ComfyImportPanel() {
    const {
        setMermaidCode,
        setSourceCode,
        setNodes,
        setEdges,
        setInputActiveTab,
        saveDiagram
    } = useFlowStore();

    const [jsonInput, setJsonInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                setJsonInput(text);
                convert(text);
            } catch (err) {
                setError("Failed to read file");
            }
        };
        reader.readAsText(file);
    };

    const convert = async (input: string) => {
        setError(null);
        if (!input.trim()) return;

        try {
            const workflow = JSON.parse(input);
            const code = workflowToMermaid(workflow);

            // Update Store
            setMermaidCode(code);
            setSourceCode(code);

            // Process Diagram for visualization
            const { nodes: parsedNodes, edges: parsedEdges } = await parseMermaid(code);
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(parsedNodes, parsedEdges);

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

            // Auto-save
            saveDiagram(`ComfyUI Import ${new Date().toLocaleTimeString()}`);

            // Switch back to Code tab to see result
            setInputActiveTab('code');

        } catch (err) {
            console.error(err);
            setError("Invalid JSON or conversion error: " + (err instanceof Error ? err.message : String(err)));
        }
    };

    return (
        <div className="flex flex-col h-full animate-slide-up">
            <div className="p-4 mb-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition rounded-lg group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">Click to upload</span> or drag workflow.json
                        </p>
                    </div>
                    <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                </label>
            </div>

            <div className="flex-1 flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pl-1">
                    Or Paste JSON
                </label>
                <textarea
                    className="flex-1 w-full p-4 rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 resize-none outline-none focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{ "nodes": [], "links": [] }'
                />
            </div>

            {error && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 p-3 rounded-lg flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <button
                onClick={() => convert(jsonInput)}
                disabled={!jsonInput.trim()}
                className={`mt-4 w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2
                    ${!jsonInput.trim()
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]'
                    }`}
            >
                <RefreshCw className="w-4 h-4" />
                Convert & Visualize
            </button>
        </div>
    );
}
