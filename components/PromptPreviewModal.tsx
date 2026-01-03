
import React, { useState } from 'react';
import { X, Copy, Check, Eye, ImageIcon, Terminal, Zap } from 'lucide-react';
import { PromptData } from '../types';

interface PromptPreviewModalProps {
    data: PromptData;
    onClose: () => void;
    title?: string;
}

const PromptPreviewModal: React.FC<PromptPreviewModalProps> = ({ data, onClose, title = "Neural Prompt Preview" }) => {
    const [copied, setCopied] = useState(false);
    const [fullImage, setFullImage] = useState<string | null>(null);

    const handleCopy = () => {
        navigator.clipboard.writeText(data.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyImage = async (b64: string) => {
        try {
            const res = await fetch(b64);
            const blob = await res.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            alert("Image copied to clipboard! You can now paste it into Gemini.");
        } catch (e) {
            console.error("Copy failed", e);
            alert("Failed to copy image. Browser might not support this.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-5xl max-h-[90vh] bg-[#0f172a] border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">

                {/* HEADER */}
                <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <Terminal size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">{title}</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspect the raw指令 provided to Gemini</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-transparent hover:border-slate-700"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                        {/* PROMPT TEXT */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Zap size={14} className="text-indigo-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instruction Set</span>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${copied ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY RAW PROMPT'}</span>
                                </button>
                            </div>

                            <div className="relative group">
                                <pre className="w-full p-6 bg-black/40 border border-slate-800 rounded-3xl text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-words h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                                    {data.text}
                                </pre>
                                <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-100 transition-opacity">
                                    <Terminal className="text-slate-600" size={40} />
                                </div>
                            </div>
                        </div>

                        {/* ATTACHED IMAGES */}
                        <div className="lg:col-span-4 space-y-4">
                            <div className="flex items-center space-x-2">
                                <ImageIcon size={14} className="text-pink-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attached Visuals ({data.images.length})</span>
                            </div>

                            <div className="grid grid-cols-1 gap-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                                {data.images.length > 0 ? (
                                    data.images.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black/40 group cursor-pointer"
                                            onClick={() => setFullImage(img)}
                                        >
                                            <img src={img} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" alt={`Attached ${idx + 1}`} />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                                <div className="p-3 rounded-full bg-white/10 border border-white/20">
                                                    <Eye size={20} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 text-[8px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest text-white/50">
                                                Image {idx + 1}
                                            </div>
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyImage(img);
                                                    }}
                                                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md transition-all"
                                                    title="Copy Image to Clipboard"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 border border-slate-800 border-dashed rounded-2xl opacity-20">
                                        <ImageIcon size={32} className="mb-2" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">No images attached</span>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-8 py-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] text-center max-w-md">
                        This preview shows the exact data payload transmitted to the Gemini Studio API.
                        Values shown here are the final instructions before neural processing.
                    </p>
                </div>
            </div>

            {/* FULL IMAGE PREVIEW */}
            {fullImage && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/95 animate-in fade-in duration-300">
                    <button onClick={() => setFullImage(null)} className="absolute top-8 right-8 p-4 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10">
                        <X size={32} />
                    </button>
                    <img src={fullImage} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/10" alt="Full Preview" />
                </div>
            )}
        </div>
    );
};

export default PromptPreviewModal;
