/**
 * @deprecated THIS FILE IS DEPRECATED AND SHOULD NOT BE USED.
 * All components have been migrated to use the centralized store in '../store/index.ts'.
 * This file is kept only to prevent build errors if any obscure imports remain, but should be deleted soon.
 * 
 * Legacy Flow Store - Maintained for backward compatibility
 * 
 * @deprecated Use the individual stores instead:
 * - useDiagramStore - for nodes, edges, diagram operations
 * - useSettingsStore - for AI configuration and theme
 * - useUIStore - for UI state and interactions
 * 
 * Or use the combined useFlowStore from './index.ts'
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    type Node as FlowNode,
    type Edge as FlowEdge,
    type Connection,
} from '@xyflow/react';

// Enhanced Node type with metadata
export interface NodeMetadata {
    techStack: string[];
    role: string;
    description: string;
}

export type Node = FlowNode<{
    label?: string;
    metadata?: NodeMetadata;
    [key: string]: unknown;
}>;

export type Edge = FlowEdge;

type OnNodesChange = Parameters<typeof applyNodeChanges>[0];
type OnEdgesChange = Parameters<typeof applyEdgeChanges>[0];

interface SavedDiagram {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    sourceCode: string;
    createdAt: string;
}

interface FlowState {
    nodes: Node[];
    edges: Edge[];
    selectedNode: Node | null;
    isLoading: boolean;
    error: string | null;
    sourceCode: string;
    apiKey: string;
    modelName: string;
    ollamaUrl: string;
    theme: 'dark' | 'light';
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    focusMode: boolean;
    activeFilters: string[];
    aiMode: 'online' | 'offline';
    onlineProvider: 'openai' | 'gemini' | 'ollama-cloud';
    edgeStyle: 'curved' | 'straight';

    // Computed property for saved diagrams
    savedDiagrams: SavedDiagram[];

    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setSelectedNode: (node: Node | null) => void;

    setLeftPanelOpen: (leftPanelOpen: boolean) => void;
    setRightPanelOpen: (rightPanelOpen: boolean) => void;

    toggleTheme: () => void;

    setFocusMode: (focusMode: boolean) => void;

    toggleFilter: (filterId: string) => void;

    onNodesChange: (changes: OnNodesChange) => void;
    onEdgesChange: (changes: OnEdgesChange) => void;
    onConnect: (connection: Connection) => void;

    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
    setSourceCode: (sourceCode: string) => void;

    setApiKey: (apiKey: string) => void;
    setModelName: (modelName: string) => void;
    setOllamaUrl: (ollamaUrl: string) => void;
    setAiMode: (aiMode: 'online' | 'offline') => void;
    setOnlineProvider: (onlineProvider: 'openai' | 'gemini' | 'ollama-cloud') => void;

    reset: () => void;

    // Node editing
    updateNodeData: (nodeId: string, data: Partial<Node['data']>) => void;
    updateNodeType: (nodeId: string, type: string) => void;
    deleteNode: (nodeId: string) => void;
    saveDiagram: (name: string) => void;
    loadDiagram: (id: string) => void;
    deleteDiagram: (id: string) => void;
    setEdgeStyle: (style: 'curved' | 'straight') => void;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const useFlowStore = create<FlowState>()(
    persist(
        (set, get) => ({
            nodes: initialNodes,
            edges: initialEdges,
            selectedNode: null,
            isLoading: false,
            error: null,
            sourceCode: '',
            apiKey: localStorage.getItem('flowgen_api_key') || '',
            modelName: localStorage.getItem('flowgen_model_name') || 'llama3.2-vision',
            ollamaUrl: localStorage.getItem('flowgen_ollama_url') || 'http://localhost:11434',
            theme: (localStorage.getItem('flowgen_theme') as 'dark' | 'light') || 'dark',
            leftPanelOpen: true,
            rightPanelOpen: false,
            focusMode: false,
            edgeStyle: 'curved',
            activeFilters: ['filter-client', 'filter-server', 'filter-db', 'filter-other'],
            aiMode: (localStorage.getItem('flowgen_ai_mode') as 'online' | 'offline') || 'offline',
            onlineProvider: (localStorage.getItem('flowgen_online_provider') as 'openai' | 'gemini' | 'ollama-cloud') || 'openai',

            // Return saved diagrams from localStorage
            savedDiagrams: JSON.parse(localStorage.getItem('flowgen_diagrams') || '[]') as SavedDiagram[],

            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),
            setSelectedNode: (node) => set({ selectedNode: node, rightPanelOpen: node !== null }),

            setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
            setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),

            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark';
                document.documentElement.classList.toggle('dark', newTheme === 'dark');
                localStorage.setItem('flowgen_theme', newTheme);
                set({ theme: newTheme });
            },

            setFocusMode: (focusMode) => set({ focusMode }),

            toggleFilter: (filterId) => {
                const activeFilters = get().activeFilters;
                const isActive = activeFilters.includes(filterId);
                set({
                    activeFilters: isActive ? activeFilters.filter(f => f !== filterId) : [...activeFilters, filterId]
                });
            },

            onNodesChange: (changes) => {
                set({
                    nodes: applyNodeChanges(changes, get().nodes),
                });
            },

            onEdgesChange: (changes) => {
                set({
                    edges: applyEdgeChanges(changes, get().edges),
                });
            },

            onConnect: (connection) => {
                set({
                    edges: addEdge(connection, get().edges),
                });
            },

            setLoading: (isLoading) => set({ isLoading }),
            setError: (error) => set({ error }),
            setSourceCode: (sourceCode) => set({ sourceCode }),

            setApiKey: (apiKey) => {
                localStorage.setItem('flowgen_api_key', apiKey);
                set({ apiKey });
            },

            setModelName: (modelName) => {
                localStorage.setItem('flowgen_model_name', modelName);
                set({ modelName });
            },

            setOllamaUrl: (ollamaUrl) => {
                localStorage.setItem('flowgen_ollama_url', ollamaUrl);
                set({ ollamaUrl });
            },

            setAiMode: (aiMode) => {
                localStorage.setItem('flowgen_ai_mode', aiMode);
                set({ aiMode });
            },

            setOnlineProvider: (onlineProvider) => {
                localStorage.setItem('flowgen_online_provider', onlineProvider);
                set({ onlineProvider });
            },

            reset: () => set({
                nodes: initialNodes,
                edges: initialEdges,
                selectedNode: null,
                error: null,
            }),

            // Node editing
            updateNodeData: (nodeId, data) => {
                set({
                    nodes: get().nodes.map(node =>
                        node.id === nodeId
                            ? { ...node, data: { ...node.data, ...data } }
                            : node
                    ),
                });
            },

            updateNodeType: (nodeId, type) => {
                set({
                    nodes: get().nodes.map(node =>
                        node.id === nodeId ? { ...node, type } : node
                    ),
                });
            },

            deleteNode: (nodeId) => {
                set({
                    nodes: get().nodes.filter(node => node.id !== nodeId),
                    edges: get().edges.filter(edge =>
                        edge.source !== nodeId && edge.target !== nodeId
                    ),
                    selectedNode: null,
                    rightPanelOpen: false,
                });
            },

            // Diagram persistence
            saveDiagram: (name) => {
                const { nodes, edges, sourceCode } = get();
                const diagrams = JSON.parse(localStorage.getItem('flowgen_diagrams') || '[]');
                const newDiagram: SavedDiagram = {
                    id: `diagram_${Date.now()}`,
                    name,
                    nodes,
                    edges,
                    sourceCode,
                    createdAt: new Date().toISOString(),
                };
                const updatedDiagrams = [newDiagram, ...diagrams];
                localStorage.setItem('flowgen_diagrams', JSON.stringify(updatedDiagrams));
                set({ savedDiagrams: updatedDiagrams });
            },

            loadDiagram: (id) => {
                const diagrams = JSON.parse(localStorage.getItem('flowgen_diagrams') || '[]');
                const diagram = diagrams.find((d: { id: string }) => d.id === id);
                if (diagram) {
                    set({
                        nodes: diagram.nodes,
                        edges: diagram.edges,
                        sourceCode: diagram.sourceCode || '',
                    });
                }
            },

            deleteDiagram: (id) => {
                const diagrams = JSON.parse(localStorage.getItem('flowgen_diagrams') || '[]');
                const updatedDiagrams = diagrams.filter((d: { id: string }) => d.id !== id);
                localStorage.setItem('flowgen_diagrams', JSON.stringify(updatedDiagrams));
                set({ savedDiagrams: updatedDiagrams });
            },

            setEdgeStyle: (edgeStyle) => set({ edgeStyle }),
        }),
        {
            name: 'flowgen-storage',
            partialize: (state) => ({
                nodes: state.nodes,
                edges: state.edges,
                sourceCode: state.sourceCode,
                theme: state.theme,
                edgeStyle: state.edgeStyle,
            }),
        }
    )
);
