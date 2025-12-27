/**
 * Diagram Store - Manages nodes, edges, and diagram operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { Node, Edge, Connection, SavedDiagram, EdgeStyle } from '../types';

interface DiagramState {
    // Diagram data
    nodes: Node[];
    edges: Edge[];
    sourceCode: string;
    edgeStyle: EdgeStyle;
    savedDiagrams: SavedDiagram[];
    generationComplexity: 'simple' | 'complex';
    layout: string;
    analysisResult: string | null;

    // Actions
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setSourceCode: (code: string) => void;
    setEdgeStyle: (style: EdgeStyle) => void;
    setGenerationComplexity: (complexity: 'simple' | 'complex') => void;

    // React Flow handlers
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;

    // Node operations
    updateNodeData: (nodeId: string, data: Partial<Node['data']>) => void;
    updateNodeType: (nodeId: string, type: string) => void;
    deleteNode: (nodeId: string) => void;

    // Diagram persistence
    saveDiagram: (name: string) => void;
    loadDiagram: (id: string) => void;
    deleteDiagram: (id: string) => void;
    getSavedDiagrams: () => SavedDiagram[];

    // Reset
    reset: () => void;
}

const initialState = {
    nodes: [] as Node[],
    edges: [] as Edge[],
    sourceCode: '',
    edgeStyle: 'curved' as EdgeStyle,
    layout: 'dagre',
    analysisResult: null as string | null,
    savedDiagrams: JSON.parse(localStorage.getItem('flowgen_diagrams') || '[]') as SavedDiagram[],
    generationComplexity: 'simple' as 'simple' | 'complex',
};

export const useDiagramStore = create<DiagramState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // Setters
            setNodes: (nodes) => set({ nodes }),
            setEdges: (edges) => set({ edges }),
            setSourceCode: (sourceCode) => set({ sourceCode }),
            setEdgeStyle: (edgeStyle) => set({ edgeStyle }),
            setGenerationComplexity: (generationComplexity) => set({ generationComplexity }),

            // React Flow handlers
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

            // Node operations
            updateNodeData: (nodeId, data) => {
                set({
                    nodes: get().nodes.map((node) =>
                        node.id === nodeId
                            ? { ...node, data: { ...node.data, ...data } }
                            : node
                    ),
                });
            },

            updateNodeType: (nodeId, type) => {
                set({
                    nodes: get().nodes.map((node) =>
                        node.id === nodeId ? { ...node, type } : node
                    ),
                });
            },

            deleteNode: (nodeId) => {
                set({
                    nodes: get().nodes.filter((node) => node.id !== nodeId),
                    edges: get().edges.filter(
                        (edge) => edge.source !== nodeId && edge.target !== nodeId
                    ),
                });
            },

            // Diagram persistence
            saveDiagram: (name) => {
                const { nodes, edges, sourceCode } = get();
                const diagrams = get().getSavedDiagrams();
                const now = new Date().toISOString();

                const newDiagram: SavedDiagram = {
                    id: `diagram_${Date.now()}`,
                    name,
                    nodes,
                    edges,
                    sourceCode,
                    createdAt: now,
                    updatedAt: now,
                };

                localStorage.setItem(
                    'flowgen_diagrams',
                    JSON.stringify([newDiagram, ...diagrams])
                );
                set({ savedDiagrams: [newDiagram, ...diagrams] });
            },

            loadDiagram: (id) => {
                const diagrams = get().getSavedDiagrams();
                const diagram = diagrams.find((d) => d.id === id);

                if (diagram) {
                    set({
                        nodes: diagram.nodes,
                        edges: diagram.edges,
                        sourceCode: diagram.sourceCode,
                    });
                }
            },

            deleteDiagram: (id) => {
                const diagrams = get().getSavedDiagrams();
                localStorage.setItem(
                    'flowgen_diagrams',
                    JSON.stringify(diagrams.filter((d) => d.id !== id))
                );
                set({ savedDiagrams: diagrams.filter((d) => d.id !== id) });
            },

            getSavedDiagrams: () => {
                try {
                    const stored = localStorage.getItem('flowgen_diagrams');
                    return stored ? JSON.parse(stored) : [];
                } catch {
                    return [];
                }
            },

            // Reset
            reset: () => set(initialState),
        }),
        {
            name: 'flowgen-diagram-storage',
            // Only persist saved diagrams and settings, NOT the current diagram
            // This ensures canvas clears on refresh unless user saves a draft
            partialize: (state) => ({
                savedDiagrams: state.savedDiagrams,
                edgeStyle: state.edgeStyle,
                generationComplexity: state.generationComplexity,
            }),
        }
    )
);
