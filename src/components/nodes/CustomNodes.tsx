import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Database, Cpu, Users, Globe, Server, Zap, Play, Square, GitBranch } from 'lucide-react';

/**
 * High-contrast, accessible node color palette
 * Each color has a background, border, and text color for maximum readability
 */
const NODE_STYLES = {
    ai: {
        bg: 'bg-violet-500/15 dark:bg-violet-500/20',
        solid: 'bg-violet-200 dark:bg-violet-900',
        border: 'border-violet-500',
        text: 'text-violet-700 dark:text-violet-200',
        textSolid: 'text-violet-700 dark:text-violet-300',
        icon: Cpu,
        glow: 'shadow-violet-500/20',
    },
    team: {
        bg: 'bg-amber-500/15 dark:bg-amber-500/20',
        solid: 'bg-amber-200 dark:bg-amber-900',
        border: 'border-amber-500',
        text: 'text-amber-800 dark:text-amber-200',
        textSolid: 'text-amber-800 dark:text-amber-300',
        icon: Users,
        glow: 'shadow-amber-500/20',
    },
    platform: {
        bg: 'bg-pink-500/15 dark:bg-pink-500/20',
        solid: 'bg-pink-200 dark:bg-pink-900',
        border: 'border-pink-500',
        text: 'text-pink-700 dark:text-pink-300',
        textSolid: 'text-pink-700 dark:text-pink-300',
        icon: Globe,
        glow: 'shadow-pink-500/20',
    },
    data: {
        bg: 'bg-cyan-500/15 dark:bg-cyan-500/20',
        solid: 'bg-cyan-200 dark:bg-cyan-900',
        border: 'border-cyan-500',
        text: 'text-cyan-700 dark:text-cyan-300',
        textSolid: 'text-cyan-800 dark:text-cyan-300',
        icon: Database,
        glow: 'shadow-cyan-500/20',
    },
    tech: {
        bg: 'bg-slate-500/15 dark:bg-slate-500/20',
        solid: 'bg-slate-200 dark:bg-slate-700',
        border: 'border-slate-500',
        text: 'text-slate-700 dark:text-slate-300',
        textSolid: 'text-slate-700 dark:text-slate-200',
        icon: Server,
        glow: 'shadow-slate-500/20',
    },
    start: {
        bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
        solid: 'bg-emerald-200 dark:bg-emerald-900',
        border: 'border-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        textSolid: 'text-emerald-700 dark:text-emerald-300',
        icon: Play,
        glow: 'shadow-emerald-500/20',
    },
    end: {
        bg: 'bg-rose-500/15 dark:bg-rose-500/20',
        solid: 'bg-rose-200 dark:bg-rose-900',
        border: 'border-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
        textSolid: 'text-rose-700 dark:text-rose-300',
        icon: Square,
        glow: 'shadow-rose-500/20',
    },
    decision: {
        bg: 'bg-purple-500/15 dark:bg-purple-500/20',
        solid: 'bg-purple-200 dark:bg-purple-900',
        border: 'border-purple-500',
        text: 'text-purple-700 dark:text-purple-300',
        textSolid: 'text-purple-700 dark:text-purple-300',
        icon: GitBranch,
        glow: 'shadow-purple-500/20',
    },
    default: {
        bg: 'bg-blue-500/15 dark:bg-blue-500/20',
        solid: 'bg-blue-200 dark:bg-blue-900',
        border: 'border-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
        textSolid: 'text-blue-700 dark:text-blue-300',
        icon: Zap,
        glow: 'shadow-blue-500/20',
    },
};

type NodeStyleKey = keyof typeof NODE_STYLES;

/**
 * Determine node style based on label content
 */
