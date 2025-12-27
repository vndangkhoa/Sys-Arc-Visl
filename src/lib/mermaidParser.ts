import mermaid from 'mermaid';
import { type Node, type Edge } from '../store';

// Initialize mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
});

interface ParsedNode {
    id: string;
    label: string;
    type: 'start' | 'end' | 'default' | 'decision' | 'process' | 'database' | 'group' | 'client' | 'server';
    parentId?: string;
}

/**
 * Sanitize node labels by removing HTML tags and normalizing whitespace
 */
function sanitizeLabel(label: string): string {
    return label
        .replace(/<br\s*\/?>/gi, ' ')  // Replace <br/> with space
        .replace(/<[^>]*>/g, '')        // Remove all other HTML tags
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .trim();
}

/**
 * Check if label indicates a decision/approval step
 */
function isDecisionLabel(label: string): boolean {
    const decisionKeywords = ['review', 'approve', 'decision', 'verify', 'check', 'validate', 'confirm', '?'];
    const lowerLabel = label.toLowerCase();
    return decisionKeywords.some(keyword => lowerLabel.includes(keyword));
}

/**
 * Preprocess mermaid code to handle common issues
 */
function preprocessMermaidCode(code: string): string {
    return code
        // Remove %%{init:...}%% directives that may cause issues
        .replace(/%%\{init:[^}]*\}%%/g, '')
        // Convert <br/>, <br>, <br /> to spaces in node labels
        .replace(/<br\s*\/?>/gi, ' ')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove empty lines at start
        .trim();
}

export async function parseMermaid(mermaidCode: string): Promise<{ nodes: Node[]; edges: Edge[] }> {
    try {
        // Preprocess the code to handle common issues
        const cleanedCode = preprocessMermaidCode(mermaidCode);

        // Validate syntax first
        await mermaid.parse(cleanedCode);

        // Get the diagram definition
        // @ts-ignore - getDiagram is internal but necessary for AST access
        const diagram = await mermaid.mermaidAPI.getDiagramFromText(cleanedCode);

        // Access the internal database for flowcharts
        const db = diagram.db;

        // Flowchart extraction
        // Note: Different diagram types have different DB structures. This covers 'flowchart' and 'graph'.
        const vertices = (db as any).getVertices?.() || {};
        const edgesData = (db as any).getEdges?.() || [];

        const nodes: Node[] = [];
        const edges: Edge[] = [];
        const groupColors = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#e0e7ff'];
        let groupIndex = 0;

        // REVISE: Retrieving subgraphs from DB
        const subgraphs = (db as any).getSubGraphs?.() || []; // { id, title, nodes: [ids] }

        // Create Group Nodes first
        for (const sub of subgraphs) {
            nodes.push({
                id: sub.id,
                type: 'group',
                position: { x: 0, y: 0 },
                data: {
                    label: sub.title,
                    color: groupColors[groupIndex++ % groupColors.length]
                },
                style: {},
            });
        }

        // Process Nodes and Groups logic combined
        for (const [id, vertex] of Object.entries(vertices) as any[]) {
            // vertex: { id, text, type, styles, classes, ... }
            const rawLabel = vertex.text || id;
            const label = sanitizeLabel(rawLabel);  // Clean HTML tags
            let type: ParsedNode['type'] = 'default';
            const lowerLabel = label.toLowerCase();

            // Infer type from shape/label overlap
            if (vertex.type === 'cylinder' || lowerLabel.includes('db') || lowerLabel.includes('database')) {
                type = 'database';
            } else if (vertex.type === 'diamond' || isDecisionLabel(label)) {
                type = 'decision';
            } else if (lowerLabel.includes('start') || lowerLabel.includes('begin')) {
                type = 'start';
            } else if (lowerLabel.includes('end') || lowerLabel.includes('stop')) {
                type = 'end';
            } else {
                // Check heuristics
                if (lowerLabel.includes('client') || lowerLabel.includes('user')) type = 'client';
                else if (lowerLabel.includes('server') || lowerLabel.includes('api')) type = 'server';
            }

            // Check if node belongs to a subgraph
            let parentId = undefined;
            for (const sub of subgraphs) {
                if (sub.nodes.includes(id)) {
                    parentId = sub.id;
                    break;
                }
            }

            // Determine category for filtering
            let category = 'filter-server';
            if (type === 'database') category = 'filter-db';
            else if (type === 'client') category = 'filter-client';

            nodes.push({
                id: id,
                type: type,
                position: { x: 0, y: 0 },
                data: { label, category },  // Use sanitized label
                parentId: parentId,
                extent: parentId ? 'parent' : undefined
            });
        }

        // Process Edges
        edgesData.forEach((e: any, i: number) => {
            edges.push({
                id: `e${e.start}-${e.end}-${i}`,
                source: e.start,
                target: e.end,
                label: e.text,
                animated: e.stroke === 'dotted', // Heuristic
                style: {
                    strokeWidth: 2,
                    strokeDasharray: e.stroke === 'dotted' ? '5,5' : undefined
                },
                labelStyle: { fill: '#374151', fontWeight: 600, fontSize: 11 },
                labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
                labelBgPadding: [6, 4],
                labelBgBorderRadius: 4,
            });
        });

        // Check if we got meaningful results: if we have edges but no non-group nodes, fallback to regex
        const nonGroupNodes = nodes.filter(n => n.type !== 'group');
        if (edges.length > 0 && nonGroupNodes.length === 0) {
            console.warn('[MermaidParser] Mermaid API returned edges but no nodes, falling back to regex');
            return parseMermaidRegex(mermaidCode);
        }

        console.log(`[MermaidParser] Mermaid API: ${nodes.length} nodes, ${edges.length} edges`);
        return { nodes, edges };

    } catch (e) {
        console.error("[MermaidParser] Mermaid API failed, falling back to regex:", e);
        // Fallback to regex if mermaid API fails or isn't a flowchart
        return parseMermaidRegex(mermaidCode);
    }
}

