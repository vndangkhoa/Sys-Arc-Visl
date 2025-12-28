
import { useState, useEffect } from 'react';
import { Lightbulb, MousePointer2, Keyboard, Layout } from 'lucide-react';

const TIPS = [
    {
        icon: MousePointer2,
        title: 'Select & Edit',
        text: 'Select any node to inspect its logic and edit metadata.'
    },
    {
        icon: Layout,
        title: 'Auto Layout',
        text: 'Use "Visual Organizer" to automatically arrange complex flows.'
    },
    {
        icon: Keyboard,
        title: 'Quick Actions',
        text: 'Press "K" to open the command palette for fast access.'
    },
    {
        icon: Lightbulb,
        title: 'Pro Tip',
        text: 'Shift + Drag to select multiple nodes at once.'
    }
];

export function SmartGuide() {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => {
            setIndex(prev => (prev + 1) % TIPS.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isPaused]);

    const Tip = TIPS[index];
    const Icon = Tip.icon;

    return (
        <div
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-500/10 shadow-sm relative overflow-hidden group cursor-pointer"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onClick={() => setIndex(prev => (prev + 1) % TIPS.length)}
        >
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 h-0.5 bg-blue-500/20 w-full">
                <div
                    key={index}
                    className="h-full bg-blue-500 transition-all duration-[5000ms] ease-linear w-full origin-left"
                    style={{ animation: isPaused ? 'none' : 'progress 5s linear' }}
                />
            </div>

            <div className="flex items-start gap-3 relative z-10">
                <div className="p-2 rounded-lg bg-white dark:bg-white/5 shadow-sm border border-blue-100 dark:border-white/5 shrink-0">
                    <Icon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            {Tip.title}
                        </span>
                        <div className="flex gap-0.5">
                            {TIPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 h-1 rounded-full transition-colors ${i === index ? 'bg-blue-500' : 'bg-blue-200 dark:bg-white/10'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                        {Tip.text}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Add animation keyframes to global styles via style tag if strictly needed,
// but often standard CSS transitions suffice. For the progress bar, specific keyframes
// are better added to index.css or tailored here.
