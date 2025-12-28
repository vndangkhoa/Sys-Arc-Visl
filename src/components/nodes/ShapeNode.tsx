import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_STYLES } from './CustomNodes';
import { SHAPE_PATHS } from '../../lib/shapes';

// Map mermaid types to shape names if needed, or use raw type
// Default fallback
const DEFAULT_SHAPE = 'rect';

export const ShapeNode = memo(({ data, selected, type }: any) => {
    const rawShape = (data.shape || 'rect').toLowerCase();

    // Normalize shape names
    let shapeKey = rawShape;
    if (rawShape === 'database') shapeKey = 'cyl';
    if (rawShape === 'decision') shapeKey = 'diamond';
    if (rawShape === 'process') shapeKey = 'rect';
    if (rawShape === 'start') shapeKey = 'stadium';
    if (rawShape === 'end') shapeKey = 'stadium';

    const pathData = SHAPE_PATHS[shapeKey] || SHAPE_PATHS[DEFAULT_SHAPE];

    // Style logic similar to StandardNode
    // We can infer style from category or just use default
    const category = data.category || 'default';
    // Mapping categories to styles in CustomNodes is logic we might want to reuse or replicate
    // For now let's use a default blue or check if we can import logic.
    // Since we are in a separate file, we might not have access to helper 'getNodeStyle'.
    // Let's rely on data.category which mermaidParser sets.

    // Map parser categories to NODE_STYLES keys
    let styleKey = 'default';
    if (category === 'filter-db') styleKey = 'data';
    else if (category === 'filter-client') styleKey = 'team'; // or platform
    else if (category === 'filter-server') styleKey = 'tech';

    // Override based on shape
    if (shapeKey === 'cyl') styleKey = 'data';
    if (shapeKey === 'diamond') styleKey = 'decision';
    if (shapeKey === 'stadium' && (type === 'start' || type === 'end')) styleKey = type;

    // @ts-ignore
    const themeStyle = NODE_STYLES[styleKey] || NODE_STYLES.default;

    return (
        <div className={`relative group w-32 h-20 flex items-center justify-center transition-all ${selected ? 'drop-shadow-lg scale-105' : ''}`}>
            <svg viewBox="0 0 100 70" className={`w-full h-full overflow-visible drop-shadow-sm`}>
                <path
                    d={pathData}
                    className={`${themeStyle.solid} ${themeStyle.border} fill-current stroke-2 stroke-current opacity-90`}
                    style={{ fill: 'var(--bg-color)', stroke: 'var(--border-color)' }}
                />
            </svg>

            {/* Label Overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-2 text-center pointer-events-none">
                <span className={`text-[10px] font-bold leading-tight ${themeStyle.text}`}>
                    {data.label}
                </span>
            </div>

            {/* Handles - Positions might need to be dynamic based on shape, but default Top/Bottom/Left/Right usually works */}
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-transparent" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-transparent" />
            <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-transparent" />
            <Handle type="source" position={Position.Left} className="!w-2 !h-2 !bg-transparent" />
        </div>
    );
});
