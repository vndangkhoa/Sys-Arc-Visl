// import mermaid from 'mermaid';

// --- Types ---
export interface ComfyNode {
  id: number;
  type: string;
  pos?: [number, number];
  size?: { "0": number; "1": number } | [number, number];
  flags?: Record<string, any>;
  order?: number;
  mode?: number;
  inputs?: any[];
  outputs?: any[];
  properties?: Record<string, any>;
  widgets_values?: any[];
  title?: string;
}

export interface ComfyLink {
  // [id, origin_id, origin_slot, target_id, target_slot, type]
  0: number; // link_id
  1: number; // origin_id
  2: number; // origin_slot
  3: number; // target_id
  4: number; // target_slot
  5: string; // type
}

export interface ComfyGroup {
  title: string;
  bounding: [number, number, number, number]; // [x, y, w, h]
  color?: string;
  font_size?: number;
}

export interface ComfyWorkflow {
  last_node_id: number;
  last_link_id: number;
  nodes: ComfyNode[];
  links: ComfyLink[];
  groups?: ComfyGroup[];
  version?: number;
  extra?: any;
}

export interface MermaidConfig {
  Default_Graph_Direction?: string;
  Default_Connector?: string;
  Default_Node_Style?: string;
  Generate_ComfyUI_Subgraphs?: boolean;
  Style_Definitions?: Record<string, string>;
  Node_Group?: Array<{ group_name: string; nodes: string[] }>;
  Default_Node_Shape?: string;
  [key: string]: any;
}

// --- Constants ---
const CONTRAST_THRESHOLD = 4.5;
const DEFAULT_SHAPE_SYNTAX: [string, string] = ['[', ']'];

