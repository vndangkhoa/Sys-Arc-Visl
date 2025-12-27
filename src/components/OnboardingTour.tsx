import { useState, useEffect } from 'react';

export default function OnboardingTour() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const STEPS = [
        {
            step: 1,
            title: "Visualize Instantly",
            description: "Upload your existing architecture diagrams or paste a text description to begin analysis. Our system automatically parses the input to generate editable nodes.",
            features: ["Supports PNG, JPG, PDF", "Natural Language Input"],
            icon: "cloud_upload",
            color: "primary", // blue-500
            badges: [
                { icon: "code", label: "Code", color: "text-emerald-400" },
                { icon: "image", label: "PNG", color: "text-amber-400" }
            ]
        },
        {
            step: 2,
            title: "Interactive Editing",
            description: "Double-click any node to edit its properties. Drag to reconnect, and use the intelligent layout engine to organize your system flow automatically.",
            features: ["Smart Auto-Layout", "Real-time Validation"],
            icon: "edit_square",
            color: "accent-purple",
            badges: [
                { icon: "auto_fix_high", label: "Auto", color: "text-purple-400" }
            ]
        },
        {
            step: 3,
            title: "Deep Dive Analysis",
            description: "Click on any component to see AI-generated insights, including technology stack recommendations, potential bottlenecks, and security considerations.",
            features: ["Tech Stack Inference", "Security Scanning"],
            icon: "analytics",
            color: "accent-teal",
            badges: [
                { icon: "psychology", label: "AI", color: "text-teal-400" }
            ]
        },
        {
            step: 4,
            title: "Export & Share",
            description: "Export your verified architecture as a PNG image, Mermaid code, or even a clean React component code to use directly in your documentation.",
            features: ["Mermaid / JSON", "React Component"],
            icon: "ios_share",
            color: "accent-blue",
            badges: [
                { icon: "download", label: "Export", color: "text-blue-400" }
            ]
        }
    ];

    useEffect(() => {
        const seen = localStorage.getItem('sysvis_onboarding_seen');
        if (!seen) {
            const timer = setTimeout(() => setIsOpen(true), 1000); // Delay for effect
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('sysvis_onboarding_seen', 'true');
    };

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    if (!isOpen) return null;

    const step = STEPS[currentStep];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
            {/* Modal Card Container */}
            <div className="w-full max-w-[960px] bg-surface-dark rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-border-dark flex flex-col md:flex-row overflow-hidden max-h-[90vh]">

                {/* Left Side: Visual/Illustration Area */}
                <div className="w-full md:w-5/12 bg-gradient-to-br from-[#161821] to-[#0e0f14] relative flex items-center justify-center p-8 md:p-12 min-h-[300px] md:min-h-full border-b md:border-b-0 md:border-r border-border-dark group overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute inset-0 bg-grid-pattern opacity-5 mix-blend-overlay"></div>
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-${step.color}/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 transition-colors duration-500`}></div>

                    {/* Main Illustration */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="relative">
                            {/* Ripple Effects with dynamic color */}
                            <div className={`absolute inset-0 bg-${step.color}/20 rounded-full scale-150 animate-pulse transition-colors duration-500`}></div>
                            <div className={`absolute inset-0 bg-${step.color}/10 rounded-full scale-[2] animate-[pulse_2s_ease-in-out_infinite_0.5s] transition-colors duration-500`}></div>

                            {/* Icon Circle */}
                            <div className={`size-24 rounded-full bg-gradient-to-tr from-${step.color} to-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(43,75,238,0.4)] relative z-10 transition-colors duration-500`}>
                                <span className="material-icons-round text-white text-5xl">{step.icon}</span>
                            </div>

                            {/* Floating Badges */}
                            {step.badges.map((badge, idx) => (
                                <div key={idx} className={`absolute ${idx === 0 ? '-right-8 -top-4' : '-left-8 -bottom-4'} bg-surface-dark border border-border-dark px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 animate-[bounce_3s_infinite_${idx * 0.5}s]`}>
                                    <span className={`material-icons-round ${badge.color} text-sm`}>{badge.icon}</span>
                                    <span className="text-xs font-bold text-gray-200">{badge.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Content & Controls */}
                <div className="w-full md:w-7/12 flex flex-col justify-between p-6 md:p-10 md:py-12 bg-surface-dark">
                    {/* Header (Skip) */}
                    <div className="flex justify-between items-start mb-6">
                        {/* Progress Indicators */}
                        <div className="flex gap-2 items-center">
                            {STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setCurrentStep(idx)}
                                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${idx === currentStep ? 'w-8 bg-primary' : 'w-2 bg-[#3b3f54] hover:bg-white/20'}`}
                                ></div>
                            ))}
                        </div>
                        <button onClick={handleClose} className="text-text-secondary hover:text-white text-sm font-bold flex items-center gap-1 transition-colors">
                            Skip
                            <span className="material-icons-round text-lg">close</span>
                        </button>
                    </div>

                    {/* Main Text Content */}
                    <div className="flex flex-col gap-4 mb-8">
                        <div className="inline-flex items-center gap-2 self-start bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                            <span className="text-primary text-xs font-bold uppercase tracking-wider">Step {currentStep + 1} of {STEPS.length}</span>
                        </div>
                        <h1 className="text-3xl md:text-3xl font-bold text-white leading-tight font-display">{step.title}</h1>
                        <p className="text-lg text-text-secondary leading-relaxed max-w-md font-sans">
                            {step.description}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2">
                            {step.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-[#9da1b9]">
                                    <span className="material-icons-round text-primary text-base">check_circle</span>
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-border-dark mt-auto">
                        <button
                            onClick={handleBack}
                            className={`text-text-secondary hover:text-white font-medium text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5 transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : ''}`}
                        >
                            <span className="material-icons-round text-lg">arrow_back</span>
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary hover:bg-blue-600 transition-colors text-white text-base font-bold leading-normal tracking-[0.015em] shadow-[0_4px_14px_rgba(43,75,238,0.4)] hover:shadow-[0_6px_20px_rgba(43,75,238,0.6)] hover:-translate-y-0.5 transform"
                        >
                            <span className="mr-2">{currentStep === STEPS.length - 1 ? 'Get Started' : 'Next Step'}</span>
                            <span className="material-icons-round text-lg">{currentStep === STEPS.length - 1 ? 'rocket_launch' : 'arrow_forward'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
