import dagre from 'dagre';
import { type Node, type Edge } from '../store';

const nodeWidth = 180;
const nodeHeight = 60;
const groupPadding = 40;
const groupTitleHeight = 50;
const groupGap = 60; // Gap between swimlane groups

export interface LayoutOptions {
    direction: 'TB' | 'LR' | 'BT' | 'RL';
    nodeSpacing: number;
    rankSpacing: number;
}

const defaultOptions: LayoutOptions = {
    direction: 'TB',
    nodeSpacing: 40,
    rankSpacing: 60,
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
        currentY += height + groupGap;
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
        const w = node.type === 'decision' ? 140 : nodeWidth;
        const h = node.type === 'decision' ? 90 : nodeHeight;
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

        const w = node.type === 'decision' ? 140 : nodeWidth;
        const h = node.type === 'decision' ? 90 : nodeHeight;
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
        child.position.x = child.position.x - minX + groupPadding;
        child.position.y = child.position.y - minY + groupPadding + groupTitleHeight;
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const groupWidth = contentWidth + groupPadding * 2;
    const groupHeight = contentHeight + groupPadding * 2 + groupTitleHeight;

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
        const w = node.type === 'decision' ? 140 : nodeWidth;
        const h = node.type === 'decision' ? 90 : nodeHeight;
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

        const w = node.type === 'decision' ? 140 : nodeWidth;
        const h = node.type === 'decision' ? 90 : nodeHeight;

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
        const w = node.type === 'decision' ? 140 : nodeWidth;
        const h = node.type === 'decision' ? 90 : nodeHeight;
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

        const w = node.type === 'decision' ? 140 : nodeWidth;
        const h = node.type === 'decision' ? 90 : nodeHeight;

        return {
            ...node,
            position: { x: pos.x - w / 2, y: pos.y - h / 2 },
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',
        } as Node;
    });

    return { nodes: layoutedNodes, edges };
}