function getNodeStyle(label: string = '', type?: string): NodeStyleKey {
    const l = label.toLowerCase();

    // Type-based matching first
    if (type === 'start' || type === 'startNode') return 'start';
    if (type === 'end' || type === 'endNode') return 'end';
    if (type === 'decision' || type === 'decisionNode') return 'decision';
    if (type === 'database' || type === 'databaseNode') return 'data';

    // Content-based matching - Decision keywords take priority
    if (l.includes('approve') || l.includes('decision') || l.includes('verify') || l.includes('check') || l.includes('validate') || l.includes('confirm') || l.includes('?')) return 'decision';
    if (l.includes('ai') || l.includes('director') || l.includes('generate') || l.includes('neural')) return 'ai';
    if (l.includes('intern') || l.includes('team') || l.includes('edit') || l.includes('review') || l.includes('publish') || l.includes('fine') || l.includes('human')) return 'team';
    if (l.includes('platform') || l.includes('tiktok') || l.includes('shop') || l.includes('youtube') || l.includes('instagram')) return 'platform';
    if (l.includes('data') || l.includes('analyst') || l.includes('feedback') || l.includes('collect') || l.includes('ctr') || l.includes('cvr')) return 'data';
    if (l.includes('tech') || l.includes('system') || l.includes('server') || l.includes('api')) return 'tech';
    if (l.includes('start') || l.includes('begin') || l.includes('init')) return 'start';
    if (l.includes('end') || l.includes('finish') || l.includes('complete')) return 'end';

    return 'default';
}

// Reusable Handle Component with improved styling
interface HandleProps {
    type: 'source' | 'target';
    position: Position;
    id?: string;
    styleKey: NodeStyleKey;
}

const CustomHandle = memo(({ type, position, id, styleKey }: HandleProps) => {
    const style = NODE_STYLES[styleKey];
    return (
        <Handle
            type={type}
            position={position}
            id={id}
            className={`!w-2.5 !h-2.5 !border-2 !border-current ${style.text} !bg-white dark:!bg-slate-900 !opacity-0 hover:!opacity-100 transition-all duration-200`}
        />
    );
});

interface NodeComponentProps {
    id: string;
    data: {
        label?: string;
        metadata?: {
            techStack?: string[];
            role?: string;
            description?: string;
        };
        [key: string]: unknown;
    };
    selected: boolean;
    type?: string;
    style?: React.CSSProperties;
}

