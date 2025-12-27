import React, { useCallback, useMemo, useState } from 'react';
import {
    ReactFlow,
    Background,
    Panel,
    MiniMap,
    useReactFlow,
    BackgroundVariant,
    SelectionMode,
} from '@xyflow/react';
import { useFlowStore } from '../store';
import { nodeTypes } from './nodes/CustomNodes';
import { edgeTypes, EdgeDefs } from './edges/AnimatedEdge';
import {
    Spline, Minus, Plus, Maximize, Map, Wand2,
    RotateCcw, Download, Command, Hand, MousePointer2, Settings2, ChevronDown
} from 'lucide-react';
import { getLayoutedElements } from '../lib/layoutEngine';

export function FlowCanvas() {
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        setSelectedNode, edgeStyle, setEdgeStyle, theme, activeFilters,
        setNodes, setEdges
    } = useFlowStore();
    const { zoomIn, zoomOut, fitView, getViewport } = useReactFlow();
    const [showToolkit, setShowToolkit] = useState(false); // New State
    const [showMiniMap, setShowMiniMap] = useState(true);
    const [isSelectionMode, setIsSelectionMode] = useState(false); // false = Pan, true = Select

    const nodeTypesMemo = useMemo(() => nodeTypes, []);
    const edgeTypesMemo = useMemo(() => edgeTypes, []);

    // ... existing code ...

    // Helper components for Toolkit
    function ToolkitButton({ icon: Icon, onClick, label }: { icon: any; onClick: () => void; label: string }) {
        return (
            <button
                onClick={onClick}
                className="flex-1 flex flex-col items-center justify-center py-2 hover:bg-white dark:hover:bg-white/10 transition-colors group"
                title={label}
            >
                <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-0.5" />
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300">{label}</span>
            </button>
        );
    }

    function MenuButton({ icon: Icon, label, active, onClick, iconClass = '' }: { icon: any; label: string; active?: boolean; onClick: () => void; iconClass?: string }) {
        return (
            <button
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${active
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-secondary hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
            >
                <Icon className={`w-4 h-4 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} ${iconClass}`} />
                <span className="text-xs font-bold">{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
        );
    }

    // Control Button Component - No longer needed in original form but kept if referenced elsewhere
    // or can be removed if unused. for now I will comment it out or leave it if TypeScript complains about usage elsewhere.
    // But we replaced all usage in this file.


    // Filter nodes based on active filters
    const filteredNodes = useMemo(() => {
        return nodes.map(node => {
            if (node.type === 'group') return node;

            const category = (node.data?.category as string) || (node.type === 'database' ? 'filter-db' : node.type === 'client' ? 'filter-client' : 'filter-server');

            return {
                ...node,
                hidden: !activeFilters.includes(category)
            };
        });
    }, [nodes, activeFilters]);

    // Apply edge styling with offsets to prevent overlaps
    const styledEdges = useMemo(() => {
        // Group edges by source-target pair to add offsets
        const edgeGroups: Record<string, number> = {};

        return edges.map((edge) => {
            const key = `${edge.source}-${edge.target}`;
            const reverseKey = `${edge.target}-${edge.source}`;

            // Count how many edges share this connection
            const groupIndex = edgeGroups[key] || edgeGroups[reverseKey] || 0;
            edgeGroups[key] = groupIndex + 1;

            return {
                ...edge,
                type: edgeStyle === 'curved' ? 'curved' : 'straight',
                // Add slight offset for parallel edges
                style: {
                    ...edge.style,
                    strokeWidth: 2,
                },
                data: {
                    ...edge.data,
                    offset: groupIndex * 20, // Offset parallel edges
                },
            };
        });
    }, [edges, edgeStyle]);

    // Filter edges to only show connections between visible nodes
    const filteredEdges = useMemo(() => {
        const visibleNodeIds = new Set(filteredNodes.filter(n => !n.hidden).map(n => n.id));
        return styledEdges.map(edge => ({
            ...edge,
            hidden: !visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)
        }));
    }, [styledEdges, filteredNodes]);

    // Node click handler - bidirectional highlighting
    const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
        setSelectedNode(node);
        // Dispatch event for code editor cross-highlighting
        window.dispatchEvent(new CustomEvent('node-selected', { detail: { nodeId: node.id, label: node.data?.label } }));
    }, [setSelectedNode]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, [setSelectedNode]);

    // Auto-layout cleanup function
    const handleAutoLayout = useCallback(() => {
        if (nodes.length === 0) return;
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
    }, [nodes, edges, setNodes, setEdges, fitView]);

    // Reset view
    const handleResetView = useCallback(() => {
        fitView({ padding: 0.2, duration: 500 });
    }, [fitView]);

    // MiniMap node color function
    const miniMapNodeColor = useCallback((node: any) => {
        const label = (node.data?.label || '').toLowerCase();
        if (label.includes('ai') || label.includes('director')) return '#8b5cf6';
        if (label.includes('intern') || label.includes('team')) return '#f59e0b';
        if (label.includes('data') || label.includes('analyst')) return '#06b6d4';
        if (label.includes('platform') || label.includes('shop')) return '#ec4899';
        return '#3b82f6';
    }, []);

    return (
        <div className="w-full h-full relative bg-void">
            <EdgeDefs />
            <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypesMemo}
                edgeTypes={edgeTypesMemo}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
                minZoom={0.1}
                maxZoom={4}
                panOnDrag={!isSelectionMode}
                selectionOnDrag={isSelectionMode}
                selectionMode={SelectionMode.Partial}
                selectionKeyCode="Shift"
                multiSelectionKeyCode={['Meta', 'Control']}
                deleteKeyCode={['Backspace', 'Delete']}
                defaultEdgeOptions={{
                    type: edgeStyle === 'curved' ? 'curved' : 'straight',
                    style: { strokeWidth: 2, stroke: theme === 'dark' ? '#475569' : '#94a3b8' },
                }}
                proOptions={{ hideAttribution: true }}
                style={{ backgroundColor: 'transparent' }}
            >
                {/* Grid Background */}
                <Background
                    variant={BackgroundVariant.Dots}
                    color={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    gap={20}
                    size={1}
                />

                {/* Control Panel - Top Right (Unified Toolkit) */}
                <Panel position="top-right" className="!m-4 flex flex-col items-end gap-3 z-50">
                    <div className="relative">
                        <button
                            onClick={() => setShowToolkit(!showToolkit)}
                            className={`
                                h-10 px-4 flex items-center gap-2 rounded-xl transition-all shadow-lg backdrop-blur-md border outline-none
                                ${showToolkit
                                    ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/20'
                                    : 'bg-white/90 dark:bg-surface/90 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-surface'}
                            `}
                        >
                            <Settings2 className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Toolkit</span>
                            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showToolkit ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showToolkit && (
                            <div className="absolute top-full right-0 mt-2 w-56 p-2 rounded-2xl bg-white/95 dark:bg-[#0B1221]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">

                                {/* Section: Interaction Mode */}
                                <div className="p-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1 block">Mode</span>
                                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                                        <button
                                            onClick={() => setIsSelectionMode(false)}
                                            className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${!isSelectionMode
                                                ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <Hand className="w-4 h-4 mb-1" />
                                            <span className="text-[9px] font-bold">Pan</span>
                                        </button>
                                        <button
                                            onClick={() => setIsSelectionMode(true)}
                                            className={`flex flex-col items-center justify-center py-2 rounded-md transition-all ${isSelectionMode
                                                ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                                                }`}
                                        >
                                            <MousePointer2 className="w-4 h-4 mb-1" />
                                            <span className="text-[9px] font-bold">Select</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-200 dark:bg-white/10 mx-2" />

                                {/* Section: View Controls */}
                                <div className="p-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1 block">View</span>
                                    <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-0.5 divide-x divide-slate-200 dark:divide-white/5 border border-slate-200 dark:border-white/5">
                                        <ToolkitButton icon={Minus} onClick={() => zoomOut()} label="Out" />
                                        <ToolkitButton icon={Plus} onClick={() => zoomIn()} label="In" />
                                        <ToolkitButton icon={Maximize} onClick={handleResetView} label="Fit" />
                                    </div>
                                </div>

                                <div className="h-px bg-slate-200 dark:bg-white/10 mx-2" />

                                {/* Section: Layout & Overlays */}
                                <div className="p-1 space-y-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 mb-1 block">Actions</span>

                                    <MenuButton
                                        icon={Wand2}
                                        label="Auto Layout"
                                        active={false}
                                        onClick={handleAutoLayout}
                                    />

                                    <MenuButton
                                        icon={edgeStyle === 'curved' ? Spline : Minus}
                                        label={edgeStyle === 'curved' ? 'Edge Style: Curved' : 'Edge Style: Straight'}
                                        iconClass={edgeStyle === 'straight' ? 'rotate-45' : ''}
                                        active={false}
                                        onClick={() => setEdgeStyle(edgeStyle === 'curved' ? 'straight' : 'curved')}
                                    />

                                    <MenuButton
                                        icon={Map}
                                        label="MiniMap Overlay"
                                        active={showMiniMap}
                                        onClick={() => setShowMiniMap(!showMiniMap)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </Panel>

                {/* MiniMap Container - Bottom Right */}
                <Panel position="bottom-right" className="!m-4 z-40">
                    {showMiniMap && nodes.length > 0 && (
                        <div className="w-52 h-36 rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <MiniMap
                                nodeColor={miniMapNodeColor}
                                nodeStrokeWidth={3}
                                nodeBorderRadius={8}
                                maskColor={theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'}
                                className="!w-full !h-full !m-0 !relative !bg-transparent"
                                pannable
                                zoomable
                            />
                        </div>
                    )}
                </Panel>

                {/* Status Indicator - Bottom Left */}
                {nodes.length > 0 && (
                    <Panel position="bottom-left" className="!m-6">
                        <div className="flex items-center gap-4 px-4 py-2.5 bg-white/90 dark:bg-surface/90 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-xl shadow-xl">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-tertiary">
                                    {nodes.filter(n => n.type !== 'group').length} Nodes
                                </span>
                            </div>
                            <div className="w-px h-3 bg-slate-200 dark:bg-white/10" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-tertiary">
                                {edges.length} Edges
                            </span>
                        </div>
                    </Panel>
                )}

                {/* Command Palette Hint - Top Center */}
                <Panel position="top-center" className="!mt-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-surface/60 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-lg text-slate-500 dark:text-tertiary hover:text-slate-800 dark:hover:text-secondary transition-colors cursor-pointer opacity-60 hover:opacity-100">
                        <Command className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">K</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">Quick Actions</span>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}

// Control Button Component
interface ControlButtonProps {
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    title: string;
    highlight?: boolean;
}

function ControlButton({ icon: Icon, onClick, title, highlight }: ControlButtonProps) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`
                w-10 h-10 flex items-center justify-center 
                text-secondary hover:text-primary hover:bg-blue-500/10 
                transition-all
                ${highlight ? 'text-blue-500' : ''}
            `}
            title={title}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}
