import { useState } from 'react';
import { Eye, Server, Database, Smartphone } from 'lucide-react';
import { useFlowStore } from '../store';

const filters = [
    { id: 'filter-client', label: 'Client', icon: Smartphone, color: '#a855f7' },
    { id: 'filter-server', label: 'Server', icon: Server, color: '#3b82f6' },
    { id: 'filter-db', label: 'Database', icon: Database, color: '#10b981' },
];

export default function InteractiveLegend() {
    const [isOpen, setIsOpen] = useState(false);
    const { focusMode, activeFilters, toggleFilter } = useFlowStore();

    if (focusMode) return null;

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
                <div className="absolute bottom-12 left-0 floating-glass border titanium-border rounded-xl p-3 min-w-[140px] shadow-xl animate-fade-in">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-3 border-b titanium-border pb-2">
                        Legend Filters
                    </div>
                    <div className="space-y-1">
                        {filters.map(f => {
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
                                    <span className="text-[11px] font-bold tracking-tight">{f.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
