import type { Node, Edge } from '../store';
import type {
    LayoutMetrics,
    VisualIssue,
    LayoutSuggestion,
    NodePosition
} from '../types/visualOrganization';
import { getLayoutedElements } from './layoutEngine';

export class VisualOrganizer {
    private nodes: Node[];
    private edges: Edge[];

    constructor(nodes: Node[], edges: Edge[]) {
        this.nodes = nodes;
        this.edges = edges;
    }

    /**
     * Analyze the current layout and identify issues
     */
    analyzeLayout(): { metrics: LayoutMetrics; issues: VisualIssue[]; strengths: string[] } {
        const metrics = this.calculateMetrics();
        const issues = [...this.identifyIssues(), ...this.identifyStyleIssues()];
        const strengths = this.identifyStrengths();

        return { metrics, issues, strengths };
    }

    /**
     * Calculate layout metrics
     */
    private calculateMetrics(): LayoutMetrics {
        const nodeCount = this.nodes.filter(n => n.type !== 'group').length;
        const edgeCount = this.edges.length;
        const edgeCrossings = this.detectEdgeCrossings();
        const nodeDensity = this.calculateNodeDensity();
        const averageNodeSpacing = this.calculateAverageSpacing();
        const visualComplexity = this.calculateVisualComplexity();
        const aspectRatio = this.calculateAspectRatio();

        return {
            nodeCount,
            edgeCount,
            edgeCrossings,
            nodeDensity,
            averageNodeSpacing,
            visualComplexity,
            aspectRatio
        };
    }

