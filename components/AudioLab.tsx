
import React, { useState, useEffect } from 'react';
import { Mic, Play, Square, Save, ArrowLeft, Volume2, Settings, Sparkles, Loader2, FileAudio, Trash2, Upload, Download, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { AudioDNA, AudioReference } from '../types';
import { generateAudio } from '../services/geminiService';
import { VoiceDNA, checkVoiceServerHealth, extractVoiceDNA, generateClonedSpeech, listVoiceDNA, deleteVoiceDNA, exportVoiceDNA } from '../services/voiceService';
import MicRecorder from './MicRecorder';

interface AudioLabProps {
    onSave: (audio: AudioReference) => void;
    onBack: () => void;
    savedVoices: AudioReference[];
    onDelete: (id: string) => void;
}

type VoiceMode = 'clone' | 'style';

const AudioLab: React.FC<AudioLabProps> = ({ onSave, onBack, savedVoices, onDelete }) => {
    const [mode, setMode] = useState<VoiceMode>('clone');

    // Clone Voice State
    const [voiceDNAs, setVoiceDNAs] = useState<VoiceDNA[]>([]);
    const [selectedVoiceDNA, setSelectedVoiceDNA] = useState<VoiceDNA | null>(null);
    const [voiceName, setVoiceName] = useState('My Voice');
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractStatus, setExtractStatus] = useState<string>('');
    const [serverOnline, setServerOnline] = useState<boolean | null>(null);

    // Style Voice State (existing)
    const [dna, setDna] = useState<AudioDNA>({
        voice_id: Date.now().toString(),
        name: 'New Voice',
        gender: 'neutral',
        tone: 'Professional and calm',
        age: 'Adult',
        accent: 'American (Standard)',
        style_prompt: 'A clear, trustworthy narrator voice suitable for corporate presentations.'
    });

    // Shared State
    const [testText, setTestText] = useState("Welcome to Creative Powerhouse. Setting the new standard for creative production.");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    // Check voice server status on mount
    useEffect(() => {
        checkServerHealth();
        loadVoiceDNAs();
    }, []);

    const checkServerHealth = async () => {
        try {
            const health = await checkVoiceServerHealth();
            setServerOnline(health.status === 'ok');
        } catch {
            setServerOnline(false);
        }
    };

    const loadVoiceDNAs = async () => {
        try {
            const voices = await listVoiceDNA();
            setVoiceDNAs(voices);
        } catch (err) {
            console.error('Failed to load Voice DNAs:', err);
        }
    };

    const handleRecordingComplete = async (blob: Blob) => {
        setIsExtracting(true);
        setExtractStatus('Uploading audio...');

        try {
            const voiceDNA = await extractVoiceDNA(blob, voiceName, setExtractStatus);
            setVoiceDNAs(prev => [voiceDNA, ...prev]);
            setSelectedVoiceDNA(voiceDNA);
            setExtractStatus('Voice DNA extracted successfully!');

            // Save to library
            onSave({
                id: voiceDNA.id,
                name: voiceDNA.name,
                type: 'clone',
                voiceDna: voiceDNA,
                createdAt: voiceDNA.created_at
            });
        } catch (err: any) {
            setExtractStatus(`Error: ${err.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        setExtractStatus('Processing uploaded file...');

        try {
            const voiceDNA = await extractVoiceDNA(file, voiceName, setExtractStatus);
            setVoiceDNAs(prev => [voiceDNA, ...prev]);
            setSelectedVoiceDNA(voiceDNA);
            setExtractStatus('Voice DNA extracted successfully!');

            // Save to library
            onSave({
                id: voiceDNA.id,
                name: voiceDNA.name,
                type: 'clone',
                voiceDna: voiceDNA,
                createdAt: voiceDNA.created_at
            });
        } catch (err: any) {
            setExtractStatus(`Error: ${err.message}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleDeleteVoiceDNA = async (id: string) => {
        try {
            await deleteVoiceDNA(id);
            setVoiceDNAs(prev => prev.filter(v => v.id !== id));
            if (selectedVoiceDNA?.id === id) {
                setSelectedVoiceDNA(null);
            }
            onDelete(id);
        } catch (err: any) {
            alert(`Failed to delete: ${err.message}`);
        }
    };

    const handleExportVoiceDNA = async (voice: VoiceDNA) => {
        try {
            const blob = await exportVoiceDNA(voice.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${voice.name.replace(/\s+/g, '_')}_${voice.id}.pt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        }
    };

    const handleGeneratePreview = async () => {
        setLoading(true);
        setAudioUrl(null);

        try {
            if (mode === 'clone' && selectedVoiceDNA) {
                // Use cloned voice
                const url = await generateClonedSpeech(testText, selectedVoiceDNA.id);
                setAudioUrl(url);
            } else if (mode === 'style') {
                // Use Gemini style voice
                const { audioData } = await generateAudio(testText, dna);
                setAudioUrl(audioData);
            }
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

    const handleSaveStyleVoice = () => {
        onSave({
            id: dna.voice_id,
            name: dna.name,
            type: 'style',
            dna: { ...dna },
            createdAt: Date.now()
        });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                        <p className="text-slate-400">Clone your voice or design synthetic voices</p>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                    <button
                        onClick={() => setMode('clone')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'clone' ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Mic size={14} />
                        <span>Clone Voice</span>
                    </button>
                    <button
                        onClick={() => setMode('style')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'style' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Wand2 size={14} />
                        <span>Style Voice</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: VOICE CREATION */}
                <div className="lg:col-span-5 space-y-6">
                    {mode === 'clone' ? (
                        /* CLONE VOICE MODE */
                        <div className="p-6 rounded-[2rem] border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-indigo-500/5 shadow-xl space-y-6">
                            {/* Server Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 font-bold uppercase tracking-widest text-xs">
                                    <Mic size={14} className="text-pink-500" />
                                    <span className="text-pink-400">Voice Cloning</span>
                                </div>
                                <div className={`flex items-center space-x-2 text-xs font-bold ${serverOnline ? 'text-green-400' : 'text-red-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <span>{serverOnline === null ? 'Checking...' : serverOnline ? 'XTTS Server Online' : 'Server Offline'}</span>
                                </div>
                            </div>

                            {!serverOnline && serverOnline !== null && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
                                    <div className="flex items-start space-x-2 text-red-400">
                                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold mb-1">Voice server not running</p>
                                            <p className="text-xs text-red-300/70">Start the server:</p>
                                            <code className="block bg-red-950/50 px-2 py-1 rounded mt-1 text-[10px] font-mono">
                                                cd voice_server && pip install -r requirements.txt && python main.py
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {serverOnline && (
                                <>
                                    {/* Voice Name */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voice DNA Name</label>
                                        <input
                                            type="text"
                                            value={voiceName}
                                            onChange={(e) => setVoiceName(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                                            placeholder="e.g. My Brand Voice"
                                        />
                                    </div>

                                    {/* Mic Recorder */}
                                    {!isExtracting && (
                                        <MicRecorder onRecordingComplete={handleRecordingComplete} />
                                    )}

                                    {/* File Upload Alternative */}
                                    {!isExtracting && (
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-slate-800" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-slate-900 px-4 text-slate-500 font-bold">or upload audio file</span>
                                            </div>
                                        </div>
                                    )}

                                    {!isExtracting && (
                                        <label className="flex items-center justify-center space-x-2 w-full py-4 border-2 border-dashed border-slate-700 hover:border-pink-500/50 rounded-xl cursor-pointer transition-all text-slate-400 hover:text-pink-400">
                                            <Upload size={18} />
                                            <span className="text-sm font-bold">Upload WAV/MP3 File</span>
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    )}

                                    {/* Extraction Status */}
                                    {isExtracting && (
                                        <div className="p-6 rounded-xl bg-pink-500/10 border border-pink-500/20 text-center">
                                            <Loader2 className="animate-spin w-12 h-12 text-pink-400 mx-auto mb-4" />
                                            <p className="text-pink-400 font-bold text-sm">{extractStatus}</p>
                                            <p className="text-xs text-slate-500 mt-2">This may take 30-60 seconds</p>
                                        </div>
                                    )}

                                    {extractStatus.includes('successfully') && (
                                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center space-x-3">
                                            <CheckCircle2 className="text-green-400" size={20} />
                                            <span className="text-green-400 font-bold text-sm">{extractStatus}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        /* STYLE VOICE MODE (existing) */
                        <div className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/40 shadow-xl space-y-6">
                            <div className="flex items-center space-x-2 text-green-400 font-bold uppercase tracking-widest text-xs mb-2">
                                <Wand2 size={14} />
                                <span>Synthetic Voice Style</span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Voice Name</label>
                                    <input
                                        type="text"
                                        value={dna.name}
                                        onChange={(e) => setDna({ ...dna, name: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                        placeholder="e.g. Corporate Narrator"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gender</label>
                                        <select
                                            value={dna.gender}
                                            onChange={(e) => setDna({ ...dna, gender: e.target.value as any })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
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
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
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
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                        placeholder="e.g. Deep, authoritative, warm..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Accent</label>
                                    <input
                                        type="text"
                                        value={dna.accent}
                                        onChange={(e) => setDna({ ...dna, accent: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                        placeholder="e.g. British (RP), American (Southern)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Style Prompt</label>
                                    <textarea
                                        value={dna.style_prompt}
                                        onChange={(e) => setDna({ ...dna, style_prompt: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveStyleVoice}
                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20 flex items-center justify-center space-x-2"
                            >
                                <Save size={18} />
                                <span>Save Style Voice</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT: PREVIEW & LIBRARY */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Preview Player */}
                    <div className="p-8 rounded-[2rem] bg-gradient-to-br from-indigo-500/5 to-pink-500/5 border border-indigo-500/10 h-[300px] flex flex-col justify-center items-center relative overflow-hidden group">
                        {loading ? (
                            <div className="text-center">
                                <Loader2 className="animate-spin w-16 h-16 text-indigo-400 mx-auto mb-4" />
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                                    {mode === 'clone' ? 'Synthesizing with your voice...' : 'Synthesizing waveform...'}
                                </p>
                            </div>
                        ) : audioUrl ? (
                            <div className="text-center animate-in zoom-in-95">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform" onClick={handlePlay}>
                                    {isPlaying ? <Square size={32} className="text-white fill-white" /> : <Play size={32} className="text-white fill-white ml-2" />}
                                </div>
                                <p className="text-indigo-300 font-bold mb-2">Preview Ready</p>
                                <p className="text-indigo-400/50 text-xs">Click to play</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-30">
                                <Volume2 size={64} className="mx-auto mb-4" />
                                <p className="font-bold text-xl uppercase tracking-widest">
                                    {mode === 'clone' ? 'Select a Voice DNA' : 'Configure Style Voice'}
                                </p>
                            </div>
                        )}

                        <div className="absolute bottom-0 inset-x-0 p-6 bg-slate-950/50 backdrop-blur-sm border-t border-indigo-500/10">
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
                                    disabled={loading || (mode === 'clone' && !selectedVoiceDNA)}
                                    className="bg-white disabled:bg-slate-800 disabled:text-slate-600 text-indigo-600 px-6 rounded-xl font-bold flex items-center space-x-2 hover:bg-indigo-50 transition-colors"
                                >
                                    <Volume2 size={18} />
                                    <span>Speak</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Voice DNA Library (Clone mode) */}
                    {mode === 'clone' && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                                <Mic size={20} className="text-pink-500" />
                                <span>My Voice DNAs</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {voiceDNAs.map(voice => (
                                    <div
                                        key={voice.id}
                                        onClick={() => setSelectedVoiceDNA(voice)}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer group ${selectedVoiceDNA?.id === voice.id
                                                ? 'bg-pink-500/10 border-pink-500/50'
                                                : 'bg-slate-900/50 border-slate-800 hover:border-pink-500/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-lg ${selectedVoiceDNA?.id === voice.id ? 'bg-pink-500 text-white' : 'bg-pink-500/10 text-pink-400'}`}>
                                                    <Mic size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">{voice.name}</h4>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">
                                                        {formatDuration(voice.source_duration_sec)} • {voice.source_type}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleExportVoiceDNA(voice); }}
                                                    className="p-2 text-slate-600 hover:text-indigo-400"
                                                    title="Export"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteVoiceDNA(voice.id); }}
                                                    className="p-2 text-slate-600 hover:text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {selectedVoiceDNA?.id === voice.id && (
                                            <div className="mt-3 pt-3 border-t border-pink-500/20 flex items-center space-x-2 text-pink-400">
                                                <CheckCircle2 size={14} />
                                                <span className="text-xs font-bold">Selected for synthesis</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {voiceDNAs.length === 0 && (
                                    <div className="col-span-full py-8 text-center text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
                                        No voice DNAs yet. Record or upload your voice above.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Saved Style Voices (Style mode) */}
                    {mode === 'style' && (
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                                <FileAudio size={20} className="text-slate-500" />
                                <span>Saved Style Voices</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedVoices.filter(v => v.type === 'style' || !v.type).map(voice => (
                                    <div key={voice.id} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between group hover:border-green-500/30 transition-all cursor-pointer" onClick={() => voice.dna && setDna(voice.dna)}>
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                                                <Volume2 size={16} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-200">{voice.name}</h4>
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">{voice.dna?.gender} • {voice.dna?.age}</span>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(voice.id); }} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {savedVoices.filter(v => v.type === 'style' || !v.type).length === 0 && (
                                    <div className="col-span-full py-8 text-center text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
                                        No style voices saved yet. Design one on the left.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioLab;
