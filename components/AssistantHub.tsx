
import React, { useState } from 'react';
import { Bot, X, ExternalLink, MessageSquare, Sparkles, Zap, ChevronRight, Monitor, Command } from 'lucide-react';

const AssistantHub: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const openTool = (url: string, name: string) => {
        // Open in a sized popup to simulate a side panel
        const width = 500;
        const height = window.screen.height - 100;
        const left = window.screen.width - width;
        const top = 50;

        window.open(
            url,
            name,
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,menubar=no,toolbar=no`
        );
        setIsOpen(false);
    };

    const tools = [
        {
            name: 'ChatGPT',
            url: 'https://chatgpt.com',
            icon: <MessageSquare size={18} className="text-emerald-400" />,
            desc: 'GPT-4o & Canvas Mode',
            color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        },
        {
            name: 'Gemini',
            url: 'https://gemini.google.com',
            icon: <Sparkles size={18} className="text-blue-400" />,
            desc: 'Google Gemini Advanced',
            color: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        },
        {
            name: 'Claude',
            url: 'https://claude.ai',
            icon: <Bot size={18} className="text-orange-400" />,
            desc: 'Claude 3.5 Sonnet',
            color: 'bg-orange-500/10 border-orange-500/20 text-orange-400'
        },
        {
            name: 'Perplexity',
            url: 'https://www.perplexity.ai',
            icon: <Zap size={18} className="text-cyan-400" />,
            desc: 'AI Search & Research',
            color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
        }
    ];

    return (
        <>
            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-8 right-8 z-[200] p-4 rounded-full shadow-2xl shadow-blue-500/20 transition-all duration-500 hover:scale-110 active:scale-95 border group ${isOpen
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-blue-600 border-blue-500 text-white animate-bounce-slow'
                    }`}
            >
                {isOpen ? <X size={24} /> : (
                    <div className="relative">
                        <Bot size={24} />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-600 animate-pulse" />
                    </div>
                )}
            </button>

            {/* Overlay Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[190] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-sm z-[195] bg-[#020617]/90 backdrop-blur-2xl border-l border-slate-800 shadow-2xl transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                <div className="flex flex-col h-full p-8">
                    <header className="mb-10">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <Command size={20} className="text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight text-white italic uppercase tracking-widest">Assistant Hub</h2>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Launch your AI companions in side-windows to maintain character consistency and design guidance without switching tabs.
                        </p>
                    </header>

                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                        {tools.map((tool) => (
                            <div
                                key={tool.name}
                                onClick={() => openTool(tool.url, tool.name)}
                                className="group p-5 rounded-2xl border border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center space-x-4">
                                        <div className={`p-3 rounded-xl border ${tool.color}`}>
                                            {tool.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-200 text-sm">{tool.name}</h3>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{tool.desc}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                </div>
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink size={10} className="text-slate-600" />
                                </div>
                            </div>
                        ))}

                        <div className="mt-8 p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30">
                            <div className="flex items-center space-x-2 mb-3">
                                <Monitor size={14} className="text-slate-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pro Tip</span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic leading-relaxed">
                                Snap the new window to the side of your monitor for a split-screen experience. No more tab switching!
                            </p>
                        </div>
                    </div>

                    <footer className="mt-auto pt-8 border-t border-slate-800">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            <span>Companion Logic v2.0</span>
                            <span className="text-blue-500/50">Status: Ready</span>
                        </div>
                    </footer>
                </div>
            </div>

            <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
      `}</style>
        </>
    );
};

export default AssistantHub;
