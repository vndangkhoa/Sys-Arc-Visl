import { useState, useMemo, useEffect } from 'react';
import { Eye, Server, Database, Smartphone, Layers, BoxSelect, Share2 } from 'lucide-react';
import { useFlowStore } from '../store';

const filters = [
    { id: 'filter-client', label: 'Client', icon: Smartphone, color: '#a855f7' },
    { id: 'filter-server', label: 'Server', icon: Server, color: '#3b82f6' },
    { id: 'filter-db', label: 'Database', icon: Database, color: '#10b981' },
    { id: 'filter-group', label: 'Groups', icon: BoxSelect, color: '#94a3b8' },
    { id: 'filter-other', label: 'Flow / Other', icon: Layers, color: '#f59e0b' },
    { id: 'filter-edge', label: 'Connections', icon: Share2, color: '#64748b' },
];

export default function InteractiveLegend() {
    const [isOpen, setIsOpen] = useState(false);
    const { focusMode, activeFilters, toggleFilter, setActiveFilters, nodes, edges } = useFlowStore();

    // EFFECT: Auto-register new dynamic categories (labels) into activeFilters so they show by default
    const [knownDynamicLabels, setKnownDynamicLabels] = useState<Set<string>>(new Set());

    const dynamicFilters = useMemo(() => {
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return [];

        const labels = new Set<string>();
        nodes.forEach(node => {
            if (node.type !== 'group' && node.data?.label) {
                // Heuristic: If label looks like a type (AlphaNumeric, no spaces preferably, or short)
                const label = String(node.data.label).trim();
                if (label.length < 30) {
                    labels.add(label);
                }
            }
        });

        const sortedLabels = Array.from(labels).sort();

        // Generate consistent colors for labels
        const stringToColor = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            return '#' + '00000'.substring(0, 6 - c.length) + c;
        };

        return sortedLabels.map(label => ({
            id: `dyn-${label}`,
            label: label,
            icon: BoxSelect,
            color: stringToColor(label),
            isDynamic: true
        }));
    }, [nodes]);

    // Sync effect to auto-enable new filters
    useEffect(() => {
        if (!activeFilters) return;

        const newLabels = dynamicFilters.filter(f => !knownDynamicLabels.has(f.id));
        if (newLabels.length > 0) {
            const nextKnown = new Set(knownDynamicLabels);
            const idsToAdd: string[] = [];

            newLabels.forEach(f => {
                nextKnown.add(f.id);
                // Only add to active if NOT ALREADY THERE. Default to ON.
                if (!activeFilters.includes(f.id)) {
                    idsToAdd.push(f.id);
                }
            });

            if (idsToAdd.length > 0) {
                // Use a timeout to avoid render-cycle issues with Zustand updates inside useEffect
                setTimeout(() => {
                    setActiveFilters([...activeFilters, ...idsToAdd]);
                }, 0);
            }

            setKnownDynamicLabels(nextKnown);
        }
    }, [dynamicFilters, activeFilters, knownDynamicLabels, setActiveFilters]);

    if (focusMode) return null;

    // Calculate available categories from current nodes
    const availableCategories = new Set((nodes || []).map(node => node.data?.category));

    // Always include 'filter-group' if there are groups
    if ((nodes || []).some(n => n.type === 'group')) {
        availableCategories.add('filter-group');
    }

    // Always include 'filter-edge' if there are edges
    if (edges && Array.isArray(edges) && edges.length > 0) {
        availableCategories.add('filter-edge');
    }

    const visibleStaticFilters = filters.filter(f => availableCategories.has(f.id));
    const allVisibleFilters = [...visibleStaticFilters, ...dynamicFilters];

    if (allVisibleFilters.length === 0) return null;

    return (
        <div className="absolute bottom-20 left-4 z-50">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg border ${isOpen
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-surface text-secondary titanium-border hover:text-primary hover:border-blue-500/30'
                    }`}
                title="Diagram Legend"
            >
                <Eye className="w-4 h-4" />
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="absolute bottom-12 left-0 floating-glass border titanium-border rounded-xl p-3 min-w-[140px] max-h-[60vh] overflow-y-auto shadow-xl animate-fade-in hide-scrollbar">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-3 border-b titanium-border pb-2">
                        Legend Filters
                    </div>
                    <div className="space-y-1">
                        {allVisibleFilters.map(f => {
                            const isActive = activeFilters.includes(f.id);
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => toggleFilter(f.id)}
                                    className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all ${isActive ? 'bg-blue-500/10 text-primary' : 'opacity-40 hover:opacity-60 grayscale'}`}
                                >
                                    <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: f.color }}
                                    />
                                    <span className="text-[11px] font-bold tracking-tight text-left truncate">{f.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
