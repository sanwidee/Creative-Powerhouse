
import React, { useState, useRef, useCallback } from 'react';
import { Rocket, Sparkles, ArrowLeft, ChevronDown, ImageIcon, Loader2, Copy, Check, Zap, AlertCircle, RefreshCw, Send, Palette, XCircle, Layers, Save, Target, LayoutTemplate, FileCode, Eye, Sun, Moon, Wand2, Upload, Bookmark, Trash2, List, Grid, Plus } from 'lucide-react';
import { DesignReference, BrandReference, RemixIntensity, ContentBrief, AspectRatio, GeneratedPost, CharacterReference, GeminiModel, Preset } from '../types';
import { generatePostFromReference, generateRemixImage, refinePostImage, getPostPromptData, analyzeDesign } from '../services/geminiService';
import AnnotationCanvas from './AnnotationCanvas';
import PromptPreviewModal from './PromptPreviewModal';
import { PromptData } from '../types';

type GeneratorMode = 'quick' | 'library' | 'batch';

interface GeneratorProps {
  references: DesignReference[];
  brands: BrandReference[];
  characters: CharacterReference[];
  presets: Preset[];
  onSavePost: (post: GeneratedPost) => void;
  onSavePreset: (preset: Preset) => void;
  onDeletePreset: (id: string) => void;
  onBack: () => void;
}

