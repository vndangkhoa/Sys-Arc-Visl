import { create } from 'zustand';
import type { Plugin, PluginContext, ToolbarItem } from '../plugins/types';

interface PluginState {
    plugins: Record<string, Plugin>;
    toolbarItems: ToolbarItem[];

    // Actions
    registerPlugin: (plugin: Plugin) => void;
    unregisterPlugin: (pluginId: string) => void;

    // Internal API for Plugins
    _registerToolbarItem: (item: ToolbarItem) => void;
}

export const usePluginStore = create<PluginState>((set, get) => ({
    plugins: {},
    toolbarItems: [],

    registerPlugin: (plugin) => {
        if (get().plugins[plugin.id]) {
            console.warn(`Plugin ${plugin.id} is already registered.`);
            return;
        }

        // Create Context
        const context: PluginContext = {
            registerToolbarItem: (item) => get()._registerToolbarItem(item),
        };

        // Init Plugin
        try {
            plugin.init(context);
            set((state) => ({
                plugins: { ...state.plugins, [plugin.id]: plugin }
            }));
            console.log(`Plugin ${plugin.name} loaded.`);
        } catch (e) {
            console.error(`Failed to initialize plugin ${plugin.id}:`, e);
        }
    },

    unregisterPlugin: (pluginId) => {
        const plugin = get().plugins[pluginId];
        if (!plugin) return;

        if (plugin.cleanup) plugin.cleanup();

        set((state) => {
            const { [pluginId]: removed, ...rest } = state.plugins;
            // Note: complex cleanup of UI items registered by this plugin would ideally happen here.
            // For MVP, we might just clear all or need items to be tagged with pluginId.
            // Improvement: ToolbarItem should have pluginId.
            return { plugins: rest };
        });
    },

    _registerToolbarItem: (item) => {
        set((state) => ({
            toolbarItems: [...state.toolbarItems, item]
        }));
    }
}));
