import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    padding = 'md',
    ...props
}) => {
    const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
    };

    return (
        <div
            className={`bg-white dark:bg-black/20 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/10 shadow-sm ${paddings[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};
