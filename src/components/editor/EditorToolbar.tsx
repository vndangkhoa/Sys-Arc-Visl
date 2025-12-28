import { Loader2, Zap } from 'lucide-react';

interface EditorToolbarProps {
    handleGenerate: () => void;
    isLoading: boolean;
    hasCode: boolean;
    hasCode: boolean;
}

import { usePluginStore } from '../../store/pluginStore';

export function EditorToolbar({
    handleGenerate,
    isLoading,
    hasCode,
}: EditorToolbarProps) {
    const { toolbarItems } = usePluginStore();
    return (
        <div className="flex items-center justify-between w-full pt-2 px-2">



            {/* Center: Insert Tools */}
            <div className="flex items-center gap-6 absolute left-1/2 -translate-x-1/2">


                {/* Plugin Items */}
                {toolbarItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={item.onClick}
                        disabled={isLoading}
                        className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                        title={item.tooltip || item.label}
                    >
                        <item.icon className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-200 transition-colors">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center">
                <button
                    onClick={handleGenerate}
                    disabled={!hasCode || isLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] hover:from-[#7c3aed] hover:to-[#8b5cf6] text-white shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white/90" />
                    ) : (
                        <>
                            <Zap className="w-4 h-4 fill-white" />
                            <span className="text-xs font-black uppercase tracking-widest">Visualize</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
