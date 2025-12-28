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
    type: 'start' | 'end' | 'default' | 'decision' | 'process' | 'database' | 'group' | 'client' | 'server' | 'ai' | 'team' | 'platform' | 'data' | 'tech' | 'custom-shape';
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
 * Parse metadata from Mermaid comments
 * Format: %% { "id": "nodeId", "metadata": { ... } }
 */
function parseMetadataComments(code: string): Map<string, any> {
    const metadataMap = new Map<string, any>();

    // Regex matches lines starting with %% followed by JSON object
    const lines = code.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('%%')) {
            try {
                // Extract potential JSON
                const jsonStr = trimmed.substring(2).trim();
                // Basic check if it looks like JSON object
                if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
                    const data = JSON.parse(jsonStr);
                    if (data.id && data.metadata) {
                        metadataMap.set(data.id, data.metadata);
                    }
                }
            } catch (e) {
                // Ignore incomplete/invalid JSON in comments
            }
        }
    }

    return metadataMap;
}

/**
 * Preprocess mermaid code to handle common issues
 */
function preprocessMermaidCode(code: string): string {
    let cleaned = code
        // Strip markdown code fence wrappers (```mermaid ... ```)
        .replace(/^```(?:mermaid)?\s*\n?/im, '')
        .replace(/\n?```\s*$/im, '')
        // Remove %%{init:...}%% directives that may cause issues
        .replace(/%%\{init:[^}]*\}%%/g, '')
        // Convert <br/>, <br>, <br /> to spaces in node labels
        .replace(/<br\s*\/?>/gi, ' ')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove empty lines at start
        .trim();

    return cleaned;
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
            const groupTitle = (sub.title || sub.id).toLowerCase();
            let category = 'filter-other';

            if (groupTitle.includes('client') || groupTitle.includes('frontend') || groupTitle.includes('ui') || groupTitle.includes('mobile') || groupTitle.includes('web')) {
                category = 'filter-client';
            } else if (groupTitle.includes('server') || groupTitle.includes('backend') || groupTitle.includes('api') || groupTitle.includes('service') || groupTitle.includes('auth') || groupTitle.includes('handler') || groupTitle.includes('worker')) {
                category = 'filter-server';
            } else if (groupTitle.includes('database') || groupTitle.includes('db') || groupTitle.includes('store') || groupTitle.includes('cache') || groupTitle.includes('redis')) {
                category = 'filter-db';
            }

            nodes.push({
                id: sub.id,
                type: 'group',
                position: { x: 0, y: 0 },
                data: {
                    label: sub.title,
                    color: groupColors[groupIndex++ % groupColors.length],
                    category
                },
                style: {},
            });
        }

        // Match metadata to nodes
        const metadataMap = parseMetadataComments(cleanedCode);

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

            // Determine category for filtering - Enhanced Logic
            let category = 'filter-other'; // Default to other/flow

            // 1. Try to infer from Parent Subgraph Title/ID first (High Priority)
            if (parentId) {
                const parentGroup = nodes.find(n => n.id === parentId);
                if (parentGroup) {
                    // Check both label and ID for clues
                    const groupLabel = (parentGroup.data?.label as string || '').toLowerCase();
                    const groupTitle = groupLabel || parentGroup.id.toLowerCase();

                    if (groupTitle.includes('client') || groupTitle.includes('frontend') || groupTitle.includes('ui') || groupTitle.includes('mobile') || groupTitle.includes('web')) {
                        category = 'filter-client';
                        // Also upgrade node type if generic
                        if (type === 'default') type = 'client';
                    } else if (groupTitle.includes('server') || groupTitle.includes('backend') || groupTitle.includes('api') || groupTitle.includes('service') || groupTitle.includes('auth') || groupTitle.includes('handler') || groupTitle.includes('worker')) {
                        category = 'filter-server';
                        if (type === 'default') type = 'server';
                    } else if (groupTitle.includes('database') || groupTitle.includes('db') || groupTitle.includes('store') || groupTitle.includes('cache') || groupTitle.includes('redis')) {
                        category = 'filter-db';
                        if (type === 'default' || type === 'database') type = 'database';
                    }
                }
            }

            // 2. If no parent group match (or no parent), use Node Type/Label
            if (category === 'filter-other') {
                if (type === 'database') category = 'filter-db';
                else if (type === 'client') category = 'filter-client';
                else if (type === 'server') category = 'filter-server';
                // Heuristics from label if still default
                else if (label.toLowerCase().includes('gateway')) {
                    category = 'filter-server';
                    if (type === 'default') type = 'server';
                }
            }

            // 3. Final Fallback: If type is still default but category is specific, sync them
            if (type === 'default') {
                if (category === 'filter-server') type = 'server';
                else if (category === 'filter-client') type = 'client';
                else if (category === 'filter-db') type = 'database';

                // Check for specialized types based on label keywords (matching CustomNodes.tsx logic)
                const l = label.toLowerCase();
                if (l.includes('ai') || l.includes('director') || l.includes('agent') || l.includes('generate')) type = 'ai';
                else if (l.includes('team') || l.includes('human') || l.includes('review')) type = 'team';
                else if (l.includes('platform') || l.includes('youtube') || l.includes('tiktok') || l.includes('shop')) type = 'platform';
                else if (l.includes('data') || l.includes('analytics') || l.includes('metric')) type = 'data';
                else if (l.includes('tech') || l.includes('infra')) type = 'tech';

                // Check if it's a specific shape supported by ShapeNode
                const supportedShapes = ['rect', 'rounded', 'stadium', 'subroutine', 'cyl', 'cylinder', 'diamond', 'rhombus', 'hexagon', 'parallelogram', 'trapezoid', 'doc', 'document', 'cloud', 'circle', 'doublecircle'];
                if (supportedShapes.includes(vertex.type || '')) {
                    type = 'custom-shape';
                }
            }

            // Merge metadata if available
            const nodeMetadata = metadataMap.get(id);

            nodes.push({
                id: id,
                type: type, // We might want to use a generic 'custom-shape' type for explicit shapes later, but for now we keep the semantic type inference or fallback
                position: { x: 0, y: 0 },
                data: {
                    label,
                    category,
                    shape: vertex.type, // Pass the raw mermaid shape type
                    metadata: nodeMetadata // Attach parsed metadata
                },
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
                    strokeOpacity: 0.5,
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
        style: {
            strokeDasharray: e.dotted ? '5,5' : undefined,
            strokeOpacity: 0.5
        }
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
