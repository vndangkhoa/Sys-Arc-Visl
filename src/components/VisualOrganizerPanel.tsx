import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useVisualOrganizer } from '../hooks/useVisualOrganizer';
import { useDiagramStore } from '../store';
import type { LayoutSuggestion } from '../types/visualOrganization';

export const VisualOrganizerPanel: React.FC = () => {
    const { analyzeLayout, generateSuggestions, applySuggestion, getPresets } = useVisualOrganizer();
    const { nodes, edges, setNodes, setEdges } = useDiagramStore(); // Needed for snapshotting
    const [suggestions, setSuggestions] = useState<LayoutSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [snapshotHistory, setSnapshotHistory] = useState<Array<{ id: string, timestamp: number, nodes: any[], edges: any[], name: string }>>([]);
    const [previewState, setPreviewState] = useState<{
        originalNodes: any[];
        originalEdges: any[];
        suggestionId: string;
    } | null>(null);

    const takeSnapshot = (name: string) => {
        setSnapshotHistory(prev => [
            { id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), nodes: [...nodes], edges: [...edges], name },
            ...prev.slice(0, 4) // Keep last 5
        ]);
    };

    const restoreSnapshot = (snapshot: any) => {
        setNodes(snapshot.nodes);
        setEdges(snapshot.edges);
    };

    const handleAnalyze = () => {
        const result = analyzeLayout();
        setAnalysis(result);
    };

    const handleGenerateSuggestions = async () => {
        setIsLoading(true);
        try {
            const result = await generateSuggestions();
            setSuggestions(result);
        } catch (error) {
            console.error('Failed to generate suggestions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreviewSuggestion = (suggestion: LayoutSuggestion) => {
        // Save current state
        if (!previewState) {
            setPreviewState({
                originalNodes: [...nodes],
                originalEdges: [...edges],
                suggestionId: suggestion.id
            });
        }
        // Apply suggestion
        applySuggestion(suggestion);
    };

    const handleConfirmPreview = (suggestion: LayoutSuggestion) => {
        takeSnapshot(`Before ${suggestion.title}`);
        setPreviewState(null);
        setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
    };

    const handleCancelPreview = () => {
        if (previewState) {
            setNodes(previewState.originalNodes);
            setEdges(previewState.originalEdges);
            setPreviewState(null);
        }
    };

    return (
        <div className="visual-organizer-panel">
            <Card className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Visual Organizer</h3>
                <div className="flex gap-2">
                    <Button onClick={handleAnalyze} variant="secondary">
                        Analyze Layout
                    </Button>
                    <Button onClick={handleGenerateSuggestions} disabled={isLoading}>
                        {isLoading ? 'Generating...' : 'Get Suggestions'}
                    </Button>
                </div>
            </Card>

            {analysis && (
                <Card className="mb-4">
                    <h4 className="font-medium mb-2">Layout Analysis</h4>
                    <div className="text-sm">
                        <p>Nodes: {analysis.metrics.nodeCount}</p>
                        <p>Edges: {analysis.metrics.edgeCount}</p>
                        <p>Issues: {analysis.issues.length}</p>
                        <p>Strengths: {analysis.strengths.length}</p>
                    </div>
                </Card>
            )}

            <Card className="mb-4">
                <h4 className="font-medium mb-2">Quick Layout Presets</h4>
                <div className="grid grid-cols-2 gap-2">
                    {getPresets().map(preset => (
                        <Button
                            key={preset.id}
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePreviewSuggestion(preset)}
                            className="h-auto flex flex-col items-start p-3 text-left"
                        >
                            <span className="font-bold text-xs mb-1">{preset.title}</span>
                            <span className="text-[10px] text-gray-500 font-normal leading-tight">{preset.description}</span>
                        </Button>
                    ))}
                </div>
            </Card>

            {suggestions.length > 0 && (
                <Card>
                    <h4 className="font-medium mb-2">AI Suggestions</h4>
                    <div className="space-y-2">
                        {suggestions.map((suggestion) => {
                            const isPreviewing = previewState?.suggestionId === suggestion.id;
                            const isOtherPreviewing = previewState !== null && !isPreviewing;

                            if (isOtherPreviewing) return null; // Hide other suggestions while previewing

                            return (
                                <div key={suggestion.id} className={`border rounded p-2 ${isPreviewing ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                                    <h5 className="font-medium">{suggestion.title}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{suggestion.description}</p>

                                    <div className="flex gap-2 mt-2">
                                        {!isPreviewing ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handlePreviewSuggestion(suggestion)}
                                                >
                                                    Preview
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}
                                                >
                                                    Dismiss
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleConfirmPreview(suggestion)}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={handleCancelPreview}
                                                >
                                                    Revert
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {snapshotHistory.length > 0 && (
                <Card>
                    <h4 className="font-medium mb-2">History & Comparison</h4>
                    <div className="space-y-1">
                        {snapshotHistory.map(snap => (
                            <div key={snap.id} className="flex items-center justify-between text-xs p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded">
                                <span>{snap.name}</span>
                                <Button size="sm" variant="ghost" onClick={() => restoreSnapshot(snap)} className="h-6 px-2">
                                    Restore
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};
