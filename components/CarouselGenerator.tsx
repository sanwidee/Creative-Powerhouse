
import React, { useState } from 'react';
import { Layers, Sparkles, ArrowLeft, Save, Loader2, Target, Eye, XCircle, AlertCircle, Zap, Bookmark, Trash2, Brain, Play, CheckCircle2, Circle, AlertTriangle, Download } from 'lucide-react';
import { DesignReference, BrandReference, CharacterReference, GeneratedCarousel, CarouselSlide, AspectRatio, Preset, PlannedSlide } from '../types';
import { generatePostFromReference, generateRemixImage, planCarouselContent } from '../services/geminiService';
import PromptPreviewModal from './PromptPreviewModal';
import { PromptData } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface CarouselGeneratorProps {
    references: DesignReference[];
    brands: BrandReference[];
    characters: CharacterReference[];
    presets: Preset[];
    onSave: (carousel: GeneratedCarousel) => void;
    onSavePreset: (preset: Preset) => void;
    onDeletePreset: (id: string) => void;
    onBack: () => void;
}

type WorkflowPhase = 'setup' | 'planning' | 'generating' | 'complete';

const CarouselGenerator: React.FC<CarouselGeneratorProps> = ({ references, brands, characters, presets, onSave, onSavePreset, onDeletePreset, onBack }) => {
    // Setup state
    const [selectedId, setSelectedId] = useState<string>('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [carouselName, setCarouselName] = useState('New Carousel');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');

    // Batch workflow state
    const [batchBrief, setBatchBrief] = useState('');
    const [slideCount, setSlideCount] = useState(5);
    const [plannedSlides, setPlannedSlides] = useState<PlannedSlide[]>([]);
    const [phase, setPhase] = useState<WorkflowPhase>('setup');
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    // UI state
    const [fullPreview, setFullPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedRef = references.find(r => r.id === selectedId);
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

    // Preset loading handler
    const handleLoadPreset = (preset: Preset) => {
        setSelectedId(preset.blueprintId);
        if (preset.brandId) setSelectedBrandId(preset.brandId);
        if (preset.characterId) setSelectedCharacterId(preset.characterId);
        if (preset.aspectRatio) setAspectRatio(preset.aspectRatio);
    };

    // Phase 1: Plan carousel content
    const handlePlanAndGenerate = async () => {
        if (!selectedRef || !batchBrief.trim()) return;

        setError(null);
        setPhase('planning');
        setPlannedSlides([]);

        try {
            const { slides } = await planCarouselContent(
                selectedRef.jsonSpec,
                batchBrief,
                slideCount,
                selectedBrand?.dna,
                selectedCharacter?.dna
            );

            setPlannedSlides(slides);
            setActiveSlideIndex(0);

            // Immediately start generation after planning
            await generateAllSlides(slides);
        } catch (err: any) {
            setError(err.message || "Planning failed. Please try again.");
            setPhase('setup');
        }
    };

    // Phase 2: Generate all slides sequentially
    const generateAllSlides = async (slides: PlannedSlide[]) => {
        if (!selectedRef) return;

        setPhase('generating');
        const updatedSlides = [...slides];

        try {
            for (let i = 0; i < slides.length; i++) {
                // Update status to generating
                updatedSlides[i] = { ...updatedSlides[i], status: 'generating' };
                setPlannedSlides([...updatedSlides]);
                setActiveSlideIndex(i);

                const brief = {
                    topic: carouselName,
                    elements_to_display: slides[i].copyBrief,
                    copy_instructions: slides[i].visualContext,
                    target_audience: 'General',
                    aspectRatio,
                    slide_number: i + 1,
                    total_slides: slides.length
                };

                const { finalVisualPrompt } = await generatePostFromReference(
                    selectedRef.jsonSpec,
                    brief,
                    'strict',
                    selectedBrand?.dna,
                    selectedCharacter?.dna,
                    'flash',
                    'auto',
                    selectedRef.imageSource
                );

                if (finalVisualPrompt) {
                    const { image } = await generateRemixImage(
                        finalVisualPrompt,
                        aspectRatio,
                        selectedCharacter?.dna,
                        'flash',
                        slides[i].poseInstruction
                    );
                    updatedSlides[i] = { ...updatedSlides[i], generatedImage: image, status: 'done' };
                } else {
                    updatedSlides[i] = { ...updatedSlides[i], status: 'error' };
                }

                setPlannedSlides([...updatedSlides]);
            }

            setPhase('complete');
        } catch (err: any) {
            const failedIndex = updatedSlides.findIndex(s => s.status === 'generating');
            if (failedIndex >= 0) {
                updatedSlides[failedIndex] = { ...updatedSlides[failedIndex], status: 'error' };
                setPlannedSlides([...updatedSlides]);
            }
            setError(`Generation failed at slide ${failedIndex + 1}: ${err.message}`);
            setPhase('complete');
        }
    };

    const handleSave = () => {
        if (!selectedRef) return;
        const slides: CarouselSlide[] = plannedSlides
            .filter(s => s.generatedImage)
            .map((s, idx) => ({
                id: Date.now().toString() + idx,
                slideNumber: s.slideNumber,
                copyBrief: s.copyBrief,
                generatedImage: s.generatedImage
            }));

        if (slides.length === 0) return;

        const carousel: GeneratedCarousel = {
            id: Date.now().toString(),
            name: carouselName,
            slides,
            blueprintId: selectedRef.id,
            brandId: selectedBrandId || undefined,
            characterId: selectedCharacterId || undefined,
            createdAt: Date.now()
        };

        try {
            onSave(carousel);
            // Navigate back after successful save
            onBack();
        } catch (err) {
            setError('Failed to save carousel. Please try again.');
        }
    };

    const handleReset = () => {
        setPhase('setup');
        setPlannedSlides([]);
        setBatchBrief('');
        setError(null);
        setActiveSlideIndex(0);
    };

    const handleDownloadZip = async () => {
        const slidesWithImages = plannedSlides.filter(s => s.generatedImage);
        if (slidesWithImages.length === 0) return;

        const zip = new JSZip();
        const folder = zip.folder(carouselName.replace(/[^a-zA-Z0-9]/g, '_') || 'carousel');

        for (let i = 0; i < slidesWithImages.length; i++) {
            const slide = slidesWithImages[i];
            if (slide.generatedImage) {
                // Convert base64 to blob
                const base64Data = slide.generatedImage.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let j = 0; j < byteCharacters.length; j++) {
                    byteNumbers[j] = byteCharacters.charCodeAt(j);
                }
                const byteArray = new Uint8Array(byteNumbers);

                folder?.file(`slide_${String(slide.slideNumber).padStart(2, '0')}.png`, byteArray);
            }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${carouselName.replace(/[^a-zA-Z0-9]/g, '_') || 'carousel'}.zip`);
    };

    const getStatusIcon = (status: PlannedSlide['status']) => {
        switch (status) {
            case 'done': return <CheckCircle2 size={14} className="text-green-400" />;
            case 'generating': return <Loader2 size={14} className="text-blue-400 animate-spin" />;
            case 'error': return <AlertTriangle size={14} className="text-red-400" />;
            default: return <Circle size={14} className="text-slate-600" />;
        }
    };

    const completedCount = plannedSlides.filter(s => s.status === 'done').length;
    const canSave = completedCount > 0 && phase === 'complete';

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center space-x-6">
                    <button onClick={onBack} className="p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-sm">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Layers size={16} className="text-blue-400" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight">Make a carousel</h2>
                        </div>
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em]">Multi-slide story</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-800/40 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/30">
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer px-4 hover:text-slate-900 dark:hover:text-slate-300" disabled={phase !== 'setup'}>
                            <option value="4:3" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">4:3 Carousel</option>
                            <option value="4:5" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">4:5 IG Post</option>
                            <option value="3:4" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">3:4 Portrait</option>
                            <option value="1:1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">1:1 Square</option>
                            <option value="9:16" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">9:16 Story</option>
                        </select>
                    </div>
                    {phase === 'complete' && (
                        <button onClick={handleReset} className="px-6 py-3 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all">
                            New Batch
                        </button>
                    )}
                    <button
                        onClick={handleDownloadZip}
                        disabled={completedCount === 0}
                        className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold transition-all shadow-xl shadow-blue-900/20"
                    >
                        <Download size={18} />
                        <span>Download ZIP</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!canSave}
                        className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold transition-all shadow-xl shadow-green-900/20"
                    >
                        <Save size={18} />
                        <span>Save Carousel</span>
                    </button>
                </div>
            </div>

            {/* PRESETS PANEL */}
            {presets.length > 0 && phase === 'setup' && (
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)]">
                {/* LEFT COLUMN: SETUP & CONTROLS */}
                <div className="lg:col-span-4 flex flex-col h-full bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* BLUEPRINT SETUP */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 mb-2">
                                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <Target size={18} className="text-indigo-400" />
                                </div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">DNA Setup</label>
                            </div>

                            <input
                                type="text"
                                value={carouselName}
                                onChange={(e) => setCarouselName(e.target.value)}
                                placeholder="Carousel Name..."
                                disabled={phase !== 'setup'}
                                className="w-full px-5 py-3 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm focus:ring-1 focus:ring-blue-500/50 outline-none font-bold text-slate-900 dark:text-white disabled:opacity-50"
                            />

                            <select
                                className="w-full px-5 py-3 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-900 dark:text-white disabled:opacity-50"
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                disabled={phase !== 'setup'}
                            >
                                <option value="" className="bg-white dark:bg-slate-900">Select Blueprint...</option>
                                {references.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">{r.name}</option>)}
                            </select>

                            <select
                                className="w-full px-5 py-3 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-900 dark:text-white disabled:opacity-50"
                                value={selectedBrandId}
                                onChange={(e) => setSelectedBrandId(e.target.value)}
                                disabled={phase !== 'setup'}
                            >
                                <option value="" className="bg-white dark:bg-slate-900">Brand DNA (Optional)...</option>
                                {brands.map(b => <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900">{b.name}</option>)}
                            </select>

                            {selectedRef?.jsonSpec.structural_rules.has_character_slot && (
                                <select
                                    className="w-full px-5 py-3 bg-white dark:bg-slate-950/50 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-sm outline-none focus:ring-1 focus:ring-green-500/50 font-bold disabled:opacity-50"
                                    value={selectedCharacterId}
                                    onChange={(e) => setSelectedCharacterId(e.target.value)}
                                    disabled={phase !== 'setup'}
                                >
                                    <option value="" className="bg-white dark:bg-slate-900">Inject Character/Mascot...</option>
                                    {characters.map(c => <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c.name}</option>)}
                                </select>
                            )}
                        </div>

                        <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />

                        {/* BATCH BRIEF INPUT */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                    <Brain size={18} className="text-orange-400" />
                                </div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Batch Brief</label>
                            </div>

                            <textarea
                                value={batchBrief}
                                onChange={(e) => setBatchBrief(e.target.value)}
                                placeholder="Describe your entire carousel content in one brief. AI will break it down into individual slides...

Example: '5 productivity tips for remote workers - covering morning routines, workspace setup, break scheduling, communication tools, and work-life balance'"
                                disabled={phase !== 'setup'}
                                className="w-full h-40 px-5 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500/30 outline-none resize-none leading-relaxed text-slate-900 dark:text-white disabled:opacity-50"
                            />

                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Slide Count</label>
                                <div className="flex items-center space-x-2">
                                    {[3, 5, 7, 10].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setSlideCount(num)}
                                            disabled={phase !== 'setup'}
                                            className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${slideCount === num
                                                ? 'bg-orange-500 text-white shadow-lg'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'} disabled:opacity-50`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* PLAN PREVIEW (When available) */}
                        {plannedSlides.length > 0 && (
                            <>
                                <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slide Plan</label>
                                        <span className="text-[10px] font-bold text-blue-400">{completedCount}/{plannedSlides.length} Done</span>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                        {plannedSlides.map((slide, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setActiveSlideIndex(idx)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer ${activeSlideIndex === idx
                                                    ? 'bg-blue-500/10 border-blue-500/50'
                                                    : 'bg-white dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/50 hover:border-slate-400'}`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="flex items-center space-x-2">
                                                        {getStatusIcon(slide.status)}
                                                        <span className="text-[10px] font-bold text-slate-400">#{slide.slideNumber}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 flex-1">{slide.copyBrief}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* FIXED BOTTOM ACTION */}
                    <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
                        {phase === 'setup' && (
                            <button
                                onClick={handlePlanAndGenerate}
                                disabled={!selectedId || !batchBrief.trim()}
                                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl ${!selectedId || !batchBrief.trim()
                                    ? 'bg-slate-800 text-slate-500'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white hover:shadow-indigo-500/20'}`}
                            >
                                <Sparkles size={20} />
                                <span className="text-sm">Plan & Generate {slideCount} Slides</span>
                            </button>
                        )}

                        {phase === 'planning' && (
                            <div className="flex flex-col items-center space-y-3">
                                <div className="flex items-center space-x-3 text-indigo-400">
                                    <Brain className="animate-pulse" size={24} />
                                    <span className="text-sm font-bold">AI Planning Your Slides...</span>
                                </div>
                            </div>
                        )}

                        {phase === 'generating' && (
                            <div className="flex flex-col items-center space-y-3">
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500"
                                        style={{ width: `${(completedCount / plannedSlides.length) * 100}%` }}
                                    />
                                </div>
                                <div className="flex items-center space-x-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>Generating Slide {completedCount + 1} of {plannedSlides.length}</span>
                                </div>
                            </div>
                        )}

                        {phase === 'complete' && (
                            <div className="flex items-center justify-center space-x-2 text-green-400">
                                <CheckCircle2 size={20} />
                                <span className="text-sm font-bold">{completedCount} Slides Generated</span>
                            </div>
                        )}

                        {error && (
                            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-2">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: PREVIEW & FILMSTRIP */}
                <div className="lg:col-span-8 flex flex-col h-full space-y-6">
                    {/* MAIN PREVIEW */}
                    <div className={`relative w-full rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-center group transition-all duration-500 flex-1 ${aspectRatio === '1:1' ? 'max-w-[65vh] mx-auto aspect-square' : aspectRatio === '9:16' ? 'max-w-[45vh] mx-auto aspect-[9/16]' : aspectRatio === '3:4' ? 'max-w-[55vh] mx-auto aspect-[3/4]' : 'w-full aspect-[4/3]'}`}>
                        {plannedSlides[activeSlideIndex]?.generatedImage ? (
                            <img src={plannedSlides[activeSlideIndex].generatedImage} className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500" alt="Preview" />
                        ) : plannedSlides[activeSlideIndex]?.status === 'generating' ? (
                            <div className="flex flex-col items-center justify-center text-indigo-400">
                                <Loader2 size={64} className="animate-spin mb-6" />
                                <p className="text-xs font-bold uppercase tracking-[0.3em]">Generating Slide {activeSlideIndex + 1}...</p>
                                <p className="text-[10px] text-slate-500 mt-2 max-w-sm text-center">{plannedSlides[activeSlideIndex]?.copyBrief}</p>
                            </div>
                        ) : plannedSlides[activeSlideIndex] ? (
                            <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                                <Circle size={64} className="mb-6 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2">Pending</p>
                                <p className="text-[10px] text-slate-400 max-w-sm">{plannedSlides[activeSlideIndex]?.copyBrief}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-800 opacity-20">
                                <Zap size={80} className="mb-6" />
                                <p className="text-2xl font-bold uppercase tracking-[0.4em]">Ready</p>
                                <p className="text-xs text-slate-500 mt-2">Enter a brief and click Generate</p>
                            </div>
                        )}

                        {plannedSlides[activeSlideIndex]?.generatedImage && (
                            <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setFullPreview(plannedSlides[activeSlideIndex].generatedImage!)} className="p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md text-white hover:bg-slate-800 border border-white/10 shadow-xl">
                                    <Eye size={24} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* FILMSTRIP */}
                    <div className="h-32 p-4 rounded-[2rem] bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-center space-y-2 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center justify-between px-2">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Deck Sequence</p>
                            <span className="text-[9px] font-bold text-blue-500">{plannedSlides.length > 0 ? `${activeSlideIndex + 1} / ${plannedSlides.length}` : `0 / ${slideCount}`}</span>
                        </div>
                        <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar px-1 h-full items-center">
                            {plannedSlides.length > 0 ? (
                                plannedSlides.map((slide, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setActiveSlideIndex(i)}
                                        className={`flex-shrink-0 h-16 w-16 rounded-xl border-2 transition-all cursor-pointer overflow-hidden relative group ${i === activeSlideIndex ? 'border-blue-500 shadow-lg shadow-blue-900/20 scale-105' : 'border-slate-300 dark:border-slate-800 opacity-50 hover:opacity-100'}`}
                                    >
                                        {slide.generatedImage ? (
                                            <img src={slide.generatedImage} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center ${slide.status === 'generating' ? 'bg-indigo-500/10' : 'bg-slate-100 dark:bg-slate-950'}`}>
                                                {slide.status === 'generating' ? (
                                                    <Loader2 size={16} className="text-indigo-400 animate-spin" />
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-700">{i + 1}</span>
                                                )}
                                            </div>
                                        )}
                                        {i === activeSlideIndex && <div className="absolute inset-0 ring-1 ring-blue-500 rounded-xl" />}
                                    </div>
                                ))
                            ) : (
                                // Placeholder slots
                                Array.from({ length: slideCount }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="flex-shrink-0 h-16 w-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center"
                                    >
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-700">{i + 1}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {fullPreview && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/95 animate-in fade-in duration-300">
                    <button onClick={() => setFullPreview(null)} className="absolute top-8 right-8 p-4 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10">
                        <XCircle size={32} />
                    </button>
                    <img src={fullPreview} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/10" alt="Full Preview" />
                </div>
            )}
        </div>
    );
};

export default CarouselGenerator;
