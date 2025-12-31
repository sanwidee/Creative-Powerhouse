
import React, { useState } from 'react';
import { Layers, Plus, Trash2, Sparkles, Wand2, ArrowLeft, ChevronRight, ChevronLeft, Save, Loader2, Target, Eye, XCircle, AlertCircle, LayoutTemplate, Palette, Zap } from 'lucide-react';
import { DesignReference, BrandReference, CharacterReference, GeneratedCarousel, CarouselSlide, AspectRatio } from '../types';
import { generatePostFromReference, generateRemixImage, getPostPromptData } from '../services/geminiService';
import PromptPreviewModal from './PromptPreviewModal';
import { PromptData } from '../types';

interface CarouselGeneratorProps {
    references: DesignReference[];
    brands: BrandReference[];
    characters: CharacterReference[];
    onSave: (carousel: GeneratedCarousel) => void;
    onBack: () => void;
}

const CarouselGenerator: React.FC<CarouselGeneratorProps> = ({ references, brands, characters, onSave, onBack }) => {
    const [selectedId, setSelectedId] = useState<string>('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [carouselName, setCarouselName] = useState('New Carousel');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');

    const [slides, setSlides] = useState<CarouselSlide[]>([
        { id: '1', slideNumber: 1, copyBrief: '', styleBrief: '' }
    ]);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCount, setGeneratedCount] = useState(0);
    const [fullPreview, setFullPreview] = useState<string | null>(null);
    const [promptPreview, setPromptPreview] = useState<PromptData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedRef = references.find(r => r.id === selectedId);
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

    const addSlide = () => {
        const newSlide: CarouselSlide = {
            id: Date.now().toString(),
            slideNumber: slides.length + 1,
            copyBrief: '',
            styleBrief: ''
        };
        setSlides([...slides, newSlide]);
        setActiveSlideIndex(slides.length);
    };

    const removeSlide = (index: number) => {
        if (slides.length <= 1) return;
        const newSlides = slides.filter((_, i) => i !== index).map((s, i) => ({ ...s, slideNumber: i + 1 }));
        setSlides(newSlides);
        if (activeSlideIndex >= newSlides.length) setActiveSlideIndex(newSlides.length - 1);
    };

    const updateSlide = (index: number, updates: Partial<CarouselSlide>) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], ...updates };
        setSlides(newSlides);
    };

    const handleGenerateAll = async () => {
        if (!selectedRef) return;
        setIsGenerating(true);
        setGeneratedCount(0);
        setError(null);

        const updatedSlides = [...slides];

        try {
            for (let i = 0; i < slides.length; i++) {
                const slide = slides[i];

                const brief = {
                    topic: carouselName,
                    elements_to_display: slide.copyBrief,
                    copy_instructions: slide.styleBrief,
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
                    selectedCharacter?.dna
                );

                if (finalVisualPrompt) {
                    const { image } = await generateRemixImage(finalVisualPrompt, aspectRatio);
                    updatedSlides[i] = { ...updatedSlides[i], generatedImage: image };
                    setSlides([...updatedSlides]);
                    setGeneratedCount(i + 1);
                }
            }
        } catch (err: any) {
            setError(err.message || "Carousel generation failed at slide " + (generatedCount + 1));
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePreviewPrompt = () => {
        if (!selectedRef) return;
        const slide = slides[activeSlideIndex];
        const brief = {
            topic: carouselName,
            elements_to_display: slide.copyBrief,
            copy_instructions: slide.styleBrief,
            target_audience: 'General',
            aspectRatio,
            slide_number: activeSlideIndex + 1,
            total_slides: slides.length
        };
        const data = getPostPromptData(
            selectedRef.jsonSpec,
            brief,
            'strict',
            selectedBrand?.dna,
            selectedCharacter?.dna
        );
        setPromptPreview(data);
    };

    const handleSave = () => {
        if (!selectedRef) return;
        const carousel: GeneratedCarousel = {
            id: Date.now().toString(),
            name: carouselName,
            slides: slides.filter(s => s.generatedImage),
            blueprintId: selectedRef.id,
            brandId: selectedBrandId || undefined,
            characterId: selectedCharacterId || undefined,
            createdAt: Date.now()
        };
        onSave(carousel);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-12">
                <div className="flex items-center space-x-6">
                    <button onClick={onBack} className="p-4 rounded-2xl bg-slate-800/50 text-slate-400 hover:text-white transition-all">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <Layers size={16} className="text-blue-400" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight">Carousel Generator</h2>
                        </div>
                        <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.2em]">Multi-Slide Production Unit</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-slate-800/40 p-1.5 rounded-2xl border border-slate-700/30">
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer px-4 hover:text-slate-300">
                            <option value="4:3" className="bg-slate-900">4:3 Carousel</option>
                            <option value="1:1" className="bg-slate-900">1:1 Square</option>
                            <option value="9:16" className="bg-slate-900">9:16 Story</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!slides.some(s => s.generatedImage)}
                        className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold transition-all shadow-xl shadow-green-900/20"
                    >
                        <Save size={18} />
                        <span>Save Carousel</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* LEFT COLUMN: CONFIGURATION */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="p-8 rounded-[3rem] bg-slate-900/40 border border-slate-800 space-y-8 shadow-2xl">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <Target size={18} className="text-indigo-400" />
                                </div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Blueprint & Setup</label>
                            </div>

                            <input
                                type="text"
                                value={carouselName}
                                onChange={(e) => setCarouselName(e.target.value)}
                                placeholder="Carousel Name..."
                                className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none font-bold"
                            />

                            <select className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                                <option value="" className="bg-slate-900">Select Universal Blueprint...</option>
                                {references.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
                            </select>

                            <select className="w-full px-6 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50" value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)}>
                                <option value="" className="bg-slate-900">Attach Brand Identity (Optional)...</option>
                                {brands.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                            </select>

                            {selectedRef?.jsonSpec.structural_rules.has_character_slot && (
                                <select className="w-full px-6 py-4 bg-slate-800 text-green-400 border border-green-500/30 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500/50 font-bold" value={selectedCharacterId} onChange={(e) => setSelectedCharacterId(e.target.value)}>
                                    <option value="" className="bg-slate-900">Inject Character DNA...</option>
                                    {characters.map(c => <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">{c.name}</option>)}
                                </select>
                            )}
                        </div>

                        <div className="pt-8 border-t border-slate-800 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <Layers size={18} className="text-purple-400" />
                                    </div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slide Sequence</label>
                                </div>
                                <button onClick={addSlide} className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all translate-y-1">
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {slides.map((slide, idx) => (
                                    <div
                                        key={slide.id}
                                        onClick={() => setActiveSlideIndex(idx)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${activeSlideIndex === idx ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'}`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${activeSlideIndex === idx ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-700 text-slate-400'}`}>
                                                {slide.slideNumber}
                                            </span>
                                            <div className="max-w-[150px] truncate uppercase tracking-widest text-[10px] font-bold text-slate-500">
                                                {slide.copyBrief || 'Empty Slide Content'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeSlide(idx); }}
                                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateAll}
                            disabled={isGenerating || !selectedId}
                            className={`w-full py-5 rounded-3xl font-bold flex items-center justify-center space-x-3 transition-all ${isGenerating ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl hover:translate-y-[-2px]'}`}
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
                            <span className="text-lg">Deploy {slides.length} Slides</span>
                        </button>

                        {isGenerating && (
                            <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                <span>Processing Slide {generatedCount + 1} of {slides.length}</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-2">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: SLIDE EDITOR & PREVIEW */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                        {/* EDITOR */}
                        <div className="p-10 rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-8">
                            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                        <Wand2 size={18} className="text-orange-400" />
                                    </div>
                                    <h3 className="text-xl font-bold">Slide {activeSlideIndex + 1} Editor</h3>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handlePreviewPrompt}
                                        disabled={!selectedId}
                                        className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all text-slate-400 border border-slate-700 hover:border-indigo-500/30"
                                        title="View Neural Prompt"
                                    >
                                        <Eye size={20} />
                                    </button>
                                    <button onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-slate-400"><ChevronLeft size={20} /></button>
                                    <button onClick={() => setActiveSlideIndex(Math.min(slides.length - 1, activeSlideIndex + 1))} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-slate-400"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Copy Brief / Headline</label>
                                    <textarea
                                        value={slides[activeSlideIndex].copyBrief}
                                        onChange={(e) => updateSlide(activeSlideIndex, { copyBrief: e.target.value })}
                                        placeholder="What is the main text on this slide?"
                                        className="w-full h-32 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-sm focus:ring-2 focus:ring-orange-500/30 outline-none resize-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">Visual / Style Nuance</label>
                                    <textarea
                                        value={slides[activeSlideIndex].styleBrief}
                                        onChange={(e) => updateSlide(activeSlideIndex, { styleBrief: e.target.value })}
                                        placeholder="Specific visual elements or mood for this slide..."
                                        className="w-full h-32 px-6 py-4 bg-slate-950 border border-slate-800 rounded-3xl text-sm focus:ring-2 focus:ring-orange-500/30 outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800 flex flex-col items-center justify-center opacity-30 text-center">
                                <LayoutTemplate size={32} className="mb-2" />
                                <p className="text-[10px] font-bold uppercase tracking-widest leading-loose">
                                    Slide {activeSlideIndex + 1} inherits the DNA <br />
                                    from the universal blueprint.
                                </p>
                            </div>
                        </div>

                        {/* VISUAL PREVIEW */}
                        <div className="flex flex-col space-y-6">
                            <div className="relative aspect-[4/3] rounded-[3rem] overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center group">
                                {slides[activeSlideIndex].generatedImage ? (
                                    <img src={slides[activeSlideIndex].generatedImage} className="w-full h-full object-contain animate-in fade-in zoom-in-95 duration-500" alt="Preview" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-800 opacity-20">
                                        <Zap size={64} className="mb-4" />
                                        <p className="text-xl font-bold uppercase tracking-[0.4em]">Visual Pending</p>
                                    </div>
                                )}

                                {slides[activeSlideIndex].generatedImage && (
                                    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setFullPreview(slides[activeSlideIndex].generatedImage!)} className="p-3 rounded-xl bg-slate-900/90 backdrop-blur-md text-white hover:bg-slate-800 border border-white/10">
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                )}

                                {isGenerating && activeSlideIndex === generatedCount && (
                                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center z-10 transition-all">
                                        <Zap className="animate-bounce text-indigo-400 mb-4" size={48} />
                                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.3em]">Building Slide {activeSlideIndex + 1}...</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 rounded-[2.5rem] bg-slate-900/60 border border-slate-800 flex-1 flex flex-col items-center justify-center space-y-4">
                                <div className="flex space-x-2">
                                    {slides.map((_, i) => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeSlideIndex ? 'w-8 bg-blue-500' : 'w-1.5 bg-slate-700'}`} />
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Carousel Progression</p>
                            </div>
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

            {promptPreview && (
                <PromptPreviewModal
                    data={promptPreview}
                    onClose={() => setPromptPreview(null)}
                    title={`Carousel Slide ${activeSlideIndex + 1} Prompt`}
                />
            )}
        </div>
    );
};

export default CarouselGenerator;