const Generator: React.FC<GeneratorProps> = ({ references, brands, characters, presets, onSavePost, onSavePreset, onDeletePreset, onBack }) => {
  // Mode State
  const [mode, setMode] = useState<GeneratorMode>('library');

  // Selection State
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [intensity, setIntensity] = useState<RemixIntensity>('strict');
  const [carouselMode, setCarouselMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Quick Mode State
  const [quickImage, setQuickImage] = useState<string | null>(null);
  const [quickDNA, setQuickDNA] = useState<any | null>(null);
  const [isAnalyzingQuick, setIsAnalyzingQuick] = useState(false);
  const quickFileRef = useRef<HTMLInputElement>(null);

  // Batch Mode State
  const [batchBriefs, setBatchBriefs] = useState<string>('');
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Preset Modal State
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  const [brief, setBrief] = useState<ContentBrief>({
    topic: '',
    elements_to_display: '',
    copy_instructions: '',
    target_audience: '',
    aspectRatio: '1:1',
    slide_number: 1,
    total_slides: 5
  });

  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [remixImage, setRemixImage] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [precisionMode, setPrecisionMode] = useState(false);
  const [structuredData, setStructuredData] = useState<Record<string, string>>({});
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationSketch, setAnnotationSketch] = useState<string | null>(null);
  const [fullPreview, setFullPreview] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<PromptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelType, setModelType] = useState<GeminiModel>('flash');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');

  const selectedRef = references.find(r => r.id === selectedId);
  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const handleGenerate = async () => {
    if (!selectedRef) return;
    setLoading(true);
    setResultText(null);
    setRemixImage(null);
    setError(null);
    setIsSaved(false);

    const finalBrief: ContentBrief = {
      ...brief,
      slide_number: carouselMode ? brief.slide_number : undefined,
      total_slides: carouselMode ? brief.total_slides : undefined,
      structured_content: precisionMode ? structuredData : undefined
    };

    try {
      const { report, finalVisualPrompt } = await generatePostFromReference(
        selectedRef.jsonSpec,
        finalBrief,
        intensity,
        selectedBrand?.dna,
        selectedCharacter?.dna,
        modelType,
        themeMode,
        selectedRef.imageSource
      );
      setResultText(report);

      if (finalVisualPrompt) {
        setImageLoading(true);
        const { image: img } = await generateRemixImage(
          finalVisualPrompt,
          brief.aspectRatio,
          selectedCharacter?.dna,
          modelType // Respect user selection
        );
        setRemixImage(img);
        setImageLoading(false);
      } else {
        throw new Error("AI failed to generate a valid visual directive. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Synthesis failed. The lab encountered a processing error.");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPrompt = () => {
    if (!selectedRef) return;
    const finalBrief: ContentBrief = {
      ...brief,
      slide_number: carouselMode ? brief.slide_number : undefined,
      total_slides: carouselMode ? brief.total_slides : undefined,
      structured_content: precisionMode ? structuredData : undefined
    };
    const data = getPostPromptData(
      selectedRef.jsonSpec,
      finalBrief,
      intensity,
      selectedBrand?.dna,
      selectedCharacter?.dna,
      themeMode
    );
    setPromptPreview(data);
  };

  const handleSaveResult = () => {
    if (!remixImage || !selectedRef) return;
    const newPost: GeneratedPost = {
      id: Date.now().toString(),
      name: `${brief.topic} - Remix`,
      imageSource: remixImage,
      history: [{
        id: 'original',
        timestamp: Date.now(),
        instruction: 'Original Generation',
        image: remixImage,
        type: 'text'
      }],
      blueprintId: selectedRef.id,
      brandId: selectedBrandId || undefined,
      aspectRatio: brief.aspectRatio,
      createdAt: Date.now()
    };
    onSavePost(newPost);
    setIsSaved(true);
  };

  const handleRefine = async () => {
    if (!remixImage || !refineInput) return;
    setIsRefining(true);
    setError(null);
    try {
      const { image: refined } = await refinePostImage(
        remixImage,
        refineInput,
        brief.aspectRatio,
        annotationSketch || undefined,
        !!annotationSketch
      );
      setRemixImage(refined);
      setRefineInput('');
      setAnnotationSketch(null);
    } catch (err: any) {
      setError("Retouch engine failure. Instructions were too complex or blocked.");
    } finally {
      setIsRefining(false);
    }
  };

  // Quick Mode Handlers
  const handleQuickImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageData = reader.result as string;
      setQuickImage(imageData);
      setIsAnalyzingQuick(true);
      setError(null);

      try {
        const { json } = await analyzeDesign(imageData);
        setQuickDNA(json);
      } catch (err: any) {
        setError("Failed to analyze image: " + err.message);
        setQuickDNA(null);
      } finally {
        setIsAnalyzingQuick(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickGenerate = async () => {
    if (!quickDNA || !quickImage) return;
    setLoading(true);
    setResultText(null);
    setRemixImage(null);
    setError(null);
    setIsSaved(false);

    const finalBrief: ContentBrief = {
      ...brief,
      structured_content: undefined
    };

    try {
      const { report, finalVisualPrompt } = await generatePostFromReference(
        quickDNA,
        finalBrief,
        intensity,
        brands.find(b => b.id === selectedBrandId)?.dna,
        undefined,
        modelType,
        themeMode,
        quickImage
      );
      setResultText(report);

      if (finalVisualPrompt) {
        setImageLoading(true);
        const { image: img } = await generateRemixImage(
          finalVisualPrompt,
          brief.aspectRatio,
          undefined,
          modelType
        );
        setRemixImage(img);
        setImageLoading(false);
      } else {
        throw new Error("AI failed to generate a valid visual directive.");
      }
    } catch (err: any) {
      setError(err.message || "Quick generation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Batch Mode Handler
  const handleBatchGenerate = async () => {
    if (!selectedRef) return;
    const briefs = batchBriefs.split('\n').filter(line => line.trim());
    if (briefs.length === 0) return;

    setIsBatchGenerating(true);
    setBatchResults([]);
    setBatchProgress(0);
    setError(null);

    const results: string[] = [];

    try {
      for (let i = 0; i < briefs.length; i++) {
        const batchBrief: ContentBrief = {
          topic: briefs[i],
          elements_to_display: briefs[i],
          copy_instructions: '',
          target_audience: '',
          aspectRatio: brief.aspectRatio
        };

        const { finalVisualPrompt } = await generatePostFromReference(
          selectedRef.jsonSpec,
          batchBrief,
          intensity,
          selectedBrand?.dna,
          selectedCharacter?.dna,
          modelType,
          themeMode,
          selectedRef.imageSource
        );

        if (finalVisualPrompt) {
          const { image } = await generateRemixImage(
            finalVisualPrompt,
            brief.aspectRatio,
            selectedCharacter?.dna,
            modelType
          );
          results.push(image);
          setBatchResults([...results]);
        }
        setBatchProgress(i + 1);
      }
    } catch (err: any) {
      setError(`Batch failed at item ${batchProgress + 1}: ${err.message}`);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Preset Handlers
  const handleLoadPreset = (preset: Preset) => {
    setSelectedId(preset.blueprintId);
    if (preset.brandId) setSelectedBrandId(preset.brandId);
    if (preset.characterId) setSelectedCharacterId(preset.characterId);
    if (preset.aspectRatio) setBrief(prev => ({ ...prev, aspectRatio: preset.aspectRatio! }));
    if (preset.intensity) setIntensity(preset.intensity);
    if (preset.themeMode) setThemeMode(preset.themeMode);
  };

  const handleSavePreset = () => {
    if (!presetName.trim() || !selectedId) return;
    const newPreset: Preset = {
      id: Date.now().toString(),
      name: presetName,
      blueprintId: selectedId,
      brandId: selectedBrandId || undefined,
      characterId: selectedCharacterId || undefined,
      aspectRatio: brief.aspectRatio,
      intensity,
      themeMode,
      createdAt: Date.now()
    };
    onSavePreset(newPreset);
    setShowPresetModal(false);
    setPresetName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Post Generator</h2>
            <p className="text-slate-500 dark:text-slate-400">Deploy content into design systems.</p>
          </div>
        </div>

        {/* MODE TABS */}
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <button
            onClick={() => setMode('quick')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'quick' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Zap size={14} />
            <span>Quick</span>
          </button>
          <button
            onClick={() => setMode('library')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'library' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <LayoutTemplate size={14} />
            <span>Library</span>
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'batch' ? 'bg-green-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            <List size={14} />
            <span>Batch</span>
          </button>
        </div>
      </div>

      {/* PRESETS PANEL (Show in Library mode) */}
      {mode === 'library' && presets.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 border border-indigo-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-indigo-500 dark:text-indigo-400">
              <Bookmark size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">My Presets</span>
            </div>
          </div>
          <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
            {presets.map(preset => {
              const blueprint = references.find(r => r.id === preset.blueprintId);
              return (
                <div
                  key={preset.id}
                  onClick={() => handleLoadPreset(preset)}
                  className="shrink-0 flex items-center space-x-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 cursor-pointer group transition-all"
                >
                  {blueprint && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={blueprint.templateImage || blueprint.imageSource} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{preset.name}</p>
                    <p className="text-[10px] text-slate-500">{blueprint?.name || 'Unknown Blueprint'}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeletePreset(preset.id); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK MODE UI */}
      {mode === 'quick' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Image Upload */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 shadow-xl backdrop-blur-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Upload size={18} className="text-orange-500" />
                </div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Upload</label>
              </div>

              <input type="file" ref={quickFileRef} onChange={handleQuickImageUpload} className="hidden" accept="image/*" />

              {quickImage ? (
                <div className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-4">
                  <img src={quickImage} className="w-full h-full object-cover" />
                  {isAnalyzingQuick && (
                    <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center">
                      <Loader2 className="animate-spin text-orange-400 mb-2" size={32} />
                      <span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">Analyzing DNA...</span>
                    </div>
                  )}
                  {quickDNA && !isAnalyzingQuick && (
                    <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-green-500/90 text-white text-xs font-bold flex items-center space-x-2">
                      <Check size={14} />
                      <span>DNA Extracted! Ready to generate.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => quickFileRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-orange-500/50 transition-all cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-orange-500"
                >
                  <ImageIcon size={48} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold">Drop image or click to upload</p>
                  <p className="text-[10px] text-slate-500 mt-1">DNA will be analyzed automatically</p>
                </div>
              )}

              {quickImage && (
                <button
                  onClick={() => { setQuickImage(null); setQuickDNA(null); }}
                  className="w-full py-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear & Upload New
                </button>
              )}
            </div>

            {/* Quick Brief */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 shadow-xl backdrop-blur-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <Sparkles size={18} className="text-orange-500" />
                </div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quick Brief</label>
              </div>

              <textarea
                placeholder="Describe your content... (e.g., 'New product launch announcement with bold headline: SUMMER SALE')"
                rows={6}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500/30 outline-none resize-none mb-4 text-slate-900 dark:text-white"
                value={brief.elements_to_display}
                onChange={(e) => setBrief({ ...brief, elements_to_display: e.target.value })}
              />

              <div className="flex items-center space-x-4 mb-6">
                <select value={brief.aspectRatio} onChange={(e) => setBrief({ ...brief, aspectRatio: e.target.value as AspectRatio })} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white">
                  <option value="1:1">1:1 Square</option>
                  <option value="4:3">4:3 Slide</option>
                  <option value="9:16">9:16 Story</option>
                  <option value="16:9">16:9 Landscape</option>
                </select>
              </div>

              <button
                onClick={handleQuickGenerate}
                disabled={loading || !quickDNA}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-xl'}`}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                <span>{loading ? 'Generating...' : 'Quick Deploy'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH MODE UI */}
      {mode === 'batch' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Batch Config */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 shadow-xl backdrop-blur-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <List size={18} className="text-green-500" />
                </div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Batch Configuration</label>
              </div>

              <div className="space-y-4 mb-6">
                <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  <option value="">Select Blueprint...</option>
                  {references.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>

                <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white" value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)}>
                  <option value="">No Brand (Optional)</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>

                <select value={brief.aspectRatio} onChange={(e) => setBrief({ ...brief, aspectRatio: e.target.value as AspectRatio })} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white">
                  <option value="1:1">1:1 Square</option>
                  <option value="4:3">4:3 Slide</option>
                  <option value="9:16">9:16 Story</option>
                </select>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enter Briefs (One per line)</label>
                <textarea
                  placeholder="Monday motivation quote&#10;Product feature highlight&#10;Customer testimonial&#10;Behind the scenes..."
                  rows={8}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-green-500/30 outline-none resize-none font-mono text-slate-900 dark:text-white"
                  value={batchBriefs}
                  onChange={(e) => setBatchBriefs(e.target.value)}
                />
                <p className="text-[10px] text-slate-500">{batchBriefs.split('\n').filter(l => l.trim()).length} items ready</p>
              </div>

              <button
                onClick={handleBatchGenerate}
                disabled={isBatchGenerating || !selectedId || batchBriefs.trim() === ''}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all ${isBatchGenerating ? 'bg-slate-800 text-slate-500' : 'bg-green-500 hover:bg-green-400 text-white shadow-xl'}`}
              >
                {isBatchGenerating ? <Loader2 className="animate-spin" size={20} /> : <Rocket size={20} />}
                <span>{isBatchGenerating ? `Generating ${batchProgress} of ${batchBriefs.split('\n').filter(l => l.trim()).length}...` : 'Deploy All'}</span>
              </button>
            </div>

            {/* Batch Results */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 shadow-xl backdrop-blur-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Grid size={18} className="text-green-500" />
                </div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Results ({batchResults.length})</label>
              </div>

              {batchResults.length === 0 ? (
                <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                  <Grid size={48} className="mb-4 opacity-30" />
                  <p className="text-sm font-bold">Results will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {batchResults.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:scale-105 transition-transform" onClick={() => setFullPreview(img)}>
                      <img src={img} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIBRARY MODE (Original UI) */}
      {mode === 'library' && (
        <div className="space-y-8">
          {/* TOP ROW: SELECTION & LOGIC */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* 1. SELECT COMPONENTS */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 shadow-xl dark:shadow-2xl backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <LayoutTemplate size={18} className="text-blue-500 dark:text-blue-400" />
                  </div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">1. Select Components</label>
                </div>
                {selectedId && (
                  <button
                    onClick={() => setShowPresetModal(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                  >
                    <Bookmark size={12} />
                    <span>Save Preset</span>
                  </button>
                )}
              </div>

              <div className="space-y-6">
                {/* BLUEPRINTS PICKER */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Blueprints</p>
                  <div className="flex space-x-3 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                    {references.map(r => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`shrink-0 w-24 h-24 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group relative ${selectedId === r.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <img src={r.templateImage || r.imageSource} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                        <div className={`absolute inset-0 bg-blue-500/10 ${selectedId === r.id ? 'opacity-100' : 'opacity-0'} group-hover:opacity-100 transition-opacity`} />
                        <div className="absolute bottom-0 inset-x-0 p-1 bg-black/60 backdrop-blur-sm">
                          <p className="text-[8px] font-bold text-white truncate text-center uppercase tracking-tighter">{r.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BRANDS PICKER */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Brand Identity (Optional)</p>
                  <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
                    <div
                      onClick={() => setSelectedBrandId('')}
                      className={`shrink-0 w-16 h-16 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center bg-slate-800/30 ${selectedBrandId === '' ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-800'}`}
                    >
                      <XCircle size={14} className="text-slate-500" />
                    </div>
                    {brands.map(b => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBrandId(b.id)}
                        className={`shrink-0 w-16 h-16 rounded-full border-2 transition-all cursor-pointer overflow-hidden bg-slate-950 p-2 ${selectedBrandId === b.id ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)]' : 'border-slate-800 hover:border-slate-700'}`}
                      >
                        <img src={b.imageSource} className="w-full h-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* CHARACTER PICKER */}
                {selectedRef?.jsonSpec.structural_rules.has_character_slot && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest ml-1 flex items-center">
                      <Rocket size={10} className="mr-1.5" /> Character Slot Detected
                    </p>
                    <div className="flex space-x-3 overflow-x-auto pb-2 no-scrollbar">
                      <div
                        onClick={() => setSelectedCharacterId('')}
                        className={`shrink-0 w-16 h-16 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center bg-slate-800/30 ${selectedCharacterId === '' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-slate-800'}`}
                      >
                        <Sparkles size={14} className="text-slate-500" />
                      </div>
                      {characters.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCharacterId(c.id)}
                          className={`shrink-0 w-16 h-16 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden bg-black ${selectedCharacterId === c.id ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
                        >
                          <img src={c.dna.reference_images[0]} className="w-full h-full object-cover" />
                          {selectedCharacterId === c.id && (
                            <div className="absolute top-1 right-1">
                              <Check size={8} className="text-green-400 bg-green-950 rounded-full" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. GENERATION MODE */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 shadow-xl dark:shadow-2xl backdrop-blur-xl flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <Zap size={18} className="text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">2. Generation Mode</label>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setCarouselMode(!carouselMode)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${carouselMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-400'}`}>
                    <Layers size={12} />
                    <span>SEQUENCE</span>
                  </button>
                  <button onClick={() => setPrecisionMode(!precisionMode)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${precisionMode ? 'bg-blue-500/10 border-blue-500 text-blue-500 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-400'}`}>
                    <Target size={12} />
                    <span>SMART FILL</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-6">
                {/* TOPIC INPUT REMOVED per user request for single-context flow */}

                {precisionMode ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mb-1">Extracted DNA Slots</p>
                      {selectedRef?.jsonSpec.content_registry.map(field => (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-[10px] font-medium text-slate-400 ml-1">{field.label}</label>
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                            value={structuredData[field.id] || ''}
                            onChange={(e) => setStructuredData({ ...structuredData, [field.id]: e.target.value })}
                          />
                        </div>
                      ))}
                      {(!selectedRef || selectedRef.jsonSpec.content_registry.length === 0) && (
                        <div className="py-12 flex flex-col items-center justify-center opacity-30">
                          <Target size={32} className="mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">No slots detected</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-500">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Context & Copy</label>
                      <textarea
                        placeholder="Describe specific elements, copy, or instructions..."
                        rows={6}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none text-slate-900 dark:text-white"
                        value={brief.elements_to_display}
                        onChange={(e) => setBrief({ ...brief, elements_to_display: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {carouselMode && (
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Sequence Order</span>
                    <div className="flex items-center space-x-2">
                      <input type="number" min="1" className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center" value={brief.slide_number} onChange={(e) => setBrief({ ...brief, slide_number: parseInt(e.target.value) })} />
                      <span className="text-slate-600">of</span>
                      <input type="number" min="1" className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center" value={brief.total_slides} onChange={(e) => setBrief({ ...brief, total_slides: parseInt(e.target.value) })} />
                    </div>
                  </div>
                )}

                {/* ACTION BAR RELOCATED HERE */}
                <div className="pt-6 mt-auto border-t border-slate-200 dark:border-slate-800/50 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/40 p-1 rounded-xl border border-slate-200 dark:border-slate-700/30">
                        <select value={brief.aspectRatio} onChange={(e) => setBrief({ ...brief, aspectRatio: e.target.value as AspectRatio })} className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer px-2">
                          <option value="1:1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">1:1 Square</option>
                          <option value="4:3" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">4:3 Slide</option>
                          <option value="3:4" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">3:4 Portrait</option>
                          <option value="9:16" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">9:16 Story</option>
                          <option value="16:9" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">16:9 Landscape</option>
                        </select>
                        <div className="w-px h-3 bg-slate-300 dark:bg-slate-700/50" />
                        <select value={intensity} onChange={(e) => setIntensity(e.target.value as RemixIntensity)} className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer px-2">
                          <option value="strict" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Strict DNA</option>
                          <option value="light" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Light Touch</option>
                          <option value="heavy" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Creative Heavy</option>
                        </select>
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/30">
                        <button
                          onClick={() => setThemeMode('light')}
                          className={`p-1.5 rounded-lg transition-all ${themeMode === 'light' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                          title="Force Light Theme"
                        >
                          <Sun size={14} />
                        </button>
                        <button
                          onClick={() => setThemeMode('dark')}
                          className={`p-1.5 rounded-lg transition-all ${themeMode === 'dark' ? 'bg-slate-950 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                          title="Force Dark Theme"
                        >
                          <Moon size={14} />
                        </button>
                        <button
                          onClick={() => setThemeMode('auto')}
                          className={`px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all ${themeMode === 'auto' ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                          title="Auto (Based on DNA)"
                        >
                          AUTO
                        </button>
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/30">
                        <button
                          onClick={() => setModelType('flash')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${modelType === 'flash' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                          title="gemini-2.0-flash (free)"
                        >
                          FLASH
                        </button>
                        <button
                          onClick={() => setModelType('flash-latest')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${modelType === 'flash-latest' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                          title="gemini-flash-latest (free, newest)"
                        >
                          FLASH+
                        </button>
                        <button
                          onClick={() => setModelType('pro')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${modelType === 'pro' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                          title="gemini-2.5-pro (paid)"
                        >
                          PRO
                        </button>
                        <button
                          onClick={() => setModelType('pro-3')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${modelType === 'pro-3' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                          title="gemini-3-pro (reserved — uses 2.5-pro until released)"
                        >
                          PRO 3
                        </button>
                        <button
                          onClick={() => setModelType('custom')}
                          className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all ${modelType === 'custom' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}
                          title="Custom model — set in Settings > Models"
                        >
                          CUSTOM
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handlePreviewPrompt}
                      disabled={!selectedId}
                      className="py-4 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center space-x-2"
                    >
                      <Eye size={18} />
                      <span>View Prompt</span>
                    </button>
                    <button onClick={handleGenerate} disabled={loading || !selectedId} className={`py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl hover:shadow-indigo-500/20'}`}>
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      <span>{loading ? 'SYNTHESIZING...' : 'Deploy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: SYNTHESIS CHAMBER */}
          <div className="p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 shadow-[0_0_50px_rgba(0,0,0,0.05)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)] backdrop-blur-xl space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/50 pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Rocket size={24} className="text-green-500 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">The Synthesis Chamber</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{loading ? 'Processing Visuals...' : 'Ready for Deployment'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* RENDER VIEWPORT */}
              <div className="lg:col-span-7 space-y-6">
                <div className="aspect-square relative rounded-[2.5rem] overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center p-4 group">
                  {remixImage ? (
                    <img src={remixImage} className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-700" alt="Result" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-700 opacity-20">
                      <Zap size={80} className="mb-4" />
                      <p className="text-xl font-bold uppercase tracking-[0.5em]">Chamber Ready</p>
                    </div>
                  )}
                  {imageLoading && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center z-10">
                      <Zap className="animate-bounce text-indigo-400 mb-4" size={48} />
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.3em]">Pulverizing Visual DNA...</span>
                    </div>
                  )}
                  {remixImage && !imageLoading && (
                    <div className="absolute top-6 right-6 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={handleSaveResult} disabled={isSaved} className={`p-3 rounded-xl transition-all ${isSaved ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-slate-900/90 backdrop-blur-md text-white hover:bg-green-600 border border-white/10'}`}>
                        {isSaved ? <Check size={20} /> : <Save size={20} />}
                      </button>
                    </div>
                  )}
                </div>

                {remixImage && (
                  <div className="flex items-center space-x-3 p-2 bg-slate-950/50 border border-slate-800 rounded-[1.5rem] animate-in slide-in-from-bottom-4">
                    <input type="text" placeholder="Visual correction or retouching..." className="flex-1 bg-transparent border-none px-6 py-3 text-sm focus:ring-0 outline-none" value={refineInput} onChange={(e) => setRefineInput(e.target.value)} disabled={isRefining} />
                    <div className="flex space-x-2 pr-2">
                      <button onClick={() => setIsAnnotating(true)} className={`p-3 rounded-xl border transition-all ${annotationSketch ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'}`}>
                        <Target size={18} />
                      </button>
                      <button onClick={handleRefine} disabled={!refineInput || isRefining} className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl text-white font-bold text-xs flex items-center space-x-2">
                        {isRefining ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /><span>Apply Change</span></>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SYNTHESIS REPORT */}
              <div className="lg:col-span-5 flex flex-col h-full">
                {resultText ? (
                  <div className="flex-1 rounded-[2.5rem] bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-8 flex flex-col shadow-inner">
                    <div className="flex items-center space-x-2 mb-6 text-slate-500">
                      <Sparkles size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Synthesis Neural Report</span>
                    </div>
                    <div className="flex-1 overflow-y-auto text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-light scrollbar-hide">
                      {resultText}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 border-dashed p-8 flex flex-col items-center justify-center opacity-20 hover:opacity-40 transition-opacity">
                    <FileCode size={48} className="mb-4 text-slate-500 dark:text-slate-600" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600 text-center max-w-[200px]">Waiting for Synthesis deployment</p>
                  </div>
                )}
                {error && <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in shake duration-300"><AlertCircle size={14} className="inline mr-2" />{error}</div>}
              </div>
            </div>
          </div>

          {isAnnotating && remixImage && (
            <AnnotationCanvas
              imageSource={remixImage}
              onCancel={() => setIsAnnotating(false)}
              onSave={(sketch) => {
                setAnnotationSketch(sketch);
              }}
            />
          )
          }

          {
            fullPreview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/95 animate-in fade-in duration-300">
                <button onClick={() => setFullPreview(null)} className="absolute top-8 right-8 p-4 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10">
                  <XCircle size={32} />
                </button>
                <img src={fullPreview} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/10" alt="Full Preview" />
              </div>
            )
          }

          {
            promptPreview && (
              <PromptPreviewModal
                data={promptPreview}
                onClose={() => setPromptPreview(null)}
                title="Post Generator Prompt"
              />
            )
          }
        </div >
      )}

      {/* PRESET SAVE MODAL */}
      {showPresetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Bookmark size={24} className="text-indigo-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Save Preset</h3>
                <p className="text-xs text-slate-500">Save your current configuration for quick access</p>
              </div>
            </div>

            <input
              type="text"
              placeholder="Preset name (e.g., 'Quote Template')"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm mb-6 outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              autoFocus
            />

            <div className="flex space-x-3">
              <button
                onClick={() => { setShowPresetModal(false); setPresetName(''); }}
                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 font-bold transition-colors"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default Generator;
