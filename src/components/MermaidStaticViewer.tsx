import { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import { useFlowStore } from '../store';
import { ZoomIn, ZoomOut, Maximize, AlertCircle, MousePointer2 } from 'lucide-react';

export function MermaidStaticViewer() {
    const { mermaidCode, theme, setViewMode } = useFlowStore();
    const [svgContent, setSvgContent] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const renderMermaid = async () => {
            if (!mermaidCode) {
                setSvgContent('');
                return;
            }

            try {
                // Configure mermaid based on theme
                mermaid.initialize({
                    startOnLoad: false,
                    theme: theme === 'dark' ? 'dark' : 'default',
                    securityLevel: 'loose',
                    fontFamily: 'Instrument Sans, sans-serif',
                });

                // Generate unique ID for the SVG
                const id = `mermaid-${Date.now()}`;
                const { svg } = await mermaid.render(id, mermaidCode);

                setSvgContent(svg);
                setError(null);
                // Reset view on new render
                setScale(1);
                setPosition({ x: 0, y: 0 });
            } catch (err) {
                console.error("Mermaid Render Error", err);
                setError(err instanceof Error ? err.message : 'Failed to render Mermaid diagram');
            }
        };

        renderMermaid();
    }, [mermaidCode, theme]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(s => Math.min(Math.max(0.1, s * delta), 8));
        } else {
            // Pan
            setPosition(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const fitView = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    if (!mermaidCode) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 italic relative">
                <div className="mb-4">No Mermaid code to render</div>
                <button
                    onClick={() => setViewMode('interactive')}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors font-bold text-xs"
                >
                    <MousePointer2 className="w-4 h-4" />
                    Back to Interactive
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-red-500 p-8 text-center bg-slate-50 dark:bg-slate-900 relative">
                <AlertCircle className="w-10 h-10 mb-4 opacity-50" />
                <h3 className="font-bold mb-2">Rendering Error</h3>
                <p className="text-xs font-mono bg-red-50 dark:bg-red-900/10 p-4 rounded-xl max-w-lg overflow-auto select-text mb-6">
                    {error}
                </p>
                <button
                    onClick={() => setViewMode('interactive')}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg text-slate-600 dark:text-slate-300 transition-colors font-bold text-xs"
                >
                    <MousePointer2 className="w-4 h-4" />
                    Back to Interactive
                </button>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#0B1221] relative overflow-hidden flex flex-col select-none">
            {/* Controls */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
                <div className="flex bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl rounded-xl border border-slate-200 dark:border-white/10 p-1">
                    <button onClick={() => setScale(s => Math.min(8, s * 1.2))} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400" title="Zoom In">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button onClick={() => setScale(s => Math.max(0.1, s / 1.2))} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400" title="Zoom Out">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={fitView} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400" title="Fit View">
                        <Maximize className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />

                    <button
                        onClick={() => setViewMode('interactive')}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 transition-colors font-bold text-xs uppercase tracking-wider"
                    >
                        <MousePointer2 className="w-4 h-4" />
                        Interactive
                    </button>
                </div>
            </div>

            {/* Viewport */}
            <div
                className="w-full h-full cursor-move flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                ref={containerRef}
            >
                <div
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        transformOrigin: 'center',
                    }}
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                    className="mermaid-svg-container"
                />
            </div>

            <div className="absolute bottom-4 right-4 pointer-events-none opacity-50 text-[10px] text-slate-400 font-mono">
                Static View • {Math.round(scale * 100)}%
            </div>
        </div>
    );
}
