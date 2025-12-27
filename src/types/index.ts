/**
 * Core type definitions for kv-graph
 * Centralized types to ensure consistency across the application
 */

import type { Node as FlowNode, Edge as FlowEdge, Connection as FlowConnection } from '@xyflow/react';

// ============================================
// Node Types
// ============================================

/**
 * Metadata attached to nodes for additional context
 */
export interface NodeMetadata {
    techStack: string[];
    role: string;
    description: string;
}

/**
 * Extended Node type with application-specific data
 */
export interface NodeData {
    label?: string;
    metadata?: NodeMetadata;
    category?: string;
    [key: string]: unknown;
}

export type Node = FlowNode<NodeData>;

/**
 * Parsed node from Mermaid code
 */
export interface ParsedNode {
    id: string;
    label: string;
    type: NodeType;
    parentId?: string;
}

export type NodeType =
    | 'start'
    | 'end'
    | 'default'
    | 'decision'
    | 'process'
    | 'database'
    | 'group'
    | 'client'
    | 'server';

// ============================================
// Edge Types
// ============================================

export type Edge = FlowEdge;

/**
 * Parsed edge from Mermaid code
 */
export interface ParsedEdge {
    source: string;
    target: string;
    label?: string;
    dashed?: boolean;
}

/**
 * Parsed group/subgraph from Mermaid code
 */
export interface ParsedGroup {
    id: string;
    label: string;
    nodes: string[];
}

export type EdgeStyle = 'curved' | 'straight';

// ============================================
// AI Service Types
// ============================================

export type AIMode = 'online' | 'offline' | 'browser';

export type OnlineProvider = 'openai' | 'gemini' | 'ollama-cloud' | 'browser';

export interface AIResponse {
    success: boolean;
    mermaidCode?: string;
    metadata?: Record<string, NodeMetadata>;
    error?: string;
}

export interface AIFixResponse {
    success: boolean;
    mermaidCode?: string;
    explanation?: string;
    error?: string;
}

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | AIMessageContent[];
}

export interface AIMessageContent {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
}

// ============================================
// Diagram Persistence Types
// ============================================

export interface SavedDiagram {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    sourceCode: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// UI State Types
// ============================================

export type Theme = 'light' | 'dark';

export type InputTab = 'image' | 'code' | 'describe';

export interface FilterOption {
    id: string;
    label: string;
    active: boolean;
}

// ============================================
// Connection Types (React Flow)
// ============================================

// Re-export Connection from React Flow for type compatibility
export type Connection = FlowConnection;

// ============================================
// Export Types
// ============================================

export type ExportFormat = 'png' | 'jpg' | 'svg' | 'json' | 'mermaid' | 'react' | 'react-minimal';

export interface ExportOptions {
    format: ExportFormat;
    quality?: number;
    pixelRatio?: number;
    backgroundColor?: string;
}

// ============================================
// Component Props Types
// ============================================

export interface NodeProps {
    data: NodeData;
    selected: boolean;
    id: string;
}

export interface CustomHandleProps {
    type: 'source' | 'target';
    position: 'top' | 'bottom' | 'left' | 'right';
    id?: string;
    className?: string;
}
