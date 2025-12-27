import { toPng } from 'html-to-image';
import { type Node, type Edge } from '../store';

export async function exportToPng(element: HTMLElement): Promise<void> {
    try {
        const dataUrl = await toPng(element, {
            backgroundColor: '#020617',
            quality: 1,
            pixelRatio: 3,
            filter: (node) => {
                const className = node.className?.toString() || '';
                return !className.includes('react-flow__controls') &&
                    !className.includes('react-flow__minimap') &&
                    !className.includes('react-flow__panel');
            }
        });

        downloadFile(dataUrl, `diagram-${getTimestamp()}.png`);
    } catch (error) {
        console.error('Failed to export PNG:', error);
        throw error;
    }
}

export async function exportToJpg(element: HTMLElement): Promise<void> {
    try {
        const { toJpeg } = await import('html-to-image');
        const dataUrl = await toJpeg(element, {
            backgroundColor: '#020617',
            quality: 0.95,
            pixelRatio: 2,
            filter: (node) => {
                const className = node.className?.toString() || '';
                return !className.includes('react-flow__controls') &&
                    !className.includes('react-flow__minimap') &&
                    !className.includes('react-flow__panel');
            }
        });

        downloadFile(dataUrl, `diagram-${getTimestamp()}.jpg`);
    } catch (error) {
        console.error('Failed to export JPG:', error);
        throw error;
    }
}

export function exportToSvg(nodes: Node[], _edges: Edge[]): void {
    // Basic SVG export logic (simplified for React Flow)
    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
            <rect width="100%" height="100%" fill="#020617" />
            <text x="20" y="40" fill="white" font-family="sans-serif" font-size="16">Architecture Diagram Export (SVG)</text>
            <!-- Simplified representation -->
            <g transform="translate(50,100)">
                ${nodes.map(n => `<rect x="${n.position.x}" y="${n.position.y}" width="150" height="60" rx="8" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />`).join('')}
                ${nodes.map(n => `<text x="${n.position.x + 75}" y="${n.position.y + 35}" fill="white" font-size="12" text-anchor="middle" font-family="sans-serif">${(n.data as any).label || n.id}</text>`).join('')}
            </g>
        </svg>
    `;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `diagram-${getTimestamp()}.svg`);
    URL.revokeObjectURL(url);
}

export function exportToTxt(nodes: Node[], edges: Edge[]): void {
    let txt = `Architecture Diagram Summary\n`;
    txt += `Generated: ${new Date().toLocaleString()}\n`;
    txt += `------------------------------------\n\n`;

    txt += `ENTITIES (${nodes.filter(n => n.type !== 'group').length}):\n`;
    nodes.filter(n => n.type !== 'group').forEach(n => {
        txt += `- [${n.type?.toUpperCase() || 'DEFAULT'}] ${(n.data as any).label || n.id}\n`;
    });

    txt += `\nRELATIONS (${edges.length}):\n`;
    edges.forEach(e => {
        const sourceLabel = nodes.find(n => n.id === e.source)?.data.label || e.source;
        const targetLabel = nodes.find(n => n.id === e.target)?.data.label || e.target;
        txt += `- ${sourceLabel} -> ${targetLabel} ${e.label ? `(${e.label})` : ''}\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    downloadFile(url, `summary-${getTimestamp()}.txt`);
    URL.revokeObjectURL(url);
}

export function exportToJson(nodes: Node[], edges: Edge[]): void {
    const data = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        nodes: nodes.map(n => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
        })),
        edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label,
            type: e.type,
        })),
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    downloadFile(url, `diagram-${getTimestamp()}.json`);
    URL.revokeObjectURL(url);
}

export function exportToMermaid(nodes: Node[], edges: Edge[]): string {
    let mermaid = 'flowchart TD\n\n';

    // Add styling
    mermaid += '    %% Styling\n';
    mermaid += '    classDef start fill:#10b981,stroke:#10b981,color:#fff\n';
    mermaid += '    classDef end fill:#ef4444,stroke:#ef4444,color:#fff\n';
    mermaid += '    classDef database fill:#10b981,stroke:#10b981,color:#fff\n';
    mermaid += '    classDef server fill:#3b82f6,stroke:#3b82f6,color:#fff\n';
    mermaid += '    classDef decision fill:#8b5cf6,stroke:#8b5cf6,color:#fff\n\n';

    // Export nodes
    mermaid += '    %% Nodes\n';
    nodes.forEach((node) => {
        const label = (node.data as { label?: string })?.label || node.id;
        const safeLabel = label.replace(/"/g, "'");
        let shape = '';

        switch (node.type) {
            case 'start':
            case 'startNode':
                shape = `(["${safeLabel}"])`;
                break;
            case 'end':
            case 'endNode':
                shape = `(["${safeLabel}"])`;
                break;
            case 'decision':
            case 'decisionNode':
                shape = `{"${safeLabel}"}`;
                break;
            case 'database':
            case 'databaseNode':
                shape = `[("${safeLabel}")]`;
                break;
            default:
                shape = `["${safeLabel}"]`;
        }

        mermaid += `    ${node.id}${shape}\n`;
    });

    mermaid += '\n    %% Connections\n';

    // Export edges
    edges.forEach((edge) => {
        const label = edge.label ? `|${edge.label}|` : '';
        mermaid += `    ${edge.source} -->${label} ${edge.target}\n`;
    });

    // Apply classes
    mermaid += '\n    %% Apply styles\n';
    nodes.forEach((node) => {
        if (node.type?.includes('start')) mermaid += `    class ${node.id} start\n`;
        if (node.type?.includes('end')) mermaid += `    class ${node.id} end\n`;
        if (node.type?.includes('database')) mermaid += `    class ${node.id} database\n`;
        if (node.type?.includes('server')) mermaid += `    class ${node.id} server\n`;
        if (node.type?.includes('decision')) mermaid += `    class ${node.id} decision\n`;
    });

    return mermaid;
}

export function downloadMermaid(nodes: Node[], edges: Edge[]): void {
    const mermaid = exportToMermaid(nodes, edges);
    const blob = new Blob([mermaid], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    downloadFile(url, `diagram-${getTimestamp()}.mmd`);
    URL.revokeObjectURL(url);
}

function getTimestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
}

function downloadFile(url: string, filename: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
