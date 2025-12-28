import dagre from 'dagre';
import { type Node, type Edge } from '../store';

// Enhanced constants for better spacing
const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const GROUP_PADDING = 60;  // Increased padding
const GROUP_TITLE_HEIGHT = 50;
const GROUP_GAP = 120;  // Increased gap between groups
const MIN_NODE_SPACING = 80;  // Minimum space between nodes

export interface LayoutOptions {
    direction: 'TB' | 'LR' | 'BT' | 'RL';
    nodeSpacing: number;
    rankSpacing: number;
    smartOverlapResolution?: boolean;  // Enable collision detection
    optimizeForReadability?: boolean;  // Prioritize clear flow
}

const defaultOptions: LayoutOptions = {
    direction: 'TB',
    nodeSpacing: 100,  // Increased from 60 to prevent overlap
    rankSpacing: 150,  // Increased from 80 for edge labels
    smartOverlapResolution: true,
    optimizeForReadability: true,
};

export function getLayoutedElements(
    nodes: Node[],
    edges: Edge[],
    options: Partial<LayoutOptions> = {}
): { nodes: Node[]; edges: Edge[] } {
    const opts = { ...defaultOptions, ...options };
    const isHorizontal = opts.direction === 'LR' || opts.direction === 'RL';

    // Separate group nodes from regular nodes
    const groupNodes = nodes.filter(n => n.type === 'group');
    const regularNodes = nodes.filter(n => n.type !== 'group');

    // If no groups, just layout all nodes flat
    if (groupNodes.length === 0) {
        return layoutFlatNodes(regularNodes, edges, opts, isHorizontal);
    }

    // Separate nodes by their parent group
    const nodesWithoutParent = regularNodes.filter(n => !n.parentId);
    const nodesByGroup = new Map<string, Node[]>();

    groupNodes.forEach(g => nodesByGroup.set(g.id, []));
    regularNodes.forEach(n => {
        if (n.parentId && nodesByGroup.has(n.parentId)) {
            nodesByGroup.get(n.parentId)!.push(n);
        }
    });

    // Layout each group internally and calculate their sizes
    const groupLayouts = new Map<string, {
        width: number;
        height: number;
        nodes: Node[];
        group: Node;
    }>();

    groupNodes.forEach(group => {
        const childNodes = nodesByGroup.get(group.id) || [];
        const layout = layoutGroupInternal(group, childNodes, edges, opts, isHorizontal);
        groupLayouts.set(group.id, layout);
    });

    // Stack groups vertically (for TB direction)
    const finalNodes: Node[] = [];
    let currentY = 60; // Starting Y position
    const groupX = 60; // Left margin for groups

    // Sort groups by their original order (first defined = first in list)
    const sortedGroups = Array.from(groupLayouts.values());

    sortedGroups.forEach(({ group, width, height, nodes: childNodes }) => {
        // Position the group
        finalNodes.push({
            ...group,
            position: { x: groupX, y: currentY },
            style: {
                ...group.style,
                width,
                height,
            },
        } as Node);

        // Add positioned child nodes
        childNodes.forEach(child => finalNodes.push(child));

        // Move Y down for next group
        currentY += height + GROUP_GAP;
    });

    // Layout orphan nodes (nodes without parent) to the right of groups
    if (nodesWithoutParent.length > 0) {
        const maxGroupWidth = Math.max(...sortedGroups.map(g => g.width), 300);
        const orphanStartX = groupX + maxGroupWidth + 100;

        const orphanLayout = layoutOrphanNodes(nodesWithoutParent, edges, opts, isHorizontal, orphanStartX);
        orphanLayout.forEach(node => finalNodes.push(node));
    }

    return { nodes: finalNodes, edges };
}

