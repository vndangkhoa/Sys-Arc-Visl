/**
 * UI Store - Manages UI state and interactions
 */

import { create } from 'zustand';
import type { Node } from '../types';

interface UIState {
    // Panel states
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    focusMode: boolean;

    // Selection
    selectedNode: Node | null;

    // Filters
    activeFilters: string[];

    // Loading & Error states
    isLoading: boolean;
    error: string | null;

    // Actions
    setLeftPanelOpen: (open: boolean) => void;
    setRightPanelOpen: (open: boolean) => void;
    setFocusMode: (focusMode: boolean) => void;
    toggleFocusMode: () => void;

    setSelectedNode: (node: Node | null) => void;

    toggleFilter: (filterId: string) => void;
    setActiveFilters: (filters: string[]) => void;
    resetFilters: () => void;

    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

const DEFAULT_FILTERS = ['filter-client', 'filter-server', 'filter-db', 'filter-other'];

export const useUIStore = create<UIState>()((set, get) => ({
    // Initial state
    leftPanelOpen: true,
    rightPanelOpen: false,
    focusMode: false,
    selectedNode: null,
    activeFilters: DEFAULT_FILTERS,
    isLoading: false,
    error: null,

    // Panel actions
    setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
    setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
    setFocusMode: (focusMode) => set({ focusMode }),
    toggleFocusMode: () => set({ focusMode: !get().focusMode }),

    // Selection actions
    setSelectedNode: (selectedNode) => {
        set({ selectedNode, rightPanelOpen: selectedNode !== null });
    },

    // Filter actions
    toggleFilter: (filterId) => {
        const { activeFilters } = get();
        const isActive = activeFilters.includes(filterId);
        set({
            activeFilters: isActive
                ? activeFilters.filter((f) => f !== filterId)
                : [...activeFilters, filterId],
        });
    },

    setActiveFilters: (activeFilters) => set({ activeFilters }),

    resetFilters: () => set({ activeFilters: DEFAULT_FILTERS }),

    // Loading & Error actions
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
}));
