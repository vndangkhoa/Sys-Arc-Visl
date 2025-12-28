/**
 * Settings Store - Manages AI configuration and app settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIMode, OnlineProvider, Theme } from '../types';
import { checkIsMobile } from '../hooks/useMobileDetect';

interface SettingsState {
    // AI Configuration
    aiMode: AIMode;
    onlineProvider: OnlineProvider;
    apiKey: string;
    ollamaUrl: string;
    modelName: string;

    // Theme
    theme: Theme;

    // Actions
    setAiMode: (mode: AIMode) => void;
    setOnlineProvider: (provider: OnlineProvider) => void;
    setApiKey: (key: string) => void;
    setOllamaUrl: (url: string) => void;
    setModelName: (name: string) => void;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;

    // Reset
    resetSettings: () => void;
}

const getInitialTheme = (): Theme => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('flowgen_theme');
        if (stored === 'light' || stored === 'dark') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
};

// Check if we're on a mobile device for initial AI mode
const getInitialAiMode = (): AIMode => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('flowgen_ai_mode') as AIMode | null;
        if (stored) return stored;
        // Default to online (cloud) on mobile for better performance
        if (checkIsMobile()) return 'online';
    }
    return 'offline';
};

const initialSettings = {
    aiMode: getInitialAiMode(),
    onlineProvider: 'openai' as OnlineProvider,
    apiKey: '',
    ollamaUrl: typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? window.location.origin
        : 'http://localhost:11434',
    modelName: 'llama3.2-vision',
    theme: getInitialTheme(),
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            ...initialSettings,

            setAiMode: (aiMode) => {
                localStorage.setItem('flowgen_ai_mode', aiMode);
                set({ aiMode });
            },

            setOnlineProvider: (onlineProvider) => {
                localStorage.setItem('flowgen_online_provider', onlineProvider);
                set({ onlineProvider });
            },

            setApiKey: (apiKey) => {
                localStorage.setItem('flowgen_api_key', apiKey);
                set({ apiKey });
            },

            setOllamaUrl: (ollamaUrl) => {
                localStorage.setItem('flowgen_ollama_url', ollamaUrl);
                set({ ollamaUrl });
            },

            setModelName: (modelName) => {
                localStorage.setItem('flowgen_model_name', modelName);
                set({ modelName });
            },

            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark';
                document.documentElement.classList.toggle('dark', newTheme === 'dark');
                localStorage.setItem('flowgen_theme', newTheme);
                set({ theme: newTheme });
            },

            setTheme: (theme) => {
                document.documentElement.classList.toggle('dark', theme === 'dark');
                localStorage.setItem('flowgen_theme', theme);
                set({ theme });
            },

            resetSettings: () => set(initialSettings),
        }),
        {
            name: 'flowgen-settings-storage',
            partialize: (state) => ({
                aiMode: state.aiMode,
                onlineProvider: state.onlineProvider,
                apiKey: state.apiKey,
                ollamaUrl: state.ollamaUrl,
                modelName: state.modelName,
                theme: state.theme,
            }),
            onRehydrateStorage: () => (state) => {
                // Apply theme on rehydration
                if (state?.theme) {
                    document.documentElement.classList.toggle('dark', state.theme === 'dark');
                }
            },
        }
    )
);
