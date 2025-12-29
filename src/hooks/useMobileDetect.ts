import { useState, useEffect, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768;

interface MobileDetectResult {
    isMobile: boolean;
    isTouchDevice: boolean;
    prefersReducedMotion: boolean;
    viewportWidth: number;
    viewportHeight: number;
}

/**
 * Hook for detecting mobile devices and touch capabilities.
 * Provides reactive updates on viewport changes.
 */
export function useMobileDetect(): MobileDetectResult {
    const [state, setState] = useState<MobileDetectResult>(() => ({
        isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
        isTouchDevice: typeof window !== 'undefined' ? 'ontouchstart' in window || navigator.maxTouchPoints > 0 : false,
        prefersReducedMotion: typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false,
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
        viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
    }));

    const handleResize = useCallback(() => {
        setState(prev => {
            const newIsMobile = window.innerWidth < MOBILE_BREAKPOINT;
            // Only update if values changed to prevent unnecessary re-renders
            if (
                prev.isMobile === newIsMobile &&
                prev.viewportWidth === window.innerWidth &&
                prev.viewportHeight === window.innerHeight
            ) {
                return prev;
            }
            return {
                ...prev,
                isMobile: newIsMobile,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
            };
        });
    }, []);

    useEffect(() => {
        // Use visualViewport for better mobile keyboard handling
        const viewport = window.visualViewport;

        const handleViewportResize = () => {
            setState(prev => ({
                ...prev,
                viewportHeight: viewport?.height || window.innerHeight,
            }));
        };

        window.addEventListener('resize', handleResize);
        viewport?.addEventListener('resize', handleViewportResize);

        // Check reduced motion preference changes
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleMotionChange = (e: MediaQueryListEvent) => {
            setState(prev => ({ ...prev, prefersReducedMotion: e.matches }));
        };
        motionQuery.addEventListener('change', handleMotionChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            viewport?.removeEventListener('resize', handleViewportResize);
            motionQuery.removeEventListener('change', handleMotionChange);
        };
    }, [handleResize]);

    return state;
}

/**
 * Utility function for one-time mobile check (non-reactive).
 * Use in store initialization or outside React components.
 */
export function checkIsMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT || 'ontouchstart' in window;
}

export { MOBILE_BREAKPOINT };
