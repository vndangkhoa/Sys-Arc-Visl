import { describe, it, expect, vi } from 'vitest';
import { parseMermaid } from '../mermaidParser';

// Mock mermaid library
vi.mock('mermaid', () => {
    return {
        default: {
            initialize: vi.fn(),
            parse: vi.fn().mockResolvedValue(true),
            mermaidAPI: {
                getDiagramFromText: vi.fn().mockImplementation(async (text) => {
                    // Mock DB response based on text content
                    const vertices: any = {};
                    const edges: any[] = [];
                    const subgraphs: any[] = [];

                    if (text.includes('Start')) {
                        vertices['A'] = { id: 'A', text: 'Start', type: 'round' };
                        vertices['B'] = { id: 'B', text: 'End', type: 'round' };
                        edges.push({ start: 'A', end: 'B', text: undefined, stroke: 'normal' });
                    }
                    if (text.includes('Group1')) {
                        subgraphs.push({ id: 'Group1', title: 'Group1', nodes: ['A'] });
                        vertices['A'] = { id: 'A', text: 'Node A', type: 'round' };
                        vertices['B'] = { id: 'B', text: 'Node B', type: 'round' };
                        // Edge from A outside to B outside
                        edges.push({ start: 'A', end: 'B', text: undefined });
                    }
                    if (text.includes('Database')) {
                        vertices['DB'] = { id: 'DB', text: 'Database', type: 'cylinder' };
                        vertices['S'] = { id: 'S', text: 'Server', type: 'round' };
                        vertices['C'] = { id: 'C', text: 'Client App', type: 'round' };
                    }

                    return {
                        db: {
                            getVertices: () => vertices,
                            getEdges: () => edges,
                            getSubGraphs: () => subgraphs,
                        }
                    };
                })
            }
        }
    };
});

describe('mermaidParser', () => {
    it('should parse a simple flowchart', async () => {
        const code = `
        flowchart TD
            A[Start] --> B[End]
        `;
        const { nodes, edges } = await parseMermaid(code);

        expect(nodes).toHaveLength(2);
        expect(edges).toHaveLength(1);
        expect(nodes[0].data.label).toBe('Start');
        expect(nodes[1].data.label).toBe('End');
    });

    it('should handle subgraphs correctly', async () => {
        const code = `
        flowchart TD
            subgraph Group1
                A[Node A]
            end
            A --> B[Node B]
        `;
        const { nodes } = await parseMermaid(code);

        // Should have 3 nodes: Group1, A, B
        const groupNode = nodes.find(n => n.type === 'group');
        const childNode = nodes.find(n => n.id === 'A');

        expect(groupNode).toBeDefined();
        // The mock implementation ensures correct parentId association logic is tested
        if (groupNode && childNode) {
            expect(childNode.parentId).toBe(groupNode.id);
        }
    });

    it('should infer node types from labels', async () => {
        const code = `
        flowchart TD
            DB[(Database)] --> S[Server]
            S --> C([Client App])
        `;
        const { nodes } = await parseMermaid(code);

        const dbNode = nodes.find(n => n.data.label === 'Database');
        const clientNode = nodes.find(n => n.data.label === 'Client App');
        const serverNode = nodes.find(n => n.data.label === 'Server');

        expect(dbNode?.type).toBe('database');
        expect(clientNode?.type).toBe('client');
        expect(serverNode?.type).toBe('server');
    });

    it('should handle empty or invalid input securely', async () => {
        const { nodes, edges } = await parseMermaid('');
        expect(nodes).toEqual([]);
        expect(edges).toEqual([]);
    });
});
