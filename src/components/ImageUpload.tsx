import { useState, useCallback } from 'react';
import { useFlowStore } from '../store';
import { analyzeImage, analyzeSVG } from '../lib/aiService';
import { parseMermaid } from '../lib/mermaidParser';
import { getLayoutedElements } from '../lib/layoutEngine';
import { Upload, X, Loader2, Zap } from 'lucide-react';

export function ImageUpload() {
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileType, setFileType] = useState<'image' | 'svg' | null>(null);
    const [svgContent, setSvgContent] = useState<string>('');

    const {
        setNodes, setEdges, setLoading, setError, setSourceCode, isLoading,
        ollamaUrl, modelName, aiMode, onlineProvider, apiKey, generationComplexity
    } = useFlowStore();

    const handleFile = useCallback((file: File) => {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');

        if (!validImageTypes.includes(file.type) && !isSvg) {
            setError('Please upload a JPG, PNG, WEBP, or SVG file');
            return;
        }

        setError(null);

        if (isSvg) {
            setFileType('svg');
            const textReader = new FileReader();
            textReader.onload = (e) => setSvgContent(e.target?.result as string);
            textReader.readAsText(file);

            const previewReader = new FileReader();
            previewReader.onload = (e) => setPreview(e.target?.result as string);
            previewReader.readAsDataURL(file);
        } else {
            setFileType('image');
            setSvgContent('');
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    }, [setError]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleGenerate = useCallback(async () => {
        if (aiMode === 'offline' && !ollamaUrl) {
            setError('Please configure Ollama URL in settings');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            let result;
            if (fileType === 'svg' && svgContent) {
                result = await analyzeSVG(
                    svgContent,
                    ollamaUrl,
                    modelName,
                    aiMode,
                    onlineProvider,
                    apiKey,
                    generationComplexity
                );
            } else if (preview) {
                result = await analyzeImage(
                    preview,
                    ollamaUrl,
                    modelName,
                    aiMode,
                    onlineProvider,
                    apiKey,
                    generationComplexity
                );
            } else {
                throw new Error('No content to process');
            }

            if (!result.success || !result.mermaidCode) {
                throw new Error(result.error || 'Could not interpret flow from the input');
            }

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
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to process input');
        } finally {
            setLoading(false);
        }
    }, [preview, svgContent, fileType, ollamaUrl, modelName, setNodes, setEdges, setLoading, setError, setSourceCode, aiMode, onlineProvider, apiKey]);

    return (
        <div className="h-full flex flex-col gap-6 animate-slide-up">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !preview && document.getElementById('image-input')?.click()}
                className={`flex-1 relative rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border border-dashed
                    ${isDragging
                        ? 'bg-blue-500/10 border-blue-500/50 scale-[1.01]'
                        : 'bg-black/20 border-white/5 hover:bg-black/40 hover:border-white/10'
                    }`}
            >
                <input
                    id="image-input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.svg"
                    onChange={handleFileInput}
                    className="hidden"
                />

                {preview ? (
                    <div className="w-full h-full p-4 relative group">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                        <button
                            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
                            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-6">
                        <Upload className="w-8 h-8 text-slate-700 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                            {isDragging ? 'Release' : 'Drop Visuals'}
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={handleGenerate}
                disabled={(!preview && !svgContent) || isLoading}
                className="btn-primary"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-void-950" />
                ) : (
                    <>
                        <Zap className="w-4 h-4 fill-void-950" />
                        <span>Reconstruct</span>
                    </>
                )}
            </button>
        </div>
    );
}
