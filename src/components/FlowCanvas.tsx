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
import { useMobileDetect } from '../hooks/useMobileDetect';
import { nodeTypes } from './nodes/CustomNodes';
import { edgeTypes, EdgeDefs } from './edges/AnimatedEdge';
import {
    Spline, Minus, Plus, Maximize, Map, Wand2,
    Hand, MousePointer2, Settings2, ChevronDown, FileImage, Trash2
} from 'lucide-react';
import { getLayoutedElements } from '../lib/layoutEngine';




export function FlowCanvas() {
    const {
        nodes, edges, onNodesChange, onEdgesChange, onConnect,
        setSelectedNode, edgeStyle, setEdgeStyle, theme, activeFilters,
        setNodes, setEdges, focusMode, viewMode, setViewMode,
        setMermaidCode, setInputDescription, setSourceCode
    } = useFlowStore();
    const { isMobile } = useMobileDetect();
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const [showToolkit, setShowToolkit] = useState(false); // New State

    // Track cursor - Removed for single user mode
    // const handleMouseMove = useCallback((e: React.MouseEvent) => { ... }, []);

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
            if (node.type === 'group') {
                const category = (node.data?.category as string) || 'filter-other';
                // Group is visible if Groups are enabled AND its specific category is enabled
                const isGroupEnabled = activeFilters.includes('filter-group');
                const isCategoryEnabled = activeFilters.includes(category);

                return {
                    ...node,
                    hidden: !isGroupEnabled || !isCategoryEnabled
                };
            }

            let category = (node.data?.category as string);

            if (!category) {
                switch (node.type) {
                    case 'client':
                        category = 'filter-client';
                        break;
                    case 'database':
                        category = 'filter-db';
                        break;
                    case 'server':
                        category = 'filter-server';
                        break;
                    default:
                        category = 'filter-other'; // Start, End, Process, Decision, etc.
                }
            }

            // Check for Dynamic Label Filter
            const label = (node.data?.label as string || '').trim();
            const dynamicFilterId = `dyn-${label}`;

            // Logic:
            // 1. If a dynamic filter active state exists for this label (meaning the label is "known" effectively), check it.
            //    However, activeFilters is a list of IDs.
            //    Wait, we don't know if the filter 'exists' here easily without scanning all nodes or passing `dynamicFilters` prop.
            //    But we know if `dyn-` version is in `activeFilters`, it is explicitly ON.
            //    If `dyn-` version is NOT in `activeFilters`, is it implicitly OFF?
            //    In `InteractiveLegend`, we auto-add new dynamic labels to `activeFilters`.
            //    So if it IS a known dynamic label, it SHOULD be in `activeFilters` to be visible.
            //    But `FlowCanvas` doesn't know if it's a "known" dynamic label or just some random text.
            //    Heuristic: If the label is short enough to trigger a dynamic filter (length < 30),
            //    then we assume it is governed by the dynamic filter system.

            let isVisible = false;

            if (label.length < 30 && label.length > 0) {
                // It is a dynamic filter candidate.
                // Visibility is determined by presence in activeFilters.
                // Note: InteractiveLegend adds them asynchronously. There might be a split second where it's hidden before appearing.
                // To prevent flickering: maybe default to TRUE if activeFilters doesn't contain ANY dynamic filters yet? No.
                // We will trust the store.

                // If the user has disabled the category (e.g. 'Server'), should 'KSampler' still show?
                // User request imply: "specific node that appear".
                // Usually specific overrides general.

                const isDynamicActive = activeFilters.includes(dynamicFilterId);
                if (isDynamicActive) {
                    isVisible = true;
                } else {
                    // CAUTION: If it's NOT in activeFilters, it could mean:
                    // A) InteractiveLegend hasn't added it yet (it's new) -> Should show?
                    // B) User explicitly turned it off -> Should hide.

                    // Problem: We can't distinguish A from B easily here.
                    // But we know InteractiveLegend adds them immediately on mount/update.
                    // A flash of invisibility is possible.
                    // BUT, we can fallback to Category visibility if Dynamic visibility is "off" (missing)?
                    // No, if I turn off "KSampler", I want it gone.

                    // Let's assume if the label is "Dynamic-able", strict filtering applies.
                    // But if activeFilters doesn't have it, it's hidden.

                    // Fallback check:
                    // Is the CATEGORY also required?
                    // If I have "KSampler" (Other), and I turn off "Other", "KSampler" should probably hide too?
                    // Composite logic: Visible if (Category is Active) AND (Dynamic is Active or Not Applicable).

                    // BUT, dynamic filters are added to the list.
                    // If I toggle "KSampler", it removes from list.
                    // So we must check dynamic ID.

                    // If we enforce BOTH, then unchecking "Other" hides everything.
                    // If we enforce EITHER, then unchecking "Other" keeps KSampler.

                    // Let's go with: Dynamic Filter OVERRIDES Category if present?
                    // Or Dynamic Filter is an AND condition?
                    // Usually: Visible = CategoryActive && (DynamicActive if exists).

                    // Let's try:
                    // If `activeFilters` has ANY `dyn-`... implied system is active.
                }

                // REVISED LOGIC:
                // We check if `dyn-${label}` is in activeFilters. 
                // If we find ANY `dyn-` filters in `activeFilters` at all, we assume system is initialized.
                // If so, we stick to strict checking.

                const anyDynamicActive = activeFilters.some(f => f.startsWith('dyn-'));

                if (!anyDynamicActive) {
                    // System maybe not ready or no dynamic filters active.
                    // Fallback to category.
                    isVisible = activeFilters.includes(category);
                } else {
                    // System has dynamic filters.
                    // If this specific dynamic filter is present, show.
                    // Also check category?
                    // Let's prioritize Dynamic Filter visibility.
                    if (activeFilters.includes(dynamicFilterId)) {
                        isVisible = true;
                    } else {
                        // Dynamic filter is OFF.
                        isVisible = false;
                    }
                }

            } else {
                // Not a dynamic label situation, standard category
                isVisible = activeFilters.includes(category);
            }

            return {
                ...node,
                hidden: !isVisible
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

    // Filter edges to only show connections between visible nodes AND if edges are enabled
    const filteredEdges = useMemo(() => {
        // Check if edges are globally enabled via filter
        const edgesEnabled = activeFilters.includes('filter-edge');
        if (!edgesEnabled) return [];

        const visibleNodeIds = new Set(filteredNodes.filter(n => !n.hidden).map(n => n.id));
        return styledEdges.map(edge => ({
            ...edge,
            hidden: !visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)
        }));
    }, [styledEdges, filteredNodes, activeFilters]);

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
                panOnScroll={!isMobile} // Disable on mobile to prevent scroll conflicts
                zoomOnPinch={true} // Enable pinch-to-zoom on mobile
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

                {/* Control Panel - Top Right (Unified Toolkit) - Desktop Only */}
                {!isMobile && (
                    <Panel position="top-right" className={`!m-4 !mr-6 flex flex-col items-end gap-3 z-50 transition-all duration-300 ${focusMode ? '!mt-20' : ''}`}>
                        <div className="flex items-center gap-2">
                            {/* Clear Dashboard Button */}
                            {nodes.length > 0 && (
                                <button
                                    onClick={() => {
                                        setNodes([]);
                                        setEdges([]);
                                        setMermaidCode('');
                                        setInputDescription('');
                                        setSourceCode('');
                                    }}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/90 dark:bg-surface/90 backdrop-blur-md border border-red-200 dark:border-red-900/30 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition-all"
                                    title="Clear Dashboard"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}

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

                                            <MenuButton
                                                icon={FileImage}
                                                label="Static View"
                                                active={false}
                                                onClick={() => setViewMode('static')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>
                )}

                {/* Mobile Bottom Action Bar */}
                {isMobile && nodes.length > 0 && !focusMode && (
                    <Panel position="bottom-center" className="!mb-24 z-50">
                        <div className="flex items-center gap-1 px-2 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl">
                            {/* Zoom Out */}
                            <button
                                onClick={() => zoomOut()}
                                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                title="Zoom Out"
                            >
                                <Minus className="w-5 h-5" />
                            </button>

                            {/* Zoom In */}
                            <button
                                onClick={() => zoomIn()}
                                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                title="Zoom In"
                            >
                                <Plus className="w-5 h-5" />
                            </button>

                            {/* Fit View */}
                            <button
                                onClick={handleResetView}
                                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                title="Fit to View"
                            >
                                <Maximize className="w-5 h-5" />
                            </button>

                            {/* Divider */}
                            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />

                            {/* Auto Layout */}
                            <button
                                onClick={handleAutoLayout}
                                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                title="Auto Layout"
                            >
                                <Wand2 className="w-5 h-5" />
                            </button>

                            {/* Toggle Edge Style */}
                            <button
                                onClick={() => setEdgeStyle(edgeStyle === 'curved' ? 'straight' : 'curved')}
                                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                                title={edgeStyle === 'curved' ? 'Switch to Straight Edges' : 'Switch to Curved Edges'}
                            >
                                {edgeStyle === 'curved' ? <Spline className="w-5 h-5" /> : <Minus className="w-5 h-5 rotate-45" />}
                            </button>
                        </div>
                    </Panel>
                )}

                {/* MiniMap Container - Bottom Right (Hidden on Mobile) */}
                <Panel position="bottom-right" className="!m-4 z-40">
                    {showMiniMap && nodes.length > 0 && !isMobile && (
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

                {/* Status Indicator - Bottom Left (Hidden on Mobile - shown in header) */}
                {nodes.length > 0 && !isMobile && (
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

                {/* Command Palette Hint - Top Center (Desktop only) */}

            </ReactFlow>
        </div>
    );
}


