/**
 * Error message components
 */

import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { clsx } from 'clsx';

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
    variant?: 'inline' | 'toast' | 'banner';
}

export function ErrorMessage({
    message,
    onRetry,
    onDismiss,
    className,
    variant = 'inline',
}: ErrorMessageProps) {
    const variantClasses = {
        inline: 'p-4 rounded-xl',
        toast: 'p-4 rounded-xl shadow-2xl',
        banner: 'p-3 rounded-none',
    };

    return (
        <div
            className={clsx(
                'flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400',
                variantClasses[variant],
                className
            )}
            role="alert"
        >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{message}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Retry"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                )}
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Empty state component
 */
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center text-center p-8',
                className
            )}
        >
            {icon && (
                <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-primary mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-secondary max-w-sm">{description}</p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 btn-primary text-sm"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
