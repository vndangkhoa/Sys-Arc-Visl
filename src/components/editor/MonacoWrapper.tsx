
import Editor, { type OnMount } from '@monaco-editor/react';
import { AlertCircle, Trash2 } from 'lucide-react';

interface MonacoWrapperProps {
    code: string;
    onChange: (value: string | undefined) => void;
    onMount: OnMount;
    theme: 'light' | 'dark';
    syntaxErrors: { line: number; message: string }[];

    setCode: (code: string) => void;
}

export function MonacoWrapper({
    code,
    onChange,
    onMount,
    theme,
    syntaxErrors,
    setCode
}: MonacoWrapperProps) {
    // monacoRef removed as it was unused

    // Define themes once on mount or when theme prop changes appropriately
    // For simplicity, we can do it inside a useEffect here if we have access to monaco instance, 
    // but usually it's better to do it once. 
    // However, since we need monaco instance, we'll assume the parent component or this component handles it via onMount/useEffect.

    // Actually, let's keep the theme definition inside the component for now or rely on the parent to pass the ref if needed. 
    // But better yet, let's expose specific theme logic or keep it self-contained if possible. 
    // The original code defined themes in useEffect when monacoRef was available.

    return (
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
                onChange={onChange}
                onMount={onMount}
            />

            {/* Floating Action Buttons */}
            <div className="absolute top-4 right-24 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCode('')}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all backdrop-blur-md shadow-lg"
                        title="Clear Code"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
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
        </div>
    );
}