    /**
     * Detect edge crossings using geometric analysis
     */
    private detectEdgeCrossings(): number {
        let crossings = 0;
        const edges = this.edges;

        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                if (this.edgesCross(edges[i], edges[j])) {
                    crossings++;
                }
            }
        }

        return crossings;
    }

    /**
     * Check if two edges cross geometrically
     */
    private edgesCross(edge1: Edge, edge2: Edge): boolean {
        const source1 = this.nodes.find(n => n.id === edge1.source);
        const target1 = this.nodes.find(n => n.id === edge1.target);
        const source2 = this.nodes.find(n => n.id === edge2.source);
        const target2 = this.nodes.find(n => n.id === edge2.target);

        if (!source1 || !target1 || !source2 || !target2) return false;

        const p1 = { x: source1.position.x, y: source1.position.y };
        const p2 = { x: target1.position.x, y: target1.position.y };
        const p3 = { x: source2.position.x, y: source2.position.y };
        const p4 = { x: target2.position.x, y: target2.position.y };

        return this.lineSegmentsIntersect(p1, p2, p3, p4);
    }

    /**
     * Check if two line segments intersect
     */
    private lineSegmentsIntersect(p1: any, p2: any, p3: any, p4: any): boolean {
        const ccw = (A: any, B: any, C: any) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
        return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
    }

    /**
     * Calculate node density (nodes per area)
     */
    private calculateNodeDensity(): number {
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');
        if (visibleNodes.length === 0) return 0;

        const bounds = this.getNodeBounds();
        const area = bounds.width * bounds.height;

        return visibleNodes.length / (area / 10000); // Normalize to reasonable scale
    }

    /**
     * Calculate average spacing between nodes
     */
    private calculateAverageSpacing(): number {
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');
        if (visibleNodes.length < 2) return 0;

        let totalDistance = 0;
        let pairCount = 0;

        for (let i = 0; i < visibleNodes.length; i++) {
            for (let j = i + 1; j < visibleNodes.length; j++) {
                const node1 = visibleNodes[i];
                const node2 = visibleNodes[j];
                const distance = Math.sqrt(
                    Math.pow(node1.position.x - node2.position.x, 2) +
                    Math.pow(node1.position.y - node2.position.y, 2)
                );
                totalDistance += distance;
                pairCount++;
            }
        }

        return pairCount > 0 ? totalDistance / pairCount : 0;
    }

    /**
     * Calculate visual complexity score (0-100)
     */
    private calculateVisualComplexity(): number {
        let complexity = 0;

        // Edge crossings contribute heavily to complexity
        complexity += this.detectEdgeCrossings() * 10;

        // High node density increases complexity
        complexity += this.calculateNodeDensity() * 20;

        // Multiple edge types increase complexity
        const uniqueEdgeTypes = new Set(this.edges.map(e => e.type || 'default')).size;
        complexity += uniqueEdgeTypes * 5;

        // Large number of nodes increases complexity
        const nodeCount = this.nodes.filter(n => n.type !== 'group').length;
        complexity += Math.max(0, nodeCount - 10) * 2;

        return Math.min(100, complexity);
    }

    /**
     * Calculate aspect ratio of the diagram
     */
    private calculateAspectRatio(): number {
        const bounds = this.getNodeBounds();
        if (bounds.height === 0) return 1;
        return bounds.width / bounds.height;
    }

    /**
     * Get bounding box of all nodes
     */
    private getNodeBounds() {
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');

        if (visibleNodes.length === 0) {
            return { width: 1000, height: 800, minX: 0, minY: 0, maxX: 1000, maxY: 800 };
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        visibleNodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x);
            maxY = Math.max(maxY, node.position.y);
        });

        return {
            width: maxX - minX,
            height: maxY - minY,
            minX, minY, maxX, maxY
        };
    }

    /**
     * Identify visual issues in the current layout
     */
    private identifyIssues(): VisualIssue[] {
        const issues: VisualIssue[] = [];
        const metrics = this.calculateMetrics();

        // Edge crossing issues
        if (metrics.edgeCrossings > 5) {
            issues.push({
                type: 'edge-crossing',
                severity: metrics.edgeCrossings > 10 ? 'high' : 'medium',
                description: `High number of edge crossings (${metrics.edgeCrossings}) makes diagram difficult to follow`,
                suggestedFix: 'Apply routing optimization to minimize edge intersections'
            });
        }

        // Node overlap issues
        const overlappingNodes = this.detectOverlappingNodes();
        if (overlappingNodes.length > 0) {
            issues.push({
                type: 'overlap',
                severity: overlappingNodes.length > 3 ? 'high' : 'medium',
                description: `${overlappingNodes.length} nodes are overlapping or too close`,
                affectedNodes: overlappingNodes,
                suggestedFix: 'Increase spacing between nodes'
            });
        }

        // Poor spacing issues
        if (metrics.averageNodeSpacing < 80) {
            issues.push({
                type: 'poor-spacing',
                severity: metrics.averageNodeSpacing < 50 ? 'high' : 'medium',
                description: 'Nodes are too close together, reducing readability',
                suggestedFix: 'Increase overall node spacing'
            });
        }

        // Unclear flow issues
        if (metrics.visualComplexity > 70) {
            issues.push({
                type: 'unclear-flow',
                severity: metrics.visualComplexity > 85 ? 'high' : 'medium',
                description: 'High visual complexity makes the diagram hard to understand',
                suggestedFix: 'Simplify layout by grouping related nodes and reducing crossings'
            });
        }

        // Inefficient layout issues
        if (metrics.aspectRatio > 3 || metrics.aspectRatio < 0.3) {
            issues.push({
                type: 'inefficient-layout',
                severity: 'medium',
                description: 'Diagram has poor aspect ratio, consider reorienting layout',
                suggestedFix: 'Switch to horizontal layout or reorganize node positions'
            });
        }

        return issues;
    }

    /**
     * Detect overlapping or too-close nodes
     */
    private detectOverlappingNodes(): string[] {
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');
        const overlapping: string[] = [];
        const threshold = 100; // Minimum distance between nodes

        for (let i = 0; i < visibleNodes.length; i++) {
            for (let j = i + 1; j < visibleNodes.length; j++) {
                const node1 = visibleNodes[i];
                const node2 = visibleNodes[j];
                const distance = Math.sqrt(
                    Math.pow(node1.position.x - node2.position.x, 2) +
                    Math.pow(node1.position.y - node2.position.y, 2)
                );

                if (distance < threshold) {
                    overlapping.push(node1.id, node2.id);
                }
            }
        }

        return [...new Set(overlapping)];
    }

    /**
     * Identify layout strengths
     */
    private identifyStrengths(): string[] {
        const strengths: string[] = [];
        const metrics = this.calculateMetrics();

        if (metrics.edgeCrossings === 0) {
            strengths.push('Clean layout with no edge crossings');
        }

        if (metrics.averageNodeSpacing > 120) {
            strengths.push('Good spacing between nodes for readability');
        }

        if (metrics.visualComplexity < 30) {
            strengths.push('Low visual complexity makes diagram easy to understand');
        }

        if (metrics.aspectRatio >= 0.8 && metrics.aspectRatio <= 1.5) {
            strengths.push('Well-proportioned diagram layout');
        }

        const nodeCount = this.nodes.filter(n => n.type !== 'group').length;
        if (nodeCount <= 8) {
            strengths.push('Appropriate number of nodes for clear communication');
        }

        return strengths;
    }

    /**
     * Generate layout optimization suggestions
     */
    generateSuggestions(): LayoutSuggestion[] {
        const suggestions: LayoutSuggestion[] = [];
        const { metrics, issues } = this.analyzeLayout();

        // Suggest spacing improvements
        if (metrics.averageNodeSpacing < 100) {
            suggestions.push({
                id: 'spacing-improvement',
                title: 'Improve Node Spacing',
                description: 'Increase spacing between nodes to improve readability and reduce visual clutter',
                type: 'spacing',
                impact: 'medium',
                estimatedImprovement: 25,
                beforeState: { metrics, issues },
                afterState: {
                    metrics: { ...metrics, averageNodeSpacing: 150, visualComplexity: Math.max(0, metrics.visualComplexity - 15) },
                    estimatedIssues: issues.filter(i => i.type !== 'poor-spacing')
                },
                implementation: {
                    nodePositions: this.calculateOptimalSpacing()
                }
            });
        }

        // Suggest routing optimization
        if (metrics.edgeCrossings > 3) {
            suggestions.push({
                id: 'routing-optimization',
                title: 'Optimize Edge Routing',
                description: 'Reduce edge crossings by applying smart routing algorithms',
                type: 'routing',
                impact: 'high',
                estimatedImprovement: 40,
                beforeState: { metrics, issues },
                afterState: {
                    metrics: { ...metrics, edgeCrossings: Math.max(0, metrics.edgeCrossings - 5), visualComplexity: Math.max(0, metrics.visualComplexity - 20) },
                    estimatedIssues: issues.filter(i => i.type !== 'edge-crossing')
                },
                implementation: {
                    nodePositions: this.calculateRoutingOptimizedPositions(),
                    edgeRouting: { style: 'curved', offsetStrategy: 'intelligent' }
                }
            });
        }

        // Suggest grouping improvements
        const similarNodes = this.findSimilarNodes();
        if (similarNodes.length > 0) {
            suggestions.push({
                id: 'grouping-improvement',
                title: 'Group Related Nodes',
                description: 'Group similar nodes together to improve visual hierarchy and organization',
                type: 'grouping',
                impact: 'medium',
                estimatedImprovement: 30,
                beforeState: { metrics, issues },
                afterState: {
                    metrics: { ...metrics, visualComplexity: Math.max(0, metrics.visualComplexity - 10) },
                    estimatedIssues: issues.filter(i => i.type !== 'unclear-flow')
                },
                implementation: {
                    nodePositions: this.calculateGroupedPositions(similarNodes),
                    styleChanges: { groupNodes: true }
                }
            });
        }

        // Suggest Visual Hierarchy improvements
        const centralNode = this.findCentralNode();
        if (centralNode && (!centralNode.style?.width || (typeof centralNode.style.width === 'number' && centralNode.style.width < 100))) {
            suggestions.push({
                id: 'hierarchy-emphasis',
                title: 'Emphasize Central Node',
                description: `Node "${centralNode.data.label}" appears central to the graph. Consider increasing its size or prominence.`,
                type: 'hierarchy',
                impact: 'medium',
                estimatedImprovement: 20,
                beforeState: { metrics, issues },
                afterState: { metrics, estimatedIssues: [] },
                implementation: {
                    nodePositions: {},
                    styleChanges: {
                        [centralNode.id]: {
                            width: 250,
                            height: 120,
                            style: { ...centralNode.style, width: 250, height: 120, fontSize: '1.2em', fontWeight: 'bold' }
                        }
                    },
                    description: `Make node ${centralNode.id} larger and more distinct.`
                }
            });
        }

        // Suggest Style Consistency
        const styleIssues = this.identifyStyleIssues();
        if (styleIssues.length > 0) {
            suggestions.push({
                id: 'style-consistency',
                title: 'Fix Style Inconsistencies',
                description: 'Detected nodes of the same type with different colors. Standardize them for consistency.',
                type: 'style',
                impact: 'low',
                estimatedImprovement: 15,
                beforeState: { metrics, issues: styleIssues },
                afterState: { metrics, estimatedIssues: [] },
                implementation: {
                    nodePositions: {},
                    styleChanges: this.generateStyleConsistencyChanges(styleIssues),
                    description: 'Apply consistent colors to node types.'
                }
            });
        }

        // Suggest Node View Optimization
        const nodeOptimization = this.generateNodeViewSuggestions();
        if (nodeOptimization) {
            suggestions.push(nodeOptimization);
        }

        return suggestions;
    }

    /**
     * Identify style consistency issues
     */
    private identifyStyleIssues(): VisualIssue[] {
        const issues: VisualIssue[] = [];
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');
        const nodesByType = new Map<string, { colors: Set<string>, ids: string[] }>();

        visibleNodes.forEach(node => {
            const type = node.type || 'default';
            const color = node.data?.color || node.style?.backgroundColor || 'default';

            if (!nodesByType.has(type)) {
                nodesByType.set(type, { colors: new Set(), ids: [] });
            }
            const entry = nodesByType.get(type)!;
            entry.colors.add(color as string);
            entry.ids.push(node.id);
        });

        nodesByType.forEach((entry, type) => {
            if (entry.colors.size > 1) {
                issues.push({
                    type: 'style-consistency',
                    severity: 'low',
                    description: `Nodes of type '${type}' have inconsistent colors`,
                    affectedNodes: entry.ids,
                    suggestedFix: 'Standardize color for this node type'
                });
            }
        });

        return issues;
    }

    /**
     * Generate style changes to fix consistency issues
     */
    private generateStyleConsistencyChanges(issues: VisualIssue[]): Record<string, any> {
        const changes: Record<string, any> = {};
        const typeColors: Record<string, string> = {
            database: '#0ea5e9', // Sky 500
            service: '#8b5cf6', // Violet 500
            client: '#f59e0b', // Amber 500
            default: '#64748b' // Slate 500
        };

        issues.filter(i => i.type === 'style-consistency').forEach(issue => {
            if (!issue.affectedNodes) return;

            // Extract type from description or logic
            let targetColor = typeColors.default;
            if (issue.description.includes("'database'")) targetColor = typeColors.database;
            if (issue.description.includes("'client'")) targetColor = typeColors.client;
            if (issue.description.includes("'service'")) targetColor = typeColors.service;

            issue.affectedNodes.forEach(nodeId => {
                changes[nodeId] = {
                    color: targetColor,
                    style: { backgroundColor: targetColor }
                };
            });
        });

        return changes;
    }

    /**
     * Find the most central node (highest degree centrality)
     */
    private findCentralNode(): Node | null {
        if (this.nodes.length === 0) return null;

        const degrees = new Map<string, number>();
        this.edges.forEach(edge => {
            degrees.set(edge.source, (degrees.get(edge.source) || 0) + 1);
            degrees.set(edge.target, (degrees.get(edge.target) || 0) + 1);
        });

        let maxDegree = -1;
        let centralNodeId: string | null = null;

        degrees.forEach((degree, id) => {
            if (degree > maxDegree) {
                maxDegree = degree;
                centralNodeId = id;
            }
        });

        if (centralNodeId && maxDegree > 2) { // Threshold for "central"
            return this.nodes.find(n => n.id === centralNodeId) || null;
        }

        return null;
    }

    /**
     * Calculate optimal spacing for nodes
     */
    private calculateOptimalSpacing(): Record<string, NodePosition> {
        const positions: Record<string, NodePosition> = {};
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');
        const gridSize = 200; // Optimal spacing

        visibleNodes.forEach((node, index) => {
            const row = Math.floor(index / Math.ceil(Math.sqrt(visibleNodes.length)));
            const col = index % Math.ceil(Math.sqrt(visibleNodes.length));

            positions[node.id] = {
                x: col * gridSize + 100,
                y: row * gridSize + 100
            };
        });

        return positions;
    }

    /**
     * Calculate routing-optimized positions
     */
    private calculateRoutingOptimizedPositions(): Record<string, NodePosition> {
        // Use the existing layout engine with optimized settings
        const { nodes: layoutedNodes } = getLayoutedElements(
            this.nodes,
            this.edges,
            { direction: 'TB', nodeSpacing: 80, rankSpacing: 100 }
        );

        const positions: Record<string, NodePosition> = {};
        layoutedNodes.forEach(node => {
            positions[node.id] = { x: node.position.x, y: node.position.y };
        });

        return positions;
    }

    /**
     * Find similar nodes that could be grouped
     */
    private findSimilarNodes(): Array<{ nodeIds: string[]; similarity: string }> {
        const similar: Array<{ nodeIds: string[]; similarity: string }> = [];
        const visibleNodes = this.nodes.filter(n => n.type !== 'group');

        // Group by node type
        const nodesByType = new Map<string, Node[]>();
        visibleNodes.forEach(node => {
            const type = node.type || 'default';
            if (!nodesByType.has(type)) {
                nodesByType.set(type, []);
            }
            nodesByType.get(type)!.push(node);
        });

        nodesByType.forEach((nodes, type) => {
            if (nodes.length > 1) {
                similar.push({
                    nodeIds: nodes.map(n => n.id),
                    similarity: `Same type: ${type}`
                });
            }
        });

        return similar;
    }

    /**
     * Calculate grouped positions for similar nodes
     */
    private calculateGroupedPositions(similarNodes: Array<{ nodeIds: string[]; similarity: string }>): Record<string, NodePosition> {
        const positions: Record<string, NodePosition> = {};
        const groupSize = 150;
        let groupIndex = 0;

        similarNodes.forEach(group => {
            group.nodeIds.forEach((nodeId, index) => {
                positions[nodeId] = {
                    x: groupIndex * 300 + (index % 2) * groupSize,
                    y: groupIndex * 200 + Math.floor(index / 2) * groupSize
                };
            });
            groupIndex++;
        });

        return positions;
    }

    /**
     * Apply a layout suggestion
     */
    applySuggestion(suggestion: LayoutSuggestion): { nodes: Node[]; edges: Edge[] } {
        const newNodes = this.nodes.map(node => {
            let updatedNode = { ...node };

            // Apply position changes
            if (suggestion.implementation.nodePositions[node.id]) {
                const newPos = suggestion.implementation.nodePositions[node.id];
                updatedNode.position = { x: newPos.x, y: newPos.y };
            }

            // Apply style changes
            if (suggestion.implementation.styleChanges && suggestion.implementation.styleChanges[node.id]) {
                const styleUpdates = suggestion.implementation.styleChanges[node.id];
                updatedNode.style = { ...updatedNode.style, ...styleUpdates };
                updatedNode.data = { ...updatedNode.data, ...styleUpdates }; // Also update data for some properties if needed
            }

            return updatedNode;
        });

        // Apply edge changes if any
        let newEdges = this.edges;
        if (suggestion.implementation.edgeRouting) {
            // Logic to update edge styles if needed
            newEdges = this.edges.map(edge => ({
                ...edge,
                type: suggestion.implementation.edgeRouting?.style === 'curved' ? 'curved' : 'straight',
                data: { ...edge.data, offset: suggestion.implementation.edgeRouting?.offsetStrategy === 'intelligent' ? 20 : 0 }
            }));
        }

        return { nodes: newNodes, edges: newEdges };
    }

    /**
     * Generate suggestions for optimizing node views based on semantics
     */
    private generateNodeViewSuggestions(): LayoutSuggestion | null {
        const styleChanges: Record<string, any> = {};
        const { metrics, issues } = this.analyzeLayout();
        let improvementCount = 0;

        this.nodes.forEach(node => {
            if (node.type === 'group') return;

            const semantics = this.analyzeNodeSemantics(node);
            if (!semantics) return;

            // Define semantic styles
            const styles = {
                decision: { shape: 'diamond', backgroundColor: '#fcd34d', borderColor: '#d97706', borderRadius: '4px' }, // Amber
                action: { shape: 'rect', backgroundColor: '#a78bfa', borderColor: '#7c3aed', borderRadius: '8px' },     // Violet
                data: { shape: 'cylinder', backgroundColor: '#38bdf8', borderColor: '#0284c7', borderRadius: '12px' },    // Sky
                startEnd: { shape: 'pill', backgroundColor: '#4ade80', borderColor: '#16a34a', borderRadius: '999px' },   // Green
                concept: { shape: 'rect', backgroundColor: '#e2e8f0', borderColor: '#64748b', borderRadius: '6px' }     // Slate
            };

            // Check if current style matches semantics (simplified check)
            // In a real app we would compare actual style properties
            // Here we assume if it's "default" or distinct enough we suggest it

            if (semantics === 'decision' && !node.data.label?.includes('?')) return; // Extra check for decisions

            const suggestedStyle = styles[semantics];
            styleChanges[node.id] = {
                style: {
                    backgroundColor: suggestedStyle.backgroundColor,
                    border: `1px solid ${suggestedStyle.borderColor}`,
                    borderRadius: suggestedStyle.borderRadius
                }
            };
            improvementCount++;
        });

        if (improvementCount > 0) {
            return {
                id: 'node-optimization',
                title: 'Optimize Node Views',
                description: `Found ${improvementCount} nodes where visual style can better match their semantic meaning (Decisions, Actions, Data).`,
                type: 'node-color-semantic',
                impact: 'medium',
                estimatedImprovement: 25,
                beforeState: { metrics, issues },
                afterState: { metrics, estimatedIssues: [] },
                implementation: {
                    nodePositions: {},
                    styleChanges,
                    description: 'Apply semantic styling to nodes based on their content.'
                }
            };
        }

        return null;
    }

    /**
     * Analyze node label to guess its semantic role
     */
    private analyzeNodeSemantics(node: Node): 'decision' | 'action' | 'data' | 'startEnd' | 'concept' | null {
        const label = node.data.label?.toLowerCase() || '';
        if (!label) return null;

        // Decision patterns
        if (label.includes('?') || label.startsWith('is ') || label.startsWith('check ') || label.includes('approve') || label.includes('review')) {
            return 'decision';
        }

        // Data patterns
        if (label.includes('data') || label.includes('database') || label.includes('store') || label.includes('json') || label.includes('record')) {
            return 'data';
        }

        // Start/End patterns
        if (label === 'start' || label === 'end' || label === 'begin' || label === 'stop' || label === 'finish') {
            return 'startEnd';
        }

        // Action patterns (verbs suitable for processes)
        const actionVerbs = ['create', 'update', 'delete', 'process', 'calculate', 'send', 'receive', 'generate', 'publish', 'edit'];
        if (actionVerbs.some(v => label.includes(v))) {
            return 'action';
        }

        return 'concept'; // Default fallback for content-heavy nodes
    }
    getPresets(): LayoutSuggestion[] {
        const { metrics, issues } = this.analyzeLayout();

        return [
            {
                id: 'preset-compact',
                title: 'Compact Grid',
                description: 'Arranges nodes in a tight grid to save space',
                type: 'grouping',
                impact: 'high',
                estimatedImprovement: 50,
                beforeState: { metrics, issues },
                afterState: { metrics, estimatedIssues: [] },
                implementation: {
                    nodePositions: this.calculateOptimalSpacing()
                }
            },
            {
                id: 'preset-flow',
                title: 'Clear Flow',
                description: 'Optimizes for top-to-bottom flow with minimal crossings',
                type: 'routing',
                impact: 'high',
                estimatedImprovement: 40,
                beforeState: { metrics, issues },
                afterState: { metrics, estimatedIssues: [] },
                implementation: {
                    nodePositions: this.calculateRoutingOptimizedPositions(),
                    edgeRouting: { style: 'curved', offsetStrategy: 'intelligent' }
                }
            }
        ];
    }
}

/**
 * Utility function to create visual organizer instance
 */
export function createVisualOrganizer(nodes: Node[], edges: Edge[]): VisualOrganizer {
    return new VisualOrganizer(nodes, edges);
}
