import React, { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, Briefcase, Upload, Zap, Rocket, Download, Save, Loader2,
  Plus, X, CheckCircle2, AlertCircle, Image as ImageIcon, ChevronDown,
  Layers, Trash2, LayoutTemplate, RefreshCcw, Copy
} from 'lucide-react';
import { BrandReference, DesignReference, GeneratedPost, AspectRatio, GeminiModel } from '../types';
import { generateFromAsset } from '../services/geminiService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BatchItem {
  id: string;
  brief: string;
  image: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  error?: string;
}

interface BrandStudioProps {
  brands: BrandReference[];
  references: DesignReference[];
  generatedPosts: GeneratedPost[];
  onSavePost: (post: GeneratedPost) => void;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const BrandStudio: React.FC<BrandStudioProps> = ({
  brands,
  references,
  generatedPosts,
  onSavePost,
  onBack,
}) => {
  // Brand / blueprint selection
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brands[0]?.id || '');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('');

  // Tab: quick | batch
  const [tab, setTab] = useState<'quick' | 'batch'>('quick');

  // Quick generate
  const [assetImage, setAssetImage] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');
  const [brief, setBrief] = useState('');
  const [ratio, setRatio] = useState<AspectRatio>('4:5');
  const [modelType, setModelType] = useState<GeminiModel>('flash');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Batch generate
  const [batchAsset, setBatchAsset] = useState<string | null>(null);
  const [batchAssetName, setBatchAssetName] = useState('');
  const [batchBriefs, setBatchBriefs] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const activeBrand = brands.find(b => b.id === selectedBrandId) ?? null;
  const activeBlueprint = references.find(r => r.id === selectedBlueprintId) ?? null;
  const brandPosts = generatedPosts
    .filter(p => p.brandId === selectedBrandId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  // ─── Asset Handlers ──────────────────────────────────────────────────────

  const loadAsset = (file: File, forBatch = false) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      if (forBatch) {
        setBatchAsset(b64);
        setBatchAssetName(file.name);
      } else {
        setAssetImage(b64);
        setAssetName(file.name);
        setResult(null);
        setError(null);
        setSavedId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent, forBatch = false) => {
    e.preventDefault();
    if (forBatch) setIsDraggingBatch(false); else setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadAsset(file, forBatch);
  }, []);

  // ─── Generate ────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!activeBrand || !assetImage || !brief.trim()) return;
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setSavedId(null);
    try {
      const { image } = await generateFromAsset(
        assetImage,
        brief.trim(),
        activeBrand.dna,
        activeBlueprint?.jsonSpec ?? null,
        ratio,
        modelType
      );
      setResult(image);
    } catch (err: any) {
      setError(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result || !activeBrand) return;
    const post: GeneratedPost = {
      id: Date.now().toString(),
      name: `${activeBrand.dna.brand_name} — ${brief.slice(0, 50)}`,
      imageSource: result,
      history: [],
      blueprintId: selectedBlueprintId || 'brand_studio',
      brandId: selectedBrandId,
      aspectRatio: ratio,
      createdAt: Date.now(),
    };
    onSavePost(post);
    setSavedId(post.id);
  };

  const handleDownload = (img: string, name: string) => {
    const a = document.createElement('a');
    a.href = img;
    a.download = `${name.replace(/\W+/g, '_')}.png`;
    a.click();
  };

  // ─── Batch ───────────────────────────────────────────────────────────────