const MERMAID_SHAPE_SYNTAX: Record<string, [string, string]> = {
  rectangle: ['[', ']'],
  round: ['(', ')'],
  stadium: ['([', '])'],
  subroutine: ['[[', ']]'],
  cylinder: ['[(', ')]'],
  circle: ['((', '))'],
  rhombus: ['{', '}'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
  parallelogram: ['[/', '/]'],
  parallelogram_alt: ['[\\', '\\]'],
  trapezoid: ['[/', '\\]'],
  trapezoid_alt: ['[\\', '/]'],
  double_circle: ['(((', ')))'],
  database: ['[(', ')]'],
};

const LINK_LABEL_FORMATS: Record<string, string> = {
  "-->": "-- {} -->", "---": "-- {} ---", "-.->": "-. {} .->", "-.-": "-. {} .-",
  "==>": "== {} ==>", "===": "== {} ===", "--o": "-- {} --o", "o--": "o-- {} --",
  "o--o": "o-- {} --o", "--x": "-- {} --x", "x--": "x-- {} --", "x--x": "x-- {} --x",
  "<-->": "<-- {} -->", "<-.->": "<-. {} .->", "<==>": "<== {} ==>",
};

// --- Helpers ---

function getMermaidShapeSyntax(shapeName: string): [string, string] {
  return MERMAID_SHAPE_SYNTAX[shapeName.toLowerCase()] || DEFAULT_SHAPE_SYNTAX;
}

function parseColor(colorString: string): [number, number, number] | null {
  if (!colorString) return null;
  const str = colorString.trim().toLowerCase();

  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (!isNaN(r)) return [r, g, b];
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r)) return [r, g, b];
    }
  }

  // Basic colors fallback
  const basicColors: Record<string, [number, number, number]> = {
    "white": [255, 255, 255], "black": [0, 0, 0], "red": [255, 0, 0],
    "green": [0, 128, 0], "blue": [0, 0, 255], "yellow": [255, 255, 0],
    "cyan": [0, 255, 255], "magenta": [255, 0, 255],
    "gray": [128, 128, 128], "grey": [128, 128, 128]
  };

  return basicColors[str] || null;
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(v => {
    const val = v / 255.0;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

export function adjustTextColorForBackground(styleString: string): string {
  if (!styleString) return styleString;
  const parts = styleString.split(',').map(p => p.trim()).filter(Boolean);

  // Check if color is already explicitly set
  if (parts.some(p => p.toLowerCase().startsWith('color') || p.toLowerCase().startsWith('stroke'))) {
    // simplified check, effectively what python regex did
  }

  let fillColorValue = null;
  for (const part of parts) {
    if (part.toLowerCase().startsWith('fill:')) {
      fillColorValue = part.split(':', 2)[1]?.trim();
      break;
    }
  }

  if (!fillColorValue) return styleString;
  const bgRgb = parseColor(fillColorValue);
  if (!bgRgb) return styleString;

  // Assuming default text color is white for dark mode (implied by python script)
  const contrast = calculateContrastRatio(bgRgb, [255, 255, 255]);
  if (contrast < CONTRAST_THRESHOLD) {
    return styleString + ",color:#000";
  }
  return styleString;
}


// --- Main Conversion Logic ---

export function workflowToMermaid(workflow: ComfyWorkflow, config: MermaidConfig = {}): string {
  // Config defaults
  const graphDirection = config.Default_Graph_Direction || 'LR';
  const defaultConnector = config.Default_Connector || '-->';
  const defaultNodeShape = config.Default_Node_Shape || 'rectangle';

  // State maps
  const nodeIdToDisplayLabel: Record<number, string> = {};
  const nodeIdToType: Record<number, string> = {};
  const nodesInGroups = new Set<number>();

  // Pre-process nodes
  workflow.nodes.forEach(node => {
    const title = node.title || node.type || 'Unknown';
    nodeIdToDisplayLabel[node.id] = title;
    nodeIdToType[node.id] = node.type;
  });

  const mermaidLines: string[] = [];
  mermaidLines.push(`graph ${graphDirection}`);

  // 1. Process Groups (Subgraphs)
  if (workflow.groups) {
    workflow.groups.forEach((group, index) => {
      const [gx, gy, gw, gh] = group.bounding;
      const groupNodes: ComfyNode[] = [];

      workflow.nodes.forEach(node => {
        if (!node.pos) return;
        const [nx, ny] = node.pos;
        // Determine node center (approximate size if missing)
        const width = (node.size && (Array.isArray(node.size) ? node.size[0] : node.size["0"])) || 100;
        const height = (node.size && (Array.isArray(node.size) ? node.size[1] : node.size["1"])) || 50;
        const cx = nx + width / 2;
        const cy = ny + height / 2;

        // Check inclusion
        if (cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh) {
          groupNodes.push(node);
          nodesInGroups.add(node.id);
        }
      });

      if (groupNodes.length > 0) {
        const groupId = `G${index}`;
        const sanitizedTitle = group.title.replace(/"/g, '#quot;');

        mermaidLines.push(`    subgraph ${groupId} ["${sanitizedTitle}"]`);
        mermaidLines.push(`    direction ${graphDirection}`); // Groups usually flow same direction

        groupNodes.forEach(node => {
          const nodeId = `N${node.id}`;
          const label = nodeIdToDisplayLabel[node.id].replace(/"/g, '#quot;');
          const [open, close] = getMermaidShapeSyntax(defaultNodeShape);
          mermaidLines.push(`        ${nodeId}${open}"${label}"${close}`);
          // Force basic class
          mermaidLines.push(`        class ${nodeId} defaultNode`);
        });

        mermaidLines.push(`    end`);

        // Apply Group Style
        if (group.color) {
          let hex = group.color.toLowerCase();
          mermaidLines.push(`    style ${groupId} fill:${hex},stroke:${hex},color:#fff,stroke-width:2px,fill-opacity:0.6`);
        }
      }
    });
  }

  // 2. Process Ungrouped Nodes
  workflow.nodes.forEach(node => {
    if (!nodesInGroups.has(node.id)) {
      const nodeId = `N${node.id}`;
      const label = nodeIdToDisplayLabel[node.id].replace(/"/g, '#quot;');
      const [open, close] = getMermaidShapeSyntax(defaultNodeShape);
      mermaidLines.push(`    ${nodeId}${open}"${label}"${close}`);
      mermaidLines.push(`    class ${nodeId} defaultNode`);
    }
  });

  // 3. Process Links
  mermaidLines.push("    %% Connections");
  workflow.links.forEach((link) => {
    const startNodeId = `N${link[1]}`;
    const endNodeId = `N${link[3]}`;
    const connector = defaultConnector;
    const type = String(link[5] || '').toUpperCase();

    // Optional: filter out boring link types if needed

    let linkText = `    ${startNodeId} ${connector} ${endNodeId}`;
    if (type && config.Add_Link_Labels !== false) {
      const format = LINK_LABEL_FORMATS[connector] || "-- {} -->";
      const label = type.replace(/"/g, '#quot;');
      const connectorWithLabel = format.replace('{}', label);
      linkText = `    ${startNodeId} ${connectorWithLabel} ${endNodeId}`;
    }
    mermaidLines.push(linkText);
  });

  // 4. Global Styles
  // Dark theme aesthetic: Dark blocks, white text, subtle edges
  mermaidLines.push("    classDef defaultNode fill:#353535,stroke:#555,stroke-width:1px,color:#eee,rx:5,ry:5;");
  mermaidLines.push("    classDef default fill:#353535,stroke:#555,stroke-width:1px,color:#eee;");
  mermaidLines.push("    linkStyle default stroke:#777,stroke-width:1px,fill:none;");

  return mermaidLines.join('\n');
}
