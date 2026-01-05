/**
 * Store exports - Centralized store access
 * 
 * The store is split into three slices for better separation of concerns:
 * - diagramStore: Manages nodes, edges, and diagram operations
 * - settingsStore: Manages AI configuration and app settings
 * - uiStore: Manages UI state and interactions
 * 
 * For backward compatibility, we also export a combined hook.
 */

export { useDiagramStore } from './diagramStore';
export { useSettingsStore } from './settingsStore';
export { useUIStore } from './uiStore';

// Re-export types
export type { Node, Edge } from '../types';

/**
 * Combined store hook for backward compatibility
 * Use individual stores when possible for better performance
 */
import { useDiagramStore } from './diagramStore';
import { useSettingsStore } from './settingsStore';
import { useUIStore } from './uiStore';

export function useFlowStore() {
    const diagram = useDiagramStore();
    const settings = useSettingsStore();
    const ui = useUIStore();

    return {
        // Diagram state
        nodes: diagram.nodes,
        edges: diagram.edges,
        sourceCode: diagram.sourceCode,
        edgeStyle: diagram.edgeStyle,
        savedDiagrams: diagram.savedDiagrams,
        generationComplexity: diagram.generationComplexity, // NEW

        // Diagram actions
        setNodes: diagram.setNodes,
        setEdges: diagram.setEdges,
        setSourceCode: diagram.setSourceCode,
        setEdgeStyle: diagram.setEdgeStyle,
        setGenerationComplexity: diagram.setGenerationComplexity, // NEW
        onNodesChange: diagram.onNodesChange,
        onEdgesChange: diagram.onEdgesChange,
        onConnect: diagram.onConnect,
        updateNodeData: diagram.updateNodeData,
        updateNodeType: diagram.updateNodeType,
        deleteNode: diagram.deleteNode,
        saveDiagram: diagram.saveDiagram,
        loadDiagram: diagram.loadDiagram,
        deleteDiagram: diagram.deleteDiagram,
        clearAllDiagrams: diagram.clearAllDiagrams,

        // Settings state
        apiKey: settings.apiKey,
        ollamaUrl: settings.ollamaUrl,
        modelName: settings.modelName,
        aiMode: settings.aiMode,
        onlineProvider: settings.onlineProvider,
        theme: settings.theme,

        // Settings actions
        setApiKey: settings.setApiKey,
        setOllamaUrl: settings.setOllamaUrl,
        setModelName: settings.setModelName,
        setAiMode: settings.setAiMode,
        setOnlineProvider: settings.setOnlineProvider,
        toggleTheme: settings.toggleTheme,

        // UI state
        selectedNode: ui.selectedNode,
        leftPanelOpen: ui.leftPanelOpen,
        rightPanelOpen: ui.rightPanelOpen,
        focusMode: ui.focusMode,
        mobileEditorOpen: ui.mobileEditorOpen,
        inputDescription: ui.inputDescription,
        inputActiveTab: ui.inputActiveTab,
        inputImageUrl: ui.inputImageUrl,
        mermaidCode: ui.mermaidCode,
        activeFilters: ui.activeFilters,
        isLoading: ui.isLoading,
        error: ui.error,

        // UI actions
        setSelectedNode: ui.setSelectedNode,
        setLeftPanelOpen: ui.setLeftPanelOpen,
        setRightPanelOpen: ui.setRightPanelOpen,
        setFocusMode: ui.setFocusMode,
        setMobileEditorOpen: ui.setMobileEditorOpen,
        setInputDescription: ui.setInputDescription,
        setInputActiveTab: ui.setInputActiveTab,
        setInputImageUrl: ui.setInputImageUrl,
        setMermaidCode: ui.setMermaidCode,
        clearInputs: ui.clearInputs,
        toggleFilter: ui.toggleFilter,
        setActiveFilters: ui.setActiveFilters,
        setLoading: ui.setLoading,
        setError: ui.setError,

        // View Mode
        viewMode: ui.viewMode,
        setViewMode: ui.setViewMode,

        // Combined reset
        reset: () => {
            diagram.reset();
            ui.setSelectedNode(null);
            ui.setError(null);
        },
    };
}
