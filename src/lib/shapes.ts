// SVG Paths for Mermaid Shapes
// Based on Mermaid v11.3.0+ syntax
// Syntax: node@{ shape: shapeName }

export interface ShapeDefinition {
    id: string;
    label: string;
    path: string;
    category: 'basic' | 'logic' | 'data' | 'other';
}

export const SHAPE_PATHS: Record<string, string> = {
    // Basic
    rect: 'M0 4 h100 v60 h-100 z',
    rounded: 'M10 4 h80 a10 10 0 0 1 10 10 v40 a10 10 0 0 1 -10 10 h-80 a10 10 0 0 1 -10 -10 v-40 a10 10 0 0 1 10 -10 z',
    stadium: 'M20 4 h60 a20 20 0 0 1 20 20 v20 a20 20 0 0 1 -20 20 h-60 a20 20 0 0 1 -20 -20 v-20 a20 20 0 0 1 20 -20 z',
    subroutine: 'M10 4 h80 v60 h-80 z M20 4 v60 M80 4 v60',
    cyl: 'M0 14 a50 10 0 0 1 100 0 v40 a50 10 0 0 1 -100 0 z M0 14 a50 10 0 0 1 100 0',
    cylinder: 'M0 14 a50 10 0 0 1 100 0 v40 a50 10 0 0 1 -100 0 z M0 14 a50 10 0 0 1 100 0',

    // Logic
    diamond: 'M50 0 L100 50 L50 100 L0 50 Z',
    rhombus: 'M50 0 L100 50 L50 100 L0 50 Z',
    decision: 'M50 0 L100 50 L50 100 L0 50 Z',
    hexagon: 'M15 4 L85 4 L100 34 L85 64 L15 64 L0 34 Z',
    parallelogram: 'M15 4 h85 l-15 60 h-85 z',
    trapezoid: 'M15 4 h70 l15 60 h-100 z',

    // Documents/Data
    doc: 'M0 0 h80 l20 20 v80 h-100 z M80 0 v20 h20',
    document: 'M10 4 h80 v45 q0 15 -15 15 h-60 q-15 0 -15 -15 v-45 z M10 4 h80 v45 q-10 10 -40 10 q -30 0 -40 -10',

    // Cloud (Approximation)
    cloud: 'M20 50 a20 20 0 0 1 20 -30 a25 25 0 0 1 40 10 a20 20 0 0 1 15 35 h-70 z',

    // Circles
    circle: 'M50 4 a30 30 0 0 1 0 60 a30 30 0 0 1 0 -60',
    doublecircle: 'M50 4 a30 30 0 0 1 0 60 a30 30 0 0 1 0 -60 M50 9 a25 25 0 0 1 0 50 a25 25 0 0 1 0 -50',

    // New additions based on research
    note: 'M10 4 h80 v60 h-80 z M70 4 v20 h20', // rough note
    summary: 'M50 4 a30 30 0 0 1 0 60 a30 30 0 0 1 0 -60 M30 24 l40 40 M30 64 l40 -40', // Crossed circle
};

export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
    { id: 'rect', label: 'Rectangle', path: SHAPE_PATHS.rect, category: 'basic' },
    { id: 'rounded', label: 'Rounded', path: SHAPE_PATHS.rounded, category: 'basic' },
    { id: 'stadium', label: 'Terminal', path: SHAPE_PATHS.stadium, category: 'basic' },
    { id: 'subroutine', label: 'Subroutine', path: SHAPE_PATHS.subroutine, category: 'basic' },
    { id: 'circle', label: 'Circle', path: SHAPE_PATHS.circle, category: 'basic' },

    { id: 'diamond', label: 'Decision', path: SHAPE_PATHS.diamond, category: 'logic' },
    { id: 'hexagon', label: 'Prepare', path: SHAPE_PATHS.hexagon, category: 'logic' },
    { id: 'parallelogram', label: 'Input/Output', path: SHAPE_PATHS.parallelogram, category: 'logic' },

    { id: 'cyl', label: 'Database', path: SHAPE_PATHS.cyl, category: 'data' },
    { id: 'doc', label: 'Document', path: SHAPE_PATHS.doc, category: 'data' },
    { id: 'cloud', label: 'Cloud', path: SHAPE_PATHS.cloud, category: 'data' },

    { id: 'note', label: 'Note', path: SHAPE_PATHS.note, category: 'other' },
];
