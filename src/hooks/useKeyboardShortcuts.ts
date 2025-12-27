/**
 * Custom hook for keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description?: string;
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(
    shortcuts: ShortcutConfig[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true } = options;

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Ignore shortcuts when typing in input fields
            const target = event.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            for (const shortcut of shortcuts) {
                const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
                const ctrlMatch = ctrlOrMeta ? event.ctrlKey || event.metaKey : true;
                const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = shortcut.alt ? event.altKey : !event.altKey;
                const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

                if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    event.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        },
        [shortcuts, enabled]
    );

    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown, enabled]);
}

/**
 * Get the display string for a shortcut
 */
export function getShortcutDisplay(shortcut: ShortcutConfig): string {
    const parts: string[] = [];
    const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

    if (shortcut.ctrl || shortcut.meta) {
        parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.shift) {
        parts.push(isMac ? '⇧' : 'Shift');
    }
    if (shortcut.alt) {
        parts.push(isMac ? '⌥' : 'Alt');
    }
    parts.push(shortcut.key.toUpperCase());

    return parts.join(isMac ? '' : '+');
}
