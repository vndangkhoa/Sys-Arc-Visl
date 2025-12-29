export interface NodePosition {
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export interface EdgeConnection {
    source: string;
    target: string;
    type?: string;
}

export interface LayoutMetrics {
    nodeCount: number;
    edgeCount: number;
    edgeCrossings: number;
    nodeDensity: number;
    averageNodeSpacing: number;
    visualComplexity: number; // 0-100 scale
    aspectRatio: number;
}

export interface VisualIssue {
    type: 'edge-crossing' | 'overlap' | 'poor-spacing' | 'unclear-flow' | 'inefficient-layout' | 'style-consistency';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedNodes?: string[];
    affectedEdges?: string[];
    suggestedFix?: string;
}

export interface LayoutSuggestion {
    id: string;
    title: string;
    description: string;
    type: 'spacing' | 'grouping' | 'routing' | 'hierarchy' | 'style' | 'node-shape' | 'node-color-semantic';
    impact: 'low' | 'medium' | 'high';
    estimatedImprovement: number; // percentage
    beforeState: {
        metrics: LayoutMetrics;
        issues: VisualIssue[];
    };
    afterState: {
        metrics: LayoutMetrics;
        estimatedIssues: VisualIssue[];
    };
    implementation: {
        nodePositions: Record<string, NodePosition>;
        edgeRouting?: Record<string, any>;
        styleChanges?: Record<string, any>;
        description?: string;
    };
}

export interface VisualOrganizationRequest {
    nodes: Array<{
        id: string;
        label: string;
        type: string;
        position: NodePosition;
        metadata?: any;
    }>;
    edges: EdgeConnection[];
    currentLayout?: {
        direction: 'TB' | 'LR' | 'BT' | 'RL';
        spacing: number;
    };
    preferences?: {
        priority: 'readability' | 'compactness' | 'flow-clarity';
        groupSimilarNodes: boolean;
        minimizeCrossings: boolean;
        preserveUserLayout: boolean;
    };
}

export interface VisualOrganizationResponse {
    success: boolean;
    suggestions: LayoutSuggestion[];
    summary: {
        totalIssues: number;
        criticalIssues: number;
        potentialImprovement: number;
        recommendedAction: string;
    };
    error?: string;
}

export interface VisualAnalysisResult {
    metrics: LayoutMetrics;
    issues: VisualIssue[];
    strengths: string[];
    recommendations: string[];
}

export interface AISuggestionPrompt {
    systemPrompt: string;
    userPrompt: string;
    context: {
        currentMetrics: LayoutMetrics;
        identifiedIssues: VisualIssue[];
        nodeTypes: string[];
        edgeTypes: string[];
    };
}
