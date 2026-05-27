
import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, BarChart3, Database, CircleDollarSign, ArrowLeft, Loader2, Trash2, RefreshCcw, CheckCircle2, AlertCircle, Cpu, Search, ImageIcon, Type, Check } from 'lucide-react';
import { UsageLog } from '../types';
import { listAvailableModels, GeminiModelInfo } from '../services/geminiService';

interface SettingsProps {
    onBack: () => void;
    onUpdateKey: (key: string) => void;
    currentKey: string;
}

const Settings: React.FC<SettingsProps> = ({ onBack, onUpdateKey, currentKey }) => {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [manualKey, setManualKey] = useState(currentKey);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [activeTab, setActiveTab] = useState<'api' | 'usage' | 'models'>('usage');
    const [availableModels, setAvailableModels] = useState<GeminiModelInfo[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsError, setModelsError] = useState('');
    const [modelSearch, setModelSearch] = useState('');
    const [customTextModel, setCustomTextModel] = useState(localStorage.getItem('ikhsan_model_text') || '');
    const [customImageModel, setCustomImageModel] = useState(localStorage.getItem('ikhsan_model_image') || '');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/usage_logs');
            const data = await res.json();
            setLogs(data.reverse()); // Newest first
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateKey = () => {
        setSaveStatus('saving');
        onUpdateKey(manualKey);
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };

    const clearLogs = async () => {
        if (!window.confirm("Are you sure you want to clear all usage logs?")) return;
        try {
            // Small trick: save empty array to usage_logs
            await fetch('/api/usage_logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ RESET_COLLECTION: true }) // We'll need to handle this in server or just send empty
            });
            setLogs([]);
        } catch (e) {
            console.error("Failed to clear logs", e);
        }
    };

    const fetchModels = async () => {
        setModelsLoading(true);
        setModelsError('');
        try {
            const models = await listAvailableModels();
            setAvailableModels(models);
        } catch (e: any) {
            setModelsError(e.message || 'Failed to fetch models');
        } finally {
            setModelsLoading(false);
        }
    };

    const saveCustomModels = () => {
        if (customTextModel) localStorage.setItem('ikhsan_model_text', customTextModel);
        else localStorage.removeItem('ikhsan_model_text');
        if (customImageModel) localStorage.setItem('ikhsan_model_image', customImageModel);
        else localStorage.removeItem('ikhsan_model_image');
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const totalIDR = logs.reduce((sum, log) => sum + (log.costIDR || 0), 0);
    const totalUSD = logs.reduce((sum, log) => sum + (log.costUSD || 0), 0);

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-500 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-4">
                    <button onClick={onBack} className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <img src="./logo.png" className="w-6 h-6 object-contain" />
                            <h2 className="text-3xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">CHAMBER <span className="text-green-500">SETTINGS</span></h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">Configure credentials and monitor resource consumption.</p>
                    </div>
                </div>

                <div className="flex bg-white dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <button
                        onClick={() => setActiveTab('usage')}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'usage' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <BarChart3 size={14} /><span>Usage Logs</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('api')}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'api' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Key size={14} /><span>API Config</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('models'); if (availableModels.length === 0) fetchModels(); }}
                        className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'models' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Cpu size={14} /><span>Models</span>
                    </button>
                </div>
            </div>

            {activeTab === 'models' ? (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Current Custom Models */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md space-y-3">
                            <div className="flex items-center space-x-2 text-blue-500 mb-1">
                                <Type size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Text / Planning Model</span>
                            </div>
                            <input
                                value={customTextModel}
                                onChange={e => setCustomTextModel(e.target.value)}
                                placeholder="e.g. gemini-2.0-flash"
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                            <p className="text-[10px] text-slate-400">Used for DNA analysis, planning, and all text operations.</p>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md space-y-3">
                            <div className="flex items-center space-x-2 text-purple-500 mb-1">
                                <ImageIcon size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Image Generation Model</span>
                            </div>
                            <input
                                value={customImageModel}
                                onChange={e => setCustomImageModel(e.target.value)}
                                placeholder="e.g. gemini-2.0-flash-preview-image-generation"
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-purple-500/30"
                            />
                            <p className="text-[10px] text-slate-400">Must support generateContent with image output.</p>
                        </div>
                    </div>
                    <button
                        onClick={saveCustomModels}
                        className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}
                    >
                        {saveStatus === 'saved' ? '✓ Saved' : 'Save Custom Models'}
                    </button>

                    {/* Model Browser */}
                    <div className="bg-white/80 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                                    <Cpu size={16} className="text-violet-500" />
                                    <span>Available Models</span>
                                    {availableModels.length > 0 && <span className="text-[10px] font-normal text-slate-400 ml-2">{availableModels.length} models</span>}
                                </h3>
                                <p className="text-[10px] text-slate-400 mt-1">Click a model to set it as your custom text or image model.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={modelSearch}
                                        onChange={e => setModelSearch(e.target.value)}
                                        placeholder="Filter models..."
                                        className="pl-8 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none w-48"
                                    />
                                </div>
                                <button
                                    onClick={fetchModels}
                                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all"
                                >
                                    <RefreshCcw size={13} className={modelsLoading ? 'animate-spin' : ''} />
                                    <span>{modelsLoading ? 'Fetching...' : 'Refresh'}</span>
                                </button>
                            </div>
                        </div>

                        {modelsError && (
                            <div className="mx-8 mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
                                <AlertCircle size={14} />
                                <span>{modelsError}</span>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            {modelsLoading ? (
                                <div className="py-20 text-center text-slate-500">
                                    <Loader2 className="animate-spin mx-auto mb-4" />
                                    <p className="text-xs">Fetching from Gemini API...</p>
                                </div>
                            ) : availableModels.length === 0 ? (
                                <div className="py-20 text-center text-slate-500 text-xs italic">
                                    Click Refresh to load available models from your API key.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-8 py-4 font-bold uppercase tracking-widest">Model ID</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-widest">Methods</th>
                                            <th className="px-6 py-4 font-bold uppercase tracking-widest text-right">Set As</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {availableModels
                                            .filter(m => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || (m.displayName || '').toLowerCase().includes(modelSearch.toLowerCase()))
                                            .map(model => {
                                                const id = model.name.replace('models/', '');
                                                const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
                                                const isCurrentText = customTextModel === id;
                                                const isCurrentImage = customImageModel === id;
                                                return (
                                                    <tr key={model.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                        <td className="px-8 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{id}</span>
                                                                {model.displayName && model.displayName !== id && (
                                                                    <span className="text-[10px] text-slate-400">{model.displayName}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {(model.supportedGenerationMethods || []).map(m => (
                                                                    <span key={m} className={`px-2 py-0.5 rounded text-[9px] font-bold ${m === 'generateContent' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                                        {m}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {supportsGenerate && (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => setCustomTextModel(id)}
                                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isCurrentText ? 'bg-blue-600 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'}`}
                                                                    >
                                                                        {isCurrentText && <Check size={10} />}
                                                                        <Type size={10} /> TEXT
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setCustomImageModel(id)}
                                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isCurrentImage ? 'bg-purple-600 text-white' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'}`}
                                                                    >
                                                                        {isCurrentImage && <Check size={10} />}
                                                                        <ImageIcon size={10} /> IMAGE
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'api' ? (
                <div className="max-w-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-10 rounded-[2.5rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl backdrop-blur-xl space-y-8">
                        <div className="flex items-center space-x-4 mb-2">
                            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20"><Key size={24} className="text-indigo-500 dark:text-indigo-400" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gemini API Key</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-500">This key is used for all AI operations in the lab.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="relative group">
                                <input
                                    type="password"
                                    placeholder="Enter AI Studio API Key..."
                                    className="w-full pl-6 pr-12 py-5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
                                    value={manualKey}
                                    onChange={(e) => setManualKey(e.target.value)}
                                />
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">
                                    <Database size={20} />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-600 italic px-2 leading-relaxed">
                                * Key is saved to your browser's local storage and persists across sessions. It overrides any key in your <code>.env</code> file.
                            </p>
                        </div>

                        <button
                            onClick={handleUpdateKey}
                            disabled={saveStatus === 'saving' || manualKey.length < 20}
                            className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all active:scale-95 ${saveStatus === 'saved' ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                } disabled:opacity-50`}
                        >
                            {saveStatus === 'saving' ? <Loader2 className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 /> : <SaveIcon size={20} />}
                            <span>{saveStatus === 'saving' ? 'UPDATING...' : saveStatus === 'saved' ? 'KEY UPDATED' : 'Save Configuration'}</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-8 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between backdrop-blur-md">
                            <div className="flex items-center space-x-3 text-blue-500 dark:text-blue-400 mb-4 items-start">
                                <CircleDollarSign size={24} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Total Estimated Cost</span>
                            </div>
                            <div>
                                <h4 className="text-4xl font-bold text-slate-900 dark:text-white mb-1">Rp {totalIDR.toLocaleString()}</h4>
                                <p className="text-sm text-slate-500 font-medium">${totalUSD.toFixed(3)} USD Estimated</p>
                            </div>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between backdrop-blur-md">
                            <div className="flex items-center space-x-3 text-indigo-500 dark:text-indigo-400 mb-4 items-start">
                                <BarChart3 size={24} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Total Requests</span>
                            </div>
                            <div>
                                <h4 className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{logs.length} Hits</h4>
                                <p className="text-sm text-slate-500 font-medium">Across all production tools</p>
                            </div>
                        </div>

                        <div className="p-8 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between group backdrop-blur-md">
                            <div className="flex items-center space-x-3 text-slate-500 mb-4 items-start">
                                <Database size={24} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Data Storage</span>
                            </div>
                            <button
                                onClick={clearLogs}
                                className="flex items-center justify-center space-x-2 w-full py-4 bg-red-500/5 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-white rounded-2xl text-xs font-bold transition-all"
                            >
                                <Trash2 size={16} />
                                <span>Clear All Logs</span>
                            </button>
                        </div>
                    </div>

                    {/* LOG TABLE */}
                    <div className="bg-white/80 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden backdrop-blur-md">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-bold flex items-center space-x-2 text-slate-900 dark:text-white">
                                <RefreshCcw size={16} className="text-blue-500 dark:text-blue-400" />
                                <span>Transaction History</span>
                            </h3>
                            <button onClick={fetchLogs} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-500 hover:text-slate-900 dark:hover:text-white"><RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /></button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                        <th className="px-8 py-5 font-bold uppercase tracking-widest">Feature</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-widest">Model</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-widest text-center">Tokens (In/Out)</th>
                                        <th className="px-6 py-5 font-bold uppercase tracking-widest text-right">Cost (IDR)</th>
                                        <th className="px-8 py-5 font-bold uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {loading ? (
                                        <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic"><Loader2 className="animate-spin mx-auto mb-4" /> Loading telemetry data...</td></tr>
                                    ) : logs.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic uppercase tracking-widest text-[10px]">No activity recorded</td></tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{log.feature}</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">#{log.id.slice(-5)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-mono ${log.model.includes('image') ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                        {log.model}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col space-y-0.5">
                                                        <span className="text-slate-600 dark:text-slate-300 font-medium">IN: {log.inputTokens.toLocaleString()}</span>
                                                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">OUT: {log.outputTokens.toLocaleString()}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-green-600 dark:text-green-400">Rp {log.costIDR.toLocaleString()}</span>
                                                        <span className="text-[10px] text-slate-500">${log.costUSD.toFixed(4)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right text-slate-500 tabular-nums">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal icon for save
const SaveIcon = ({ size }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);

export default Settings;