// Layout nodes within a single group
function layoutGroupInternal(
    group: Node,
    childNodes: Node[],
    edges: Edge[],
    opts: LayoutOptions,
    isHorizontal: boolean
): { width: number; height: number; nodes: Node[]; group: Node } {
    if (childNodes.length === 0) {
        return {
            width: 300,
            height: 200,
            nodes: [],
            group
        };
    }

    // Create dagre sub-graph for this group
    const subGraph = new dagre.graphlib.Graph();
    subGraph.setDefaultEdgeLabel(() => ({}));
    subGraph.setGraph({
        rankdir: opts.direction,
        nodesep: opts.nodeSpacing,
        ranksep: opts.rankSpacing,
        marginx: 30,
        marginy: 30,
    });

    // Add nodes
    childNodes.forEach(node => {
        const w = node.type === 'decision' ? 140 : NODE_WIDTH;
        const h = node.type === 'decision' ? 90 : NODE_HEIGHT;
        subGraph.setNode(node.id, { width: w, height: h });
    });

    // Add edges within this group
    edges.forEach(edge => {
        const sourceInGroup = childNodes.some(n => n.id === edge.source);
        const targetInGroup = childNodes.some(n => n.id === edge.target);
        if (sourceInGroup && targetInGroup) {
            subGraph.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(subGraph);

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const positionedChildren: Node[] = [];

    childNodes.forEach(node => {
        const pos = subGraph.node(node.id);
        if (!pos) return;

        const w = node.type === 'decision' ? 140 : NODE_WIDTH;
        const h = node.type === 'decision' ? 90 : NODE_HEIGHT;
        const x = pos.x - w / 2;
        const y = pos.y - h / 2;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);

        positionedChildren.push({
            ...node,
            position: { x, y },
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
            extent: 'parent',
        } as Node);
    });

    // Normalize positions to start at padding
    positionedChildren.forEach(child => {
        child.position.x = child.position.x - minX + GROUP_PADDING;
        child.position.y = child.position.y - minY + GROUP_PADDING + GROUP_TITLE_HEIGHT;
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const groupWidth = contentWidth + GROUP_PADDING * 2;
    const groupHeight = contentHeight + GROUP_PADDING * 2 + GROUP_TITLE_HEIGHT;

    return {
        width: Math.max(groupWidth, 300),
        height: Math.max(groupHeight, 200),
        nodes: positionedChildren,
        group
    };
}

// Layout orphan nodes that don't belong to any group
function layoutOrphanNodes(
    nodes: Node[],
    edges: Edge[],
    opts: LayoutOptions,
    isHorizontal: boolean,
    startX: number
): Node[] {
    const orphanGraph = new dagre.graphlib.Graph();
    orphanGraph.setDefaultEdgeLabel(() => ({}));
    orphanGraph.setGraph({
        rankdir: opts.direction,
        nodesep: opts.nodeSpacing,
        ranksep: opts.rankSpacing,
        marginx: 0,
        marginy: 60,
    });

    nodes.forEach(node => {
        const w = node.type === 'decision' ? 140 : NODE_WIDTH;
        const h = node.type === 'decision' ? 90 : NODE_HEIGHT;
        orphanGraph.setNode(node.id, { width: w, height: h });
    });

    // Add edges between orphan nodes
    edges.forEach(edge => {
        const sourceOrphan = nodes.some(n => n.id === edge.source);
        const targetOrphan = nodes.some(n => n.id === edge.target);
        if (sourceOrphan && targetOrphan) {
            orphanGraph.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(orphanGraph);

    return nodes.map(node => {
        const pos = orphanGraph.node(node.id);
        if (!pos) return node;

        const w = node.type === 'decision' ? 140 : NODE_WIDTH;
        const h = node.type === 'decision' ? 90 : NODE_HEIGHT;

        return {
            ...node,
            position: { x: startX + pos.x - w / 2, y: pos.y - h / 2 },
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
        } as Node;
    });
}

// Flat layout when there are no groups
function layoutFlatNodes(
    nodes: Node[],
    edges: Edge[],
    opts: LayoutOptions,
    isHorizontal: boolean
): { nodes: Node[]; edges: Edge[] } {
    const flatGraph = new dagre.graphlib.Graph();
    flatGraph.setDefaultEdgeLabel(() => ({}));
    flatGraph.setGraph({
        rankdir: opts.direction,
        nodesep: opts.nodeSpacing,
        ranksep: opts.rankSpacing,
        marginx: 60,
        marginy: 60,
    });

    nodes.forEach(node => {
        const w = node.type === 'decision' ? 140 : NODE_WIDTH;
        const h = node.type === 'decision' ? 90 : NODE_HEIGHT;
        flatGraph.setNode(node.id, { width: w, height: h });
    });

    edges.forEach(edge => {
        if (nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target)) {
            flatGraph.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(flatGraph);

    const layoutedNodes = nodes.map(node => {
        const pos = flatGraph.node(node.id);
        if (!pos) return node;

        const w = node.type === 'decision' ? 140 : NODE_WIDTH;
        const h = node.type === 'decision' ? 90 : NODE_HEIGHT;

        return {
            ...node,
            position: { x: pos.x - w / 2, y: pos.y - h / 2 },
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
        } as Node;
    });

    // Apply smart overlap resolution if enabled
    const resolvedNodes = opts.smartOverlapResolution
        ? resolveOverlaps(layoutedNodes)
        : layoutedNodes;

    return { nodes: resolvedNodes, edges };
}

/**
 * Smart collision resolution - iteratively pushes overlapping nodes apart
 * Uses a force-directed approach with multiple passes for stability
 */
function resolveOverlaps(nodes: Node[], maxIterations: number = 50): Node[] {
    const mutableNodes = nodes.map(n => ({
        ...n,
        position: { ...n.position },
        width: getNodeWidth(n),
        height: getNodeHeight(n)
    }));

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let hasOverlap = false;

        for (let i = 0; i < mutableNodes.length; i++) {
            for (let j = i + 1; j < mutableNodes.length; j++) {
                const nodeA = mutableNodes[i];
                const nodeB = mutableNodes[j];

                // Skip group nodes
                if (nodeA.type === 'group' || nodeB.type === 'group') continue;

                // Check for overlap with padding
                const overlapX = getOverlap(
                    nodeA.position.x, nodeA.width,
                    nodeB.position.x, nodeB.width,
                    MIN_NODE_SPACING
                );

                const overlapY = getOverlap(
                    nodeA.position.y, nodeA.height,
                    nodeB.position.y, nodeB.height,
                    MIN_NODE_SPACING
                );

                // If nodes overlap in both axes, push them apart
                if (overlapX > 0 && overlapY > 0) {
                    hasOverlap = true;

                    // Determine which axis needs less push (more efficient separation)
                    if (overlapX < overlapY) {
                        // Push horizontally
                        const pushX = overlapX / 2 + 5;
                        if (nodeA.position.x < nodeB.position.x) {
                            nodeA.position.x -= pushX;
                            nodeB.position.x += pushX;
                        } else {
                            nodeA.position.x += pushX;
                            nodeB.position.x -= pushX;
                        }
                    } else {
                        // Push vertically
                        const pushY = overlapY / 2 + 5;
                        if (nodeA.position.y < nodeB.position.y) {
                            nodeA.position.y -= pushY;
                            nodeB.position.y += pushY;
                        } else {
                            nodeA.position.y += pushY;
                            nodeB.position.y -= pushY;
                        }
                    }
                }
            }
        }

        // If no overlaps detected, we're done
        if (!hasOverlap) break;
    }

    // Ensure no negative positions (shift everything if needed)
    let minX = Infinity, minY = Infinity;
    mutableNodes.forEach(n => {
        if (n.type !== 'group') {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
        }
    });

    const offsetX = minX < 60 ? 60 - minX : 0;
    const offsetY = minY < 60 ? 60 - minY : 0;

    return mutableNodes.map(n => ({
        ...n,
        position: {
            x: n.position.x + offsetX,
            y: n.position.y + offsetY
        }
    }));
}

/**
 * Calculate overlap between two rectangles with padding
 */
function getOverlap(pos1: number, size1: number, pos2: number, size2: number, padding: number): number {
    const end1 = pos1 + size1 + padding;
    const end2 = pos2 + size2 + padding;

    return Math.min(end1 - pos2, end2 - pos1);
}

/**
 * Get node width based on type
 */
function getNodeWidth(node: Node): number {
    if (node.type === 'decision') return 140;
    if (node.style?.width && typeof node.style.width === 'number') return node.style.width;
    return NODE_WIDTH;
}

/**
 * Get node height based on type
 */
function getNodeHeight(node: Node): number {
    if (node.type === 'decision') return 90;
    if (node.style?.height && typeof node.style.height === 'number') return node.style.height;
    return NODE_HEIGHT;
}

