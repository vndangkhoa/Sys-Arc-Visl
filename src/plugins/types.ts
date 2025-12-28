// Basic types needed for plugins


export interface ToolbarItem {
    id: string;
    label: string;
    icon: any; // Lucide icon component
    onClick: () => void;
    position?: 'left' | 'center' | 'right'; // Default 'right' (actions)
    tooltip?: string;
}

export interface PluginContext {
    registerToolbarItem: (item: ToolbarItem) => void;
    // Future extensions:
    // registerSidebarTab: (tab: SidebarTab) => void;
    // registerNodeAction: (action: NodeAction) => void;
}

export interface Plugin {
    id: string;
    name: string;
    version: string;
    init: (context: PluginContext) => void;
    cleanup?: () => void;
}
