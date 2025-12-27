import { useFlowStore } from '../store';
import {
    Server, Database, Smartphone, Layers, X, Tag, Code2,
    FileText, Activity, Zap, Cpu, Wifi, BarChart3
} from 'lucide-react';
import { useMemo } from 'react';
import { VisualOrganizerPanel } from './VisualOrganizerPanel';
import { SmartGuide } from './SmartGuide';

export function NodeDetailsPanel() {
    const { selectedNode, setSelectedNode, nodes, edges, updateNodeData, updateNodeType, deleteNode } = useFlowStore();

    // Stats for Empty State
    const systemStats = useMemo(() => ({
        activeNodes: nodes.length,
        totalLinks: edges.length,
        neuralLoad: '94%',
        uptime: '99.9%',
        engine: 'v3.0.4'
    }), [nodes, edges]);

    if (!selectedNode) {
        return (
            <div className="h-full flex flex-col p-8">
                <div className="flex items-center gap-3 mb-10">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary">Live Statistics</span>
                </div>

                <div className="space-y-6">
                    <StatItem icon={Cpu} label="Active Nodes" value={systemStats.activeNodes} />
                    <StatItem icon={Zap} label="Neural Load" value={systemStats.neuralLoad} />
                    <StatItem icon={Wifi} label="Connectivity" value="Optimal" color="text-emerald-500" />
                    <StatItem icon={BarChart3} label="Total Links" value={systemStats.totalLinks} />
                </div>

                <div className="mt-8 mb-6">
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
                </div>

                <VisualOrganizerPanel />

                <div className="mt-auto">
                    <SmartGuide />
                </div>
            </div>
        );
    }

    const label = (selectedNode.data?.label as string) || 'Node';
    const metadata = selectedNode.data?.metadata as { role?: string; techStack?: string[]; description?: string } | undefined;

    const getIcon = () => {
        const type = selectedNode.type || 'default';
        if (type.includes('database')) return <Database className="w-5 h-5" />;
        if (type.includes('client')) return <Smartphone className="w-5 h-5" />;
        if (type.includes('cache')) return <Layers className="w-5 h-5" />;
        return <Server className="w-5 h-5" />;
    };

    return (
        <div className="h-full flex flex-col animate-slide-up">
            <div className="p-6 pb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-secondary">Edit Node</span>
                <button onClick={() => setSelectedNode(null)} className="text-slate-400 dark:text-secondary hover:text-slate-700 dark:hover:text-primary transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto hide-scrollbar space-y-6">
                {/* Header Info */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shrink-0">
                        {getIcon()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-tertiary">{selectedNode.type || 'Standard'}</span>
                        </div>
                    </div>
                </div>

                {/* Editable Label */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-tertiary block">Node Label</label>
                    <input
                        type="text"
                        defaultValue={label}
                        onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500/50 transition-all text-slate-800 dark:text-primary placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        placeholder="Enter label..."
                    />
                </div>

                {/* Node Type Selector */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-tertiary block">Node Type</label>
                    <select
                        value={selectedNode.type || 'default'}
                        onChange={(e) => updateNodeType(selectedNode.id, e.target.value)}
                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm font-semibold outline-none focus:border-blue-500/50 transition-all text-slate-800 dark:text-primary cursor-pointer appearance-none"
                    >
                        <option value="default">Default</option>
                        <option value="start">Start</option>
                        <option value="end">End</option>
                        <option value="decision">Decision</option>
                        <option value="database">Database</option>
                        <option value="process">Process</option>
                        <option value="client">Client</option>
                        <option value="server">Server</option>
                    </select>
                </div>

                {/* Core Metadata */}
                <div className="space-y-6">
                    {metadata?.role && (
                        <InfoSection icon={Tag} label="Role" value={metadata.role} />
                    )}

                    {metadata?.techStack && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Code2 className="w-3.5 h-3.5 text-slate-400 dark:text-tertiary" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-secondary">Tech Stack</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {metadata.techStack.map((tech, i) => (
                                    <span key={i} className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-secondary border border-slate-200 dark:border-white/5">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Specification Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-tertiary" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-secondary">Specifications</span>
                        </div>
                        <div className="space-y-2">
                            <SpecRow label="Node ID" value={selectedNode.id} />
                            <SpecRow label="Position" value={`${Math.round(selectedNode.position.x)}, ${Math.round(selectedNode.position.y)}`} />
                            <SpecRow label="Dimensions" value={`${selectedNode.width || '---'} x ${selectedNode.height || '---'}`} />
                        </div>
                    </div>

                    {metadata?.description && (
                        <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                            <InfoSection icon={FileText} label="Instructional Description" value={metadata.description} />
                        </div>
                    )}
                </div>

                {/* Delete Button */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => deleteNode(selectedNode.id)}
                        className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold uppercase tracking-wider hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-500/40 transition-all flex items-center justify-center gap-2"
                    >
                        <X className="w-4 h-4" />
                        Delete Node
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatItem({ icon: Icon, label, value, color = "text-slate-800 dark:text-primary" }: { icon: any; label: string; value: string | number; color?: string }) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface border border-slate-200 dark:border-white/5 group-hover:bg-blue-500/10 transition-colors">
                    <Icon className="w-3 h-3 text-slate-400 dark:text-tertiary" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 dark:text-tertiary uppercase tracking-widest">{label}</span>
            </div>
            <span className={`text-xs font-black ${color}`}>{value}</span>
        </div>
    );
}

function SpecRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
            <span className="text-[10px] font-mono text-tertiary truncate max-w-[120px]">{value}</span>
        </div>
    );
}

function InfoSection({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-tertiary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-secondary">{label}</span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-secondary italic">
                {value}
            </p>
        </div>
    );
}
