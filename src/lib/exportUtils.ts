import { toPng, toJpeg, toSvg } from 'html-to-image';
import { type Node, type Edge } from '../store';

// Robust cross-browser file download function using data URLs for better Chrome compatibility
function saveFile(blob: Blob, filename: string): void {
    console.log(`[Export] Starting download: ${filename}`);

    // Convert blob to data URL for better download attribute support
    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;

        // Create an anchor element
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = dataUrl;
        a.download = filename;

        // Append to body (required for Firefox)
        document.body.appendChild(a);

        // Trigger download
        a.click();

        // Cleanup after a delay
        setTimeout(() => {
            document.body.removeChild(a);
        }, 100);

        console.log(`[Export] Download triggered: ${filename}`);
    };

    reader.onerror = () => {
        console.error(`[Export] Failed to read blob for: ${filename}`);
    };

    reader.readAsDataURL(blob);
}

// Get the current theme's background color
function getThemeBackgroundColor(): string {
    // Check if dark mode is active by looking at the document class
    const isDark = document.documentElement.classList.contains('dark');
    return isDark ? '#020617' : '#ffffff';
}

export async function exportToPng(element: HTMLElement): Promise<void> {
    try {
        const backgroundColor = getThemeBackgroundColor();
        const dataUrl = await toPng(element, {
            backgroundColor,
            quality: 1,
            pixelRatio: 3,
            filter: (node) => {
                const className = node.className?.toString() || '';
                return !className.includes('react-flow__controls') &&
                    !className.includes('react-flow__minimap') &&
                    !className.includes('react-flow__panel');
            }
        });

        const blob = dataURLtoBlob(dataUrl);
        saveFile(blob, `diagram-${getTimestamp()}.png`);
    } catch (error) {
        console.error('Failed to export PNG:', error);
        throw error;
    }
}

export async function exportToJpg(element: HTMLElement): Promise<void> {
    try {
        const backgroundColor = getThemeBackgroundColor();
        const dataUrl = await toJpeg(element, {
            backgroundColor,
            quality: 0.95,
            pixelRatio: 2,
            filter: (node) => {
                const className = node.className?.toString() || '';
                return !className.includes('react-flow__controls') &&
                    !className.includes('react-flow__minimap') &&
                    !className.includes('react-flow__panel');
            }
        });

        const blob = dataURLtoBlob(dataUrl);
        saveFile(blob, `diagram-${getTimestamp()}.jpg`);
    } catch (error) {
        console.error('Failed to export JPG:', error);
        throw error;
    }
}

export async function exportToSvg(element: HTMLElement): Promise<void> {
    try {
        const backgroundColor = getThemeBackgroundColor();
        const dataUrl = await toSvg(element, {
            backgroundColor,
            filter: (node) => {
                const className = node.className?.toString() || '';
                return !className.includes('react-flow__controls') &&
                    !className.includes('react-flow__minimap') &&
                    !className.includes('react-flow__panel');
            }
        });

        const blob = dataURLtoBlob(dataUrl);
        saveFile(blob, `diagram-${getTimestamp()}.svg`);
    } catch (error) {
        console.error('Failed to export SVG:', error);
        throw error;
    }
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

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    saveFile(blob, `summary-${getTimestamp()}.txt`);
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
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    saveFile(blob, `diagram-${getTimestamp()}.json`);
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
    const blob = new Blob([mermaid], { type: 'text/plain;charset=utf-8' });
    saveFile(blob, `diagram-${getTimestamp()}.mmd`);
}

function getTimestamp(): string {
    return new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
}

// Convert data URL to Blob for proper file download
function dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}
