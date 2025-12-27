/**
 * Spinner component for loading states
 */

import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    label?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
    return (
        <div className={clsx('flex items-center justify-center gap-2', className)}>
            <Loader2
                className={clsx('animate-spin text-blue-500', sizeClasses[size])}
                aria-hidden="true"
            />
            {label && (
                <span className="text-sm text-secondary">{label}</span>
            )}
            <span className="sr-only">{label || 'Loading...'}</span>
        </div>
    );
}

/**
 * Full-page loading overlay
 */
export function LoadingOverlay({ label }: { label?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 p-8 rounded-2xl glass-panel">
                <Spinner size="lg" />
                {label && (
                    <p className="text-sm font-medium text-secondary">{label}</p>
                )}
            </div>
        </div>
    );
}
