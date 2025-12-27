import { useCallback, useMemo } from 'react';
import { useDiagramStore } from '../store';
import { useSettingsStore } from '../store/settingsStore';
import { VisualOrganizer, createVisualOrganizer } from '../lib/visualOrganizer';
import { analyzeVisualLayout } from '../lib/aiService';
import type { LayoutSuggestion, VisualIssue, LayoutMetrics } from '../types/visualOrganization';

export const useVisualOrganizer = () => {
    const { nodes, edges, setNodes, setEdges } = useDiagramStore();
    const { aiMode, onlineProvider, apiKey, ollamaUrl, modelName } = useSettingsStore();

    const visualOrganizer = useMemo(() => {
        return createVisualOrganizer(nodes, edges);
    }, [nodes, edges]);

    const analyzeLayout = useCallback(() => {
        return visualOrganizer.analyzeLayout();
    }, [visualOrganizer]);

    const generateSuggestions = useCallback(async () => {
        // 1. Get algorithmic suggestions
        const algorithmicSuggestions = visualOrganizer.generateSuggestions();

        // 2. Get AI suggestions if enabled
        let aiSuggestions: LayoutSuggestion[] = [];
        try {
            const analysisResult = visualOrganizer.analyzeLayout();
            const aiResult = await analyzeVisualLayout(
                nodes,
                edges,
                analysisResult.metrics,
                ollamaUrl,
                modelName,
                aiMode,
                onlineProvider,
                apiKey
            );

            if (aiResult.success && aiResult.analysis?.suggestions) {
                aiSuggestions = aiResult.analysis.suggestions.map((s: any) => ({
                    id: s.id || `ai-${Math.random().toString(36).substr(2, 9)}`,
                    title: s.title,
                    description: s.description,
                    type: s.type || 'style',
                    impact: s.impact || 'low',
                    estimatedImprovement: 0,
                    beforeState: { metrics: analysisResult.metrics, issues: [] }, // AI doesn't calculate this yet
                    afterState: { metrics: analysisResult.metrics, estimatedIssues: [] },
                    implementation: {
                        nodePositions: {}, // AI suggestions might not have positions yet
                        description: s.fix_strategy // Store strategy for possible future implementation
                    }
                }));
            }
        } catch (error) {
            console.warn('AI visual analysis failed:', error);
        }

        return [...algorithmicSuggestions, ...aiSuggestions];
    }, [visualOrganizer, nodes, edges, aiMode, onlineProvider, apiKey, ollamaUrl, modelName]);

    const applySuggestion = useCallback((suggestion: LayoutSuggestion) => {
        const { nodes: newNodes, edges: newEdges } = visualOrganizer.applySuggestion(suggestion);
        setNodes(newNodes);
        setEdges(newEdges);
    }, [visualOrganizer, setNodes, setEdges]);

    const getPresets = useCallback(() => {
        return visualOrganizer.getPresets();
    }, [visualOrganizer]);

    return {
        analyzeLayout,
        generateSuggestions,
        applySuggestion,
        getPresets,
        visualOrganizer
    };
};

export type LayoutAnalysis = {
    metrics: LayoutMetrics;
    issues: VisualIssue[];
    strengths: string[];
};

export default useVisualOrganizer;