  const handleBatchGenerate = async () => {
    if (!activeBrand || !batchAsset) return;
    const briefs = batchBriefs.split('\n').map(l => l.trim()).filter(Boolean);
    if (briefs.length === 0) return;

    const initial: BatchItem[] = briefs.map((b, i) => ({
      id: `batch_${Date.now()}_${i}`,
      brief: b,
      image: null,
      status: 'pending',
    }));
    setBatchItems(initial);
    setIsBatchRunning(true);

    const updated = [...initial];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'generating' };
      setBatchItems([...updated]);
      try {
        const { image } = await generateFromAsset(
          batchAsset,
          updated[i].brief,
          activeBrand.dna,
          activeBlueprint?.jsonSpec ?? null,
          ratio,
          modelType
        );
        updated[i] = { ...updated[i], image, status: 'done' };
      } catch (err: any) {
        updated[i] = { ...updated[i], status: 'error', error: err.message };
      }
      setBatchItems([...updated]);
    }
    setIsBatchRunning(false);
  };

  const handleSaveBatchItem = (item: BatchItem) => {
    if (!item.image || !activeBrand) return;
    const post: GeneratedPost = {
      id: item.id,
      name: `${activeBrand.dna.brand_name} — ${item.brief.slice(0, 50)}`,
      imageSource: item.image,
      history: [],
      blueprintId: selectedBlueprintId || 'brand_studio',
      brandId: selectedBrandId,
      aspectRatio: ratio,
      createdAt: Date.now(),
    };
    onSavePost(post);
  };

  const doneBatch = batchItems.filter(i => i.status === 'done').length;

  // ─── Empty State ─────────────────────────────────────────────────────────

  if (brands.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center p-8">
        <div className="max-w-md space-y-6">
          <div className="p-5 rounded-3xl bg-orange-500/10 border border-orange-500/20 w-fit mx-auto">
            <Briefcase size={40} className="text-orange-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">No Brands Yet</h2>
          <p className="text-slate-500">Go to Brand Lab to create your first brand identity, then come back here to start producing content.</p>
          <button onClick={onBack} className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-bold transition-all">
            ← Go to Brand Lab
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 text-slate-900 dark:text-slate-100">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-0.5">
              <Briefcase size={20} className="text-orange-500" />
              <h1 className="text-3xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">
                BRAND <span className="text-orange-500">STUDIO</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Drop an asset, write a message, ship the post.</p>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="relative">
          <select
            value={selectedBrandId}
            onChange={e => { setSelectedBrandId(e.target.value); setResult(null); setSavedId(null); }}
            className="appearance-none pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white outline-none cursor-pointer shadow-sm"
          >
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.dna.brand_name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* ─ Left: Brand Context Panel ─ */}
        <aside className="space-y-4">

          {/* Brand Identity Card */}
          {activeBrand && (
            <div className="p-5 rounded-[1.5rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-4">
              <div className="flex items-center space-x-3">
                {activeBrand.imageSource && (
                  <img src={activeBrand.imageSource} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                )}
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white">{activeBrand.dna.brand_name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Brand Identity</p>
                </div>
              </div>

              {/* Color swatches */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Primary Colors</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeBrand.dna.primary_colors.slice(0, 6).map((c, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-lg border border-black/10 dark:border-white/10 shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Vibe</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{activeBrand.dna.brand_vibe}</p>
              </div>
            </div>
          )}

          {/* Blueprint Selector */}
          <div className="p-5 rounded-[1.5rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-3">
            <div className="flex items-center space-x-2">
              <LayoutTemplate size={14} className="text-blue-500" />
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Layout Blueprint</p>
            </div>
            <div className="relative">
              <select
                value={selectedBlueprintId}
                onChange={e => setSelectedBlueprintId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="">Auto Layout (AI decides)</option>
                {references.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {activeBlueprint && (
              <p className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">{activeBlueprint.jsonSpec.structural_rules.layout_archetype}</p>
            )}
          </div>

          {/* Recent Brand Posts */}
          {brandPosts.length > 0 && (
            <div className="p-5 rounded-[1.5rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Recent Posts</p>
              <div className="grid grid-cols-3 gap-2">
                {brandPosts.map(post => (
                  <div key={post.id} className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={post.imageSource} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ─ Right: Generation Panel ─ */}
        <div className="space-y-4">

          {/* Tab Switcher */}
          <div className="flex bg-white dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit">
            <button
              onClick={() => setTab('quick')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'quick' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Zap size={13} /><span>Quick Post</span>
            </button>
            <button
              onClick={() => setTab('batch')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'batch' ? 'bg-rocket-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              <Rocket size={13} /><span>Batch Mode</span>
            </button>
          </div>

          {/* ── Quick Post Tab ── */}
          {tab === 'quick' && (
            <div className="p-6 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md space-y-5">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Asset Drop Zone */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Hero Asset</p>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={e => handleDrop(e, false)}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden ${isDragging ? 'border-orange-500 bg-orange-500/5' : assetImage ? 'border-transparent' : 'border-slate-300 dark:border-slate-700 hover:border-orange-400/60 hover:bg-orange-500/5'}`}
                    style={{ aspectRatio: '1/1' }}
                  >
                    {assetImage ? (
                      <>
                        <img src={assetImage} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                          <RefreshCcw size={20} className="text-white" />
                          <p className="text-white text-xs font-bold">Replace</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setAssetImage(null); setAssetName(''); setResult(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 rounded-lg text-white transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4">
                        <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                          <Upload size={24} className="text-orange-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Drop asset here</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Your 3D icon, product shot, etc.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && loadAsset(e.target.files[0])} />
                  {assetName && <p className="text-[10px] text-slate-400 mt-1.5 truncate">{assetName}</p>}
                </div>

                {/* Brief + Options */}
                <div className="flex flex-col space-y-4">
                  <div className="flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Message / Brief</p>
                    <textarea
                      value={brief}
                      onChange={e => setBrief(e.target.value)}
                      placeholder={`What does this post say?\n\ne.g. "Kalau berhenti bayar, Tool kamu ikut mati."`}
                      className="w-full h-36 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-500/30 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Ratio */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Aspect Ratio</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RATIOS.map(r => (
                        <button
                          key={r.value}
                          onClick={() => setRatio(r.value)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${ratio === r.value ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Model</p>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl w-fit">
                      {(['flash', 'flash-latest', 'pro', 'pro-3', 'custom'] as GeminiModel[]).map(m => (
                        <button
                          key={m}
                          onClick={() => setModelType(m)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${modelType === m
                            ? m === 'custom' ? 'bg-emerald-600 text-white shadow-lg' : m === 'pro-3' ? 'bg-violet-600 text-white shadow-lg' : m === 'pro' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-orange-500 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                          }`}
                          title={m === 'custom' ? 'Custom model — set in Settings > Models' : undefined}
                        >
                          {m === 'flash' ? 'FLASH' : m === 'flash-latest' ? 'FLASH+' : m === 'pro' ? 'PRO' : m === 'pro-3' ? 'PRO 3' : 'CUSTOM'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !activeBrand || !assetImage || !brief.trim()}
                className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-2xl font-black text-sm tracking-wider flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20 disabled:shadow-none"
              >
                {isGenerating
                  ? <><Loader2 size={18} className="animate-spin" /><span>GENERATING POST...</span></>
                  : <><Zap size={18} /><span>GENERATE POST</span></>
                }
              </button>

              {/* Error */}
              {error && (
                <div className="flex items-start space-x-3 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                    <img src={result} className="w-full object-contain max-h-[600px]" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDownload(result, brief.slice(0, 30))}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                        title="Download"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSave}
                      disabled={!!savedId}
                      className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 transition-all ${savedId ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'}`}
                    >
                      {savedId ? <><CheckCircle2 size={16} /><span>Saved to Library</span></> : <><Save size={16} /><span>Save to Library</span></>}
                    </button>
                    <button
                      onClick={() => handleDownload(result, brief.slice(0, 30))}
                      className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-200 dark:border-slate-700"
                      title="Download PNG"
                    >
                      <Download size={18} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <button
                      onClick={() => { setResult(null); setSavedId(null); setError(null); }}
                      className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all border border-slate-200 dark:border-slate-700"
                      title="Reset"
                    >
                      <RefreshCcw size={18} className="text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Batch Mode Tab ── */}
          {tab === 'batch' && (
            <div className="p-6 rounded-[2rem] bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md space-y-5">
              <div className="flex items-center space-x-3 text-indigo-500 dark:text-indigo-400">
                <Rocket size={16} />
                <p className="text-xs font-bold uppercase tracking-widest">Batch Generation — Multiple Posts from One Asset</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Batch Asset */}
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Shared Asset</p>
                  <div
                    onClick={() => batchFileInputRef.current?.click()}
                    onDrop={e => handleDrop(e, true)}
                    onDragOver={e => { e.preventDefault(); setIsDraggingBatch(true); }}
                    onDragLeave={() => setIsDraggingBatch(false)}
                    className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all overflow-hidden ${isDraggingBatch ? 'border-indigo-500 bg-indigo-500/5' : batchAsset ? 'border-transparent' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400/60'}`}
                    style={{ aspectRatio: '1/1' }}
                  >
                    {batchAsset ? (
                      <>
                        <img src={batchAsset} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <RefreshCcw size={20} className="text-white" />
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setBatchAsset(null); setBatchAssetName(''); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 rounded-lg text-white transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                          <Upload size={24} className="text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Shared asset</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Used for all briefs</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input ref={batchFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && loadAsset(e.target.files[0], true)} />
                  {batchAssetName && <p className="text-[10px] text-slate-400 mt-1.5 truncate">{batchAssetName}</p>}
                </div>

                {/* Batch Briefs */}
                <div className="flex flex-col space-y-3">
                  <div className="flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                      Briefs — One per line
                    </p>
                    <textarea
                      value={batchBriefs}
                      onChange={e => setBatchBriefs(e.target.value)}
                      placeholder={`Kalau berhenti bayar, Tool kamu ikut mati.\nKalau dicabut, semua berhenti.\nPay once. Qlip forever.\nSewa terus atau miliki?`}
                      className="w-full h-52 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none leading-relaxed font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {batchBriefs.split('\n').filter(l => l.trim()).length} post{batchBriefs.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} queued
                    </p>
                  </div>

                  {/* Ratio + Model (shared) */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {RATIOS.map(r => (
                        <button
                          key={r.value}
                          onClick={() => setRatio(r.value)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${ratio === r.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-lg">
                      {(['flash', 'flash-latest', 'pro', 'pro-3', 'custom'] as GeminiModel[]).map(m => (
                        <button
                          key={m}
                          onClick={() => setModelType(m)}
                          className={`px-2 py-1 rounded-md text-[8px] font-bold transition-all ${modelType === m ? m === 'custom' ? 'bg-emerald-600 text-white' : m === 'pro-3' ? 'bg-violet-600 text-white' : 'bg-indigo-600 text-white' : 'text-slate-500'}`}
                        >
                          {m === 'flash' ? 'F' : m === 'flash-latest' ? 'F+' : m === 'pro' ? 'PRO' : m === 'pro-3' ? 'P3' : 'CUS'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Generate Button */}
              <button
                onClick={handleBatchGenerate}
                disabled={isBatchRunning || !activeBrand || !batchAsset || !batchBriefs.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-2xl font-black text-sm tracking-wider flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 disabled:shadow-none"
              >
                {isBatchRunning
                  ? <><Loader2 size={18} className="animate-spin" /><span>GENERATING {doneBatch}/{batchItems.length}...</span></>
                  : <><Rocket size={18} /><span>GENERATE ALL ({batchBriefs.split('\n').filter(l => l.trim()).length} POSTS)</span></>
                }
              </button>

              {/* Batch Progress Bar */}
              {batchItems.length > 0 && (
                <div className="space-y-2">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${(doneBatch / batchItems.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right font-medium">
                    {doneBatch} of {batchItems.length} complete
                  </p>
                </div>
              )}

              {/* Batch Results Grid */}
              {batchItems.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {batchItems.map(item => (
                    <div key={item.id} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                      <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                        {item.status === 'done' && item.image ? (
                          <img src={item.image} className="w-full h-full object-cover" />
                        ) : item.status === 'generating' ? (
                          <div className="flex flex-col items-center space-y-2">
                            <Loader2 size={24} className="text-indigo-400 animate-spin" />
                            <p className="text-[10px] text-slate-400">Generating...</p>
                          </div>
                        ) : item.status === 'error' ? (
                          <div className="flex flex-col items-center space-y-1 p-3 text-center">
                            <AlertCircle size={20} className="text-red-400" />
                            <p className="text-[9px] text-red-400">{item.error?.slice(0, 60)}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-1">
                            <ImageIcon size={24} className="text-slate-300 dark:text-slate-600" />
                            <p className="text-[10px] text-slate-400">Pending</p>
                          </div>
                        )}
                      </div>
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">{item.brief}</p>
                        {item.status === 'done' && item.image && (
                          <div className="flex space-x-1.5">
                            <button
                              onClick={() => handleSaveBatchItem(item)}
                              className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[9px] font-bold transition-all flex items-center justify-center space-x-1"
                            >
                              <Save size={10} /><span>Save</span>
                            </button>
                            <button
                              onClick={() => handleDownload(item.image!, item.brief.slice(0, 20))}
                              className="p-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-all"
                            >
                              <Download size={12} className="text-slate-600 dark:text-slate-300" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandStudio;