// Improved regex fallback parser
function parseMermaidRegex(mermaidCode: string): { nodes: Node[]; edges: Edge[] } {
    // Preprocess the code first
    const cleanedCode = preprocessMermaidCode(mermaidCode);
    const lines = cleanedCode.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'));

    const nodeMap = new Map<string, any>();
    const parsedEdges: any[] = [];
    const groups: any[] = [];
    let currentGroup: any | null = null;
    const groupColors = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#e0e7ff'];

    for (const line of lines) {
        // Skip flowchart/graph declaration
        if (line.match(/^(flowchart|graph)\s+/i)) continue;

        // Subgraph start - handle multiple formats
        const subgraphMatch = line.match(/^subgraph\s+(\w+)\s*\[([^\]]+)\]/i) ||
            line.match(/^subgraph\s+(\w+)\s*\[\s*"([^"]+)"\s*\]/i) ||
            line.match(/^subgraph\s+(\w+)/i);
        if (subgraphMatch) {
            currentGroup = {
                id: subgraphMatch[1],
                label: sanitizeLabel(subgraphMatch[2] || subgraphMatch[1]),
                nodes: []
            };
            groups.push(currentGroup);
            continue;
        }
        if (line.match(/^end$/i)) {
            currentGroup = null;
            continue;
        }

        // Enhanced node definition patterns - handle all bracket types
        // [text], (text), {text}, ((text)), ([text]), [(text)], [[text]], [/text/], [\text\], etc.
        const nodePatterns = [
            // Standard brackets: A[text], A(text), A{text}
            /(\w+)\s*\[([^\]]+)\]/g,           // [square]
            /(\w+)\s*\(([^)]+)\)/g,            // (rounded)
            /(\w+)\s*\{([^}]+)\}/g,            // {diamond}
            // Special brackets: A[(text)], A([text]), A((text)), A[[text]]
            /(\w+)\s*\[\(([^)]+)\)\]/g,        // [(cylinder)]
            /(\w+)\s*\(\[([^\]]+)\]\)/g,       // ([stadium])
            /(\w+)\s*\(\(([^)]+)\)\)/g,        // ((circle))
            /(\w+)\s*\[\[([^\]]+)\]\]/g,       // [[subroutine]]
        ];

        for (const pattern of nodePatterns) {
            let match;
            const regex = new RegExp(pattern.source, 'g');
            while ((match = regex.exec(line)) !== null) {
                const id = match[1];
                // Skip if it looks like an edge keyword
                if (['end', 'subgraph', 'flowchart', 'graph'].includes(id.toLowerCase())) continue;

                const rawLabel = match[2];
                const label = sanitizeLabel(rawLabel);

                // Determine type based on bracket shape
                let type = 'default';
                if (pattern.source.includes('\\[\\(')) type = 'database';      // [(cylinder)]
                else if (pattern.source.includes('\\{')) type = 'decision';    // {diamond}
                else if (pattern.source.includes('\\(\\(')) type = 'start';    // ((circle))
                else if (isDecisionLabel(label)) type = 'decision';

                if (!nodeMap.has(id)) {
                    nodeMap.set(id, {
                        id,
                        label,
                        type,
                        parentId: currentGroup?.id
                    });
                    if (currentGroup) currentGroup.nodes.push(id);
                }
            }
        }

        // Enhanced edge matching - handle all arrow types and labels
        // A --> B, A --text--> B, A -.-> B, A -.text.-> B, A ==> B, A -->|text| B, A -.->|text| B
        const edgePatterns = [
            /(\w+)\s*-->\|([^|]*)\|\s*(\w+)/g,           // A -->|text| B
            /(\w+)\s*-\.->\|([^|]*)\|\s*(\w+)/g,         // A -.->|text| B (dotted with pipe label) ***NEW***
            /(\w+)\s*--\s*([^->\s][^-]*?)\s*-->\s*(\w+)/g,  // A --text--> B
            /(\w+)\s*-\.->(\w+)/g,                       // A -.->B (dotted no space)
            /(\w+)\s*-\.->\s*(\w+)/g,                    // A -.-> B (dotted)
            /(\w+)\s*-\.([^.>]+)\.->\s*(\w+)/g,          // A -.text.-> B (dotted with label)
            /(\w+)\s*==>\s*(\w+)/g,                      // A ==> B (thick)
            /(\w+)\s*-->\s*(\w+)/g,                      // A --> B (simple)
            /(\w+)\s*---\s*(\w+)/g,                      // A --- B (no arrow)
        ];

        for (const pattern of edgePatterns) {
            let match;
            const regex = new RegExp(pattern.source, 'g');
            while ((match = regex.exec(line)) !== null) {
                const source = match[1];
                const target = match.length > 3 ? match[3] : match[2];
                const edgeLabel = match.length > 3 ? sanitizeLabel(match[2]) : undefined;
                const isDotted = pattern.source.includes('-\\.');

                parsedEdges.push({
                    source,
                    target,
                    label: edgeLabel,
                    dotted: isDotted
                });

                // Auto-create nodes if they don't exist
                if (!nodeMap.has(source)) {
                    nodeMap.set(source, { id: source, label: source, type: 'default', parentId: currentGroup?.id });
                    if (currentGroup) currentGroup.nodes.push(source);
                }
                if (!nodeMap.has(target)) {
                    nodeMap.set(target, { id: target, label: target, type: 'default', parentId: currentGroup?.id });
                    if (currentGroup) currentGroup.nodes.push(target);
                }
            }
        }
    }

    // Convert to React Flow format
    const nodes: Node[] = [
        // Groups first
        ...groups.map((g, i) => ({
            id: g.id,
            type: 'group',
            position: { x: 0, y: 0 },
            data: { label: g.label, color: groupColors[i % groupColors.length] },
            style: {
                width: 300,
                height: 200,
            }
        })),
        // Then nodes
        ...Array.from(nodeMap.values()).map((n: any) => ({
            id: n.id,
            type: n.type,
            position: { x: 0, y: 0 },
            data: { label: n.label, category: 'filter-server' },
            parentId: n.parentId,
            extent: n.parentId ? 'parent' as const : undefined
        }))
    ];

    const edges: Edge[] = parsedEdges.map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: e.dotted,
        style: e.dotted ? { strokeDasharray: '5,5' } : undefined
    }));

    console.log(`[MermaidParser] Regex fallback: ${nodes.length} nodes, ${edges.length} edges`);
    return { nodes, edges };
}

export function detectInputType(input: string): 'mermaid' | 'natural' {
    const mermaidPatterns = [
        /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram)/im,
        /-->/,
        /---/,
        /\[\[.*\]\]/,
        /\(\(.*\)\)/,
        /\{.*\}/,
        /subgraph/i,
    ];

    for (const pattern of mermaidPatterns) {
        if (pattern.test(input)) return 'mermaid';
    }

    return 'natural';
}