// ============================================
// Standard Node - Rounded corners for "human" tasks
// ============================================
const StandardNode = memo(({ data, selected, type, style: propStyle }: NodeComponentProps) => {
    const label = data.label || 'Node';
    const styleKey = getNodeStyle(label, type);
    const themeStyle = NODE_STYLES[styleKey];
    const Icon = themeStyle.icon;

    return (
        <div
            style={propStyle}
            className={`
                group relative px-5 py-3.5 rounded-2xl border-2 transition-all duration-300 
                min-w-[160px] max-w-[240px]
                ${themeStyle.bg} ${themeStyle.border} 
                ${selected ? `ring-4 ring-current/20 shadow-xl ${themeStyle.glow}` : 'border-opacity-50 hover:border-opacity-100'}
            `}
        >
            {/* Icon Badge */}
            <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-xl ${themeStyle.solid} ${themeStyle.border} border-2 flex items-center justify-center shadow-sm z-10 block`}>
                <Icon className={`w-4 h-4 ${themeStyle.textSolid}`} />
            </div>

            {/* Label with high contrast */}
            <span className={`text-[13px] font-bold block text-center leading-relaxed ${themeStyle.text}`}>
                {label}
            </span>

            {/* Metadata preview on hover */}
            {data.metadata?.role && (
                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block text-center">
                        {data.metadata.role}
                    </span>
                </div>
            )}

            <CustomHandle type="target" position={Position.Top} styleKey={styleKey} />
            <CustomHandle type="source" position={Position.Bottom} styleKey={styleKey} />
        </div>
    );
});

// ============================================
// Terminal Node - Pill shape for Start/End
// ============================================
const TerminalNode = memo(({ data, selected, type, style: propStyle }: NodeComponentProps) => {
    const label = data.label || 'Start';
    const isEnd = type === 'end' || type === 'endNode' || label.toLowerCase().includes('end');
    const styleKey = isEnd ? 'end' : 'start';
    const themeStyle = NODE_STYLES[styleKey];
    const Icon = themeStyle.icon;

    return (
        <div
            style={propStyle}
            className={`
            group relative px-8 py-3 rounded-full border-2 transition-all duration-300 
            min-w-[120px]
            ${themeStyle.bg} ${themeStyle.border}
            ${selected ? `ring-4 ring-current/20 shadow-xl ${themeStyle.glow}` : 'border-opacity-50 hover:border-opacity-100'}
        `}>
            <div className="flex items-center justify-center gap-2">
                <Icon className={`w-3.5 h-3.5 ${themeStyle.text}`} />
                <span className={`text-[11px] font-black uppercase tracking-widest ${themeStyle.text}`}>
                    {label}
                </span>
            </div>

            <CustomHandle type="target" position={Position.Top} styleKey={styleKey} />
            <CustomHandle type="source" position={Position.Bottom} styleKey={styleKey} />
        </div>
    );
});


// ============================================
// Decision Node - Diamond shape for conditionals
// ============================================
const DecisionNodeComponent = memo(({ data, selected, style: propStyle }: NodeComponentProps) => {
    const label = data.label || 'Decision';
    const style = NODE_STYLES.decision;

    return (
        <div style={propStyle} className="relative w-[130px] h-[100px] flex items-center justify-center group">
            {/* Diamond background */}
            <div className={`
                absolute inset-2 border-2 rotate-45 rounded-xl transition-all duration-300
                ${style.bg} ${style.border}
                ${selected ? `shadow-xl ${style.glow}` : 'border-opacity-50'}
            `} />

            {/* Label (not rotated) */}
            <div className="relative z-10 text-center px-2">
                <GitBranch className={`w-4 h-4 mx-auto mb-1 ${style.text}`} />
                <span className={`text-[11px] font-bold leading-tight ${style.text}`}>
                    {label}
                </span>
            </div>

            <CustomHandle type="target" position={Position.Top} styleKey="decision" />
            <CustomHandle type="source" position={Position.Bottom} styleKey="decision" />
            <CustomHandle type="source" position={Position.Right} id="yes" styleKey="start" />
            <CustomHandle type="source" position={Position.Left} id="no" styleKey="end" />
        </div>
    );
});

// ============================================
// Database Node - Cylinder shape for data stores
// ============================================
const DatabaseNodeComponent = memo(({ data, selected, style: propStyle }: NodeComponentProps) => {
    const label = data.label || 'Database';
    const style = NODE_STYLES.data;

    return (
        <div
            style={propStyle}
            className={`
            group relative px-6 py-5 rounded-xl border-2 transition-all duration-300 
            min-w-[150px]
            ${style.bg} ${style.border}
            ${selected ? `ring-4 ring-current/20 shadow-xl ${style.glow}` : 'border-opacity-50 hover:border-opacity-100'}
        `}>
            {/* Cylinder top cap */}
            <div className={`absolute top-0 left-4 right-4 h-2 ${style.border} border-2 rounded-t-full bg-current opacity-20`} />

            <div className="flex flex-col items-center pt-2">
                <Database className={`w-5 h-5 mb-2 ${style.text}`} />
                <span className={`text-[12px] font-bold text-center ${style.text}`}>
                    {label}
                </span>
            </div>

            {/* Cylinder bottom cap */}
            <div className={`absolute bottom-0 left-4 right-4 h-2 ${style.border} border-2 rounded-b-full bg-current opacity-20`} />

            <CustomHandle type="target" position={Position.Top} styleKey="data" />
            <CustomHandle type="source" position={Position.Bottom} styleKey="data" />
        </div>
    );
});

// ============================================
// Group/Swimlane Node - Resizable container with glow
// ============================================
export const GroupNode = memo(({ data, selected }: { data: { label?: string; color?: string }; selected?: boolean }) => {
    const label = data.label || 'Group';
    const borderColor = data.color || '#f59e0b';

    return (
        <>
            {/* Resize handles - visible when selected */}
            <NodeResizer
                color={borderColor}
                isVisible={selected}
                minWidth={200}
                minHeight={150}
                handleStyle={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: borderColor,
                    border: '2px solid white',
                }}
                lineStyle={{
                    borderWidth: 2,
                    borderColor: borderColor,
                }}
            />

            <div
                className="relative rounded-2xl w-full h-full transition-all duration-300"
                style={{
                    background: `linear-gradient(180deg, ${borderColor}25 0%, ${borderColor}10 100%)`,
                    border: `2px solid ${borderColor}${selected ? '' : '80'}`,
                    boxShadow: selected
                        ? `0 0 40px ${borderColor}40, 0 4px 20px rgba(0,0,0,0.4)`
                        : `0 0 30px ${borderColor}25, 0 4px 20px rgba(0,0,0,0.3)`,
                }}
            >
                {/* Top gradient bar */}
                <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ background: `linear-gradient(90deg, ${borderColor}, ${borderColor}80, ${borderColor})` }}
                />

                {/* Corner decorations */}
                <div
                    className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 rounded-tl-lg opacity-60"
                    style={{ borderColor: borderColor }}
                />
                <div
                    className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 rounded-tr-lg opacity-60"
                    style={{ borderColor: borderColor }}
                />
                <div
                    className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 rounded-bl-lg opacity-40"
                    style={{ borderColor: borderColor }}
                />
                <div
                    className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 rounded-br-lg opacity-40"
                    style={{ borderColor: borderColor }}
                />

                {/* Label badge - top center */}
                <div
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] shadow-lg whitespace-nowrap"
                    style={{
                        background: `linear-gradient(135deg, ${borderColor}, ${borderColor}cc)`,
                        color: '#0f172a',
                        boxShadow: `0 4px 15px ${borderColor}50`,
                        border: `1px solid ${borderColor}`,
                    }}
                >
                    {label}
                </div>
            </div>
        </>
    );
});

// ============================================
// System/Server Node - Sharp edges for rigid systems
// ============================================
const SystemNode = memo(({ data, selected, type }: NodeComponentProps) => {
    const label = data.label || 'System';
    const styleKey = getNodeStyle(label, type);
    const style = NODE_STYLES[styleKey];
    const Icon = style.icon;

    return (
        <div className={`
            group relative px-5 py-4 rounded-lg border-2 transition-all duration-300 
            min-w-[160px] max-w-[240px]
            ${style.bg} ${style.border}
            ${selected ? `ring-4 ring-current/20 shadow-xl ${style.glow}` : 'border-opacity-50 hover:border-opacity-100'}
        `}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${style.text}`} />
                </div>
                <span className={`text-[12px] font-bold ${style.text}`}>
                    {label}
                </span>
            </div>

            <CustomHandle type="target" position={Position.Top} styleKey={styleKey} />
            <CustomHandle type="source" position={Position.Bottom} styleKey={styleKey} />
        </div>
    );
});

// ============================================
// Exports Mapping
// ============================================
export const StartNode = memo((props: any) => <TerminalNode {...props} />);
export const EndNode = memo((props: any) => <TerminalNode {...props} />);
export const DecisionNode = memo((props: any) => <DecisionNodeComponent {...props} />);
export const DatabaseNode = memo((props: any) => <DatabaseNodeComponent {...props} />);

export const nodeTypes = {
    start: StartNode,
    startNode: StartNode,
    end: EndNode,
    endNode: EndNode,
    decision: DecisionNode,
    decisionNode: DecisionNode,
    database: DatabaseNode,
    databaseNode: DatabaseNode,
    process: StandardNode,
    processNode: StandardNode,
    client: StandardNode,
    server: SystemNode,
    system: SystemNode,
    default: StandardNode,
    group: GroupNode,
};
