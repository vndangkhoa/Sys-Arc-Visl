import { BaseEdge, getSmoothStepPath, getBezierPath, Position, EdgeLabelRenderer } from '@xyflow/react';

interface AnimatedEdgeProps {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    style?: React.CSSProperties;
    markerEnd?: string;
    label?: any;
    data?: { curved?: boolean; offset?: number };
}

export function AnimatedEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
    data,
}: AnimatedEdgeProps) {
    const isCurved = data?.curved !== false;
    const offset = data?.offset || 0;

    // Apply offset for parallel edges
    const offsetX = sourcePosition === Position.Left || sourcePosition === Position.Right ? 0 : offset;
    const offsetY = sourcePosition === Position.Top || sourcePosition === Position.Bottom ? 0 : offset;

    // Use SmoothStep for cleaner orthogonal routing, Bezier for curved
    const [edgePath, labelX, labelY] = isCurved
        ? getBezierPath({
            sourceX: sourceX + offsetX,
            sourceY: sourceY + offsetY,
            sourcePosition,
            targetX: targetX + offsetX,
            targetY: targetY + offsetY,
            targetPosition,
            curvature: 0.25, // Gentle curve
        })
        : getSmoothStepPath({
            sourceX: sourceX + offsetX,
            sourceY: sourceY + offsetY,
            sourcePosition,
            targetX: targetX + offsetX,
            targetY: targetY + offsetY,
            targetPosition,
            borderRadius: 12, // Rounded corners
            offset: 20, // Offset from node for cleaner routing
        });

    const isDashed = style?.strokeDasharray;
    const strokeColor = isDashed ? '#94a3b8' : '#6366f1';

    return (
        <>
            {/* Shadow/glow effect for depth */}
            <path
                d={edgePath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={6}
                strokeOpacity={0.15}
                style={{ filter: 'blur(3px)' }}
            />

            {/* Main edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd || 'url(#arrow)'}
                style={{
                    strokeWidth: 2,
                    stroke: strokeColor,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    ...style,
                }}
            />

            {/* Animated dot traveling along the edge */}
            <circle r="3" fill={strokeColor}>
                <animateMotion dur={isDashed ? '4s' : '2s'} repeatCount="indefinite" path={edgePath} />
            </circle>

            {/* Edge label - centered on the line */}
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: 'all',
                            zIndex: 10,
                        }}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-600/50 rounded-md text-[10px] font-semibold text-slate-200 shadow-lg whitespace-nowrap"
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}

export function StraightEdge(props: AnimatedEdgeProps) {
    return <AnimatedEdge {...props} data={{ ...props.data, curved: false }} />;
}

export function CurvedEdge(props: AnimatedEdgeProps) {
    return <AnimatedEdge {...props} data={{ ...props.data, curved: true }} />;
}

export function EdgeDefs() {
    return (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
                {/* Arrow marker with better styling */}
                <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                </marker>
                {/* Dotted arrow marker */}
                <marker
                    id="arrow-dotted"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
            </defs>
        </svg>
    );
}

export const edgeTypes = {
    animated: AnimatedEdge,
    curved: CurvedEdge,
    straight: StraightEdge,
};
