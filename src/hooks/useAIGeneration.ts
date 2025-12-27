/**
 * Custom hook for AI-powered diagram generation
 */

import { useCallback } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';
import { interpretText, analyzeImage, analyzeSVG } from '../lib/aiService';
import { parseMermaid } from '../lib/mermaidParser';
import { getLayoutedElements } from '../lib/layoutEngine';
import type { AIResponse, NodeMetadata } from '../types';

interface UseAIGenerationReturn {
    generateFromText: (text: string) => Promise<void>;
    generateFromImage: (imageBase64: string) => Promise<void>;
    generateFromSVG: (svgContent: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

/**
 * Hook for generating diagrams using AI
 */
export function useAIGeneration(): UseAIGenerationReturn {
    const { setNodes, setEdges, setSourceCode } = useDiagramStore();
    const { ollamaUrl, modelName, aiMode, onlineProvider, apiKey } = useSettingsStore();
    const { isLoading, error, setLoading, setError } = useUIStore();

    const processAIResponse = useCallback(
        (result: AIResponse) => {
            if (!result.success || !result.mermaidCode) {
                throw new Error(result.error || 'Failed to generate diagram');
            }

            setSourceCode(result.mermaidCode);
            const { nodes: parsedNodes, edges: parsedEdges } = parseMermaid(result.mermaidCode);

            // Attach metadata if available
            if (result.metadata) {
                parsedNodes.forEach((node) => {
                    const label = (node.data.label as string) || '';
                    if (label && result.metadata && result.metadata[label]) {
                        node.data.metadata = result.metadata[label] as NodeMetadata;
                    }
                });
            }

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                parsedNodes,
                parsedEdges
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        },
        [setNodes, setEdges, setSourceCode]
    );

    const validateSettings = useCallback(() => {
        if (aiMode === 'offline' && !ollamaUrl) {
            throw new Error('Please configure Ollama URL in settings');
        }
        if (aiMode === 'online' && !apiKey) {
            throw new Error('Please configure API key in settings');
        }
    }, [aiMode, ollamaUrl, apiKey]);

    const generateFromText = useCallback(
        async (text: string) => {
            if (!text.trim()) return;

            setLoading(true);
            setError(null);

            try {
                validateSettings();
                const result = await interpretText(
                    text,
                    ollamaUrl,
                    modelName,
                    aiMode,
                    onlineProvider,
                    apiKey
                );
                processAIResponse(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate diagram');
            } finally {
                setLoading(false);
            }
        },
        [
            ollamaUrl,
            modelName,
            aiMode,
            onlineProvider,
            apiKey,
            validateSettings,
            processAIResponse,
            setLoading,
            setError,
        ]
    );

    const generateFromImage = useCallback(
        async (imageBase64: string) => {
            setLoading(true);
            setError(null);

            try {
                validateSettings();
                const result = await analyzeImage(
                    imageBase64,
                    ollamaUrl,
                    modelName,
                    aiMode,
                    onlineProvider,
                    apiKey
                );
                processAIResponse(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to analyze image');
            } finally {
                setLoading(false);
            }
        },
        [
            ollamaUrl,
            modelName,
            aiMode,
            onlineProvider,
            apiKey,
            validateSettings,
            processAIResponse,
            setLoading,
            setError,
        ]
    );

    const generateFromSVG = useCallback(
        async (svgContent: string) => {
            setLoading(true);
            setError(null);

            try {
                validateSettings();
                const result = await analyzeSVG(
                    svgContent,
                    ollamaUrl,
                    modelName,
                    aiMode,
                    onlineProvider,
                    apiKey
                );
                processAIResponse(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to analyze SVG');
            } finally {
                setLoading(false);
            }
        },
        [
            ollamaUrl,
            modelName,
            aiMode,
            onlineProvider,
            apiKey,
            validateSettings,
            processAIResponse,
            setLoading,
            setError,
        ]
    );

    return {
        generateFromText,
        generateFromImage,
        generateFromSVG,
        isLoading,
        error,
    };
}
