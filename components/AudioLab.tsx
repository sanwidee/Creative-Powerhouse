import React, { useState } from 'react';
import { Mic, Play, Square, Save, ArrowLeft, Volume2, Settings, Sparkles, Loader2, FileAudio, Trash2 } from 'lucide-react';
import { AudioDNA, AudioReference } from '../types';
import { generateAudio } from '../services/geminiService';

interface AudioLabProps {
    onSave: (audio: AudioReference) => void;
    onBack: () => void;
    savedVoices: AudioReference[];
    onDelete: (id: string) => void;
}

const AudioLab: React.FC<AudioLabProps> = ({ onSave, onBack, savedVoices, onDelete }) => {
    const [dna, setDna] = useState<AudioDNA>({
        voice_id: Date.now().toString(),
        name: 'New Voice',
        gender: 'neutral',
        tone: 'Professional and calm',
        age: 'Adult',
        accent: 'American (Standard)',
        style_prompt: 'A clear, trustworthy narrator voice suitable for corporate presentations.'
    });

    const [testText, setTestText] = useState("Welcome to Sunweed. Setting the new standard for creative production.");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    const handleGeneratePreview = async () => {
        setLoading(true);
        setAudioUrl(null);
        try {
            const { audioData } = await generateAudio(testText, dna);
            setAudioUrl(audioData);
        } catch (err: any) {
            console.error(err);
            alert("Audio generation failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = () => {
        if (!audioUrl) return;
        if (isPlaying && audioElement) {
            audioElement.pause();
            setIsPlaying(false);
        } else {
            const audio = new Audio(audioUrl);
            audio.onended = () => setIsPlaying(false);
            audio.play();
            setAudioElement(audio);
            setIsPlaying(true);
        }
    };

    const handleSaveVoice = () => {
        onSave({
            id: dna.voice_id,
            name: dna.name,
            dna: { ...dna },
            createdAt: Date.now()
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Audio Lab</h2>
                        <p className="text-slate-400">Synthesize Voice DNA for your brand.</p>
                    </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Voice Engine</span>
                    <span className="text-xs font-bold text-green-400">GEMINI AUDIO</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: VOICE DESIGNER */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/40 shadow-xl space-y-6">
                        <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase tracking-widest text-xs mb-2">
                            <Settings size={14} />
                            <span>Voice Parameters</span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voice Name</label>
                                <input
                                    type="text"
                                    value={dna.name}
                                    onChange={(e) => setDna({ ...dna, name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="e.g. Corporate Narrator"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gender</label>
                                    <select
                                        value={dna.gender}
                                        onChange={(e) => setDna({ ...dna, gender: e.target.value as any })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="neutral">Neutral</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Age Group</label>
                                    <select
                                        value={dna.age}
                                        onChange={(e) => setDna({ ...dna, age: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="Young Adult">Young Adult</option>
                                        <option value="Adult">Adult</option>
                                        <option value="Senior">Senior</option>
                                        <option value="Child">Child</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tone & Personality</label>
                                <input
                                    type="text"
                                    value={dna.tone}
                                    onChange={(e) => setDna({ ...dna, tone: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="e.g. Deep, authoritative, warm..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Accent</label>
                                <input
                                    type="text"
                                    value={dna.accent}
                                    onChange={(e) => setDna({ ...dna, accent: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="e.g. British (RP), American (Southern)"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">DNA Prompt (Auto-Generated)</label>
                                <textarea
                                    value={dna.style_prompt}
                                    onChange={(e) => setDna({ ...dna, style_prompt: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px]"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveVoice}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center space-x-2"
                        >
                            <Save size={18} />
                            <span>Save Voice DNA</span>
                        </button>
                    </div>
                </div>

                {/* RIGHT: PREVIEW & LIBRARY */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 h-[300px] flex flex-col justify-center items-center relative overflow-hidden group">
                        {loading ? (
                            <div className="text-center">
                                <Loader2 className="animate-spin w-16 h-16 text-indigo-400 mx-auto mb-4" />
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest animate-pulse">Synthesizing Waveform...</p>
                            </div>
                        ) : audioUrl ? (
                            <div className="text-center animate-in zoom-in-95">
                                <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform" onClick={handlePlay}>
                                    {isPlaying ? <Square size={32} className="text-white fill-white" /> : <Play size={32} className="text-white fill-white ml-2" />}
                                </div>
                                <p className="text-indigo-300 font-bold mb-2">Preview Ready</p>
                                <p className="text-indigo-400/50 text-xs font-mono">00:04 / 00:12</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-30">
                                <Mic size={64} className="mx-auto mb-4" />
                                <p className="font-bold text-xl uppercase tracking-widest">Ready to Speak</p>
                            </div>
                        )}

                        <div className="absolute bottom-0 inset-x-0 p-6 bg-indigo-950/50 backdrop-blur-sm border-t border-indigo-500/10">
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={testText}
                                    onChange={(e) => setTestText(e.target.value)}
                                    className="flex-1 bg-slate-900/50 border border-indigo-500/20 rounded-xl px-4 py-3 text-sm focus:outline-none"
                                    placeholder="Enter text to speak..."
                                />
                                <button
                                    onClick={handleGeneratePreview}
                                    disabled={loading}
                                    className="bg-white text-indigo-600 px-6 rounded-xl font-bold flex items-center space-x-2 hover:bg-indigo-50 transition-colors"
                                >
                                    <Volume2 size={18} />
                                    <span>Speak</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                            <FileAudio size={20} className="text-slate-500" />
                            <span>Saved Voices</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {savedVoices.map(voice => (
                                <div key={voice.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => setDna(voice.dna)}>
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                            <Volume2 size={16} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-slate-200">{voice.name}</h4>
                                            <span className="text-[10px] text-slate-500 uppercase font-bold">{voice.dna.gender} • {voice.dna.age}</span>
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(voice.id); }} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {savedVoices.length === 0 && (
                                <div className="col-span-full py-8 text-center text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
                                    No voices saved yet. Design one above.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioLab;
