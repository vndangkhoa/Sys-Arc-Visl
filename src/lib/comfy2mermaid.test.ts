import { describe, it, expect } from 'vitest';
import { workflowToMermaid } from './comfy2mermaid';

describe('comfy2mermaid', () => {
    it('converts a simple workflow', () => {
        const workflow = {
            last_node_id: 2,
            last_link_id: 1,
            nodes: [
                { id: 1, type: "LoadImage", title: "Load Image" },
                { id: 2, type: "PreviewImage", title: "Preview Image" }
            ],
            links: [
                [1, 1, 0, 2, 0, "IMAGE"]
            ],
            version: 0.4
        };

        const mermaidCode = workflowToMermaid(workflow as any);

        expect(mermaidCode).toContain('graph TD');
        expect(mermaidCode).toContain('N1["Load Image"]');
        expect(mermaidCode).toContain('N2["Preview Image"]');
        expect(mermaidCode).toContain('N1 -- IMAGE --> N2');
    });

    it('handles groups', () => {
        const workflow = {
            last_node_id: 2,
            last_link_id: 0,
            nodes: [
                { id: 1, type: "A", pos: [100, 100], size: [50, 50] }, // Inside group
                { id: 2, type: "B", pos: [500, 500], size: [50, 50] }  // Outside group
            ],
            links: [],
            groups: [
                { title: "My Group", bounding: [0, 0, 200, 200] }
            ]
        };

        const mermaidCode = workflowToMermaid(workflow as any);
        expect(mermaidCode).toContain('subgraph G0 ["My Group"]');
        expect(mermaidCode).toContain('N1');
        // Should not contain N2 inside the subgraph block, but regex is hard.
        // Logic check:
        // subgraph G0 ["My Group"]
        //     N1
        // end
    });
});
