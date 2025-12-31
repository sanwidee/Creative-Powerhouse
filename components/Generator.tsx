
import React, { useState } from 'react';
import { Rocket, Sparkles, ArrowLeft, ChevronDown, ImageIcon, Loader2, Copy, Check, Zap, AlertCircle, RefreshCw, Send, Palette, XCircle, Layers, Save, Target, LayoutTemplate, FileCode, Eye } from 'lucide-react';
import { DesignReference, BrandReference, RemixIntensity, ContentBrief, AspectRatio, GeneratedPost, CharacterReference } from '../types';
import { generatePostFromReference, generateRemixImage, refinePostImage, getPostPromptData } from '../services/geminiService';
import AnnotationCanvas from './AnnotationCanvas';
import PromptPreviewModal from './PromptPreviewModal';
import { PromptData } from '../types';

interface GeneratorProps {
  references: DesignReference[];
  brands: BrandReference[];
  characters: CharacterReference[];
  onSavePost: (post: GeneratedPost) => void;
  onBack: () => void;
}

const Generator: React.FC<GeneratorProps> = ({ references, brands, characters, onSavePost, onBack }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [intensity, setIntensity] = useState<RemixIntensity>('strict');
  const [carouselMode, setCarouselMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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
        selectedCharacter?.dna
      );
      setResultText(report);

      if (finalVisualPrompt) {
        setImageLoading(true);
        const { image: img } = await generateRemixImage(finalVisualPrompt, brief.aspectRatio);
        setRemixImage(img);
        setImageLoading(false);
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
      selectedCharacter?.dna
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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Post Generator</h2>
          <p className="text-slate-400">Deploy content into design systems.</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* TOP ROW: SELECTION & LOGIC */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* 1. SELECT COMPONENTS */}
          <div className="p-8 rounded-[2.5rem] border border-slate-800 bg-slate-900/40 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <LayoutTemplate size={18} className="text-blue-400" />
              </div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">1. Select Components</label>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col space-y-2">
                  <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                    <option value="" className="bg-slate-900">Choose Structural Blueprint...</option>
                    {references.map(r => <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>)}
                  </select>
                  {selectedRef && (
                    <div
                      className="h-32 w-full rounded-2xl border border-blue-500/20 overflow-hidden bg-black/40 animate-in slide-in-from-top-2 duration-300 cursor-pointer group/preview relative"
                      onClick={() => setFullPreview(selectedRef.templateImage || selectedRef.imageSource)}
                    >
                      <img src={selectedRef.templateImage || selectedRef.imageSource} className="w-full h-full object-contain opacity-70 group-hover/preview:opacity-100 transition-opacity" alt="Preview" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity bg-black/40">
                        <Eye size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <select className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50" value={selectedBrandId} onChange={(e) => setSelectedBrandId(e.target.value)}>
                    <option value="" className="bg-slate-900">Choose Brand Identity (Optional)...</option>
                    {brands.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>)}
                  </select>
                  {selectedBrand && (
                    <div
                      className="h-24 w-full rounded-2xl border border-pink-500/20 overflow-hidden bg-slate-950 animate-in slide-in-from-top-2 duration-300 flex items-center justify-center p-4 cursor-pointer group/brand relative"
                      onClick={() => setFullPreview(selectedBrand.imageSource)}
                    >
                      <img src={selectedBrand.imageSource} className="max-w-full max-h-full object-contain opacity-60 group-hover/brand:opacity-100 transition-opacity" alt="Preview" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/brand:opacity-100 transition-opacity bg-black/40">
                        <Eye size={18} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {selectedRef?.jsonSpec.structural_rules.has_character_slot && (
                  <div className="flex flex-col space-y-2 animate-in slide-in-from-top-2 duration-500">
                    <select className="w-full px-4 py-3 bg-slate-800 border border-green-500/30 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/50" value={selectedCharacterId} onChange={(e) => setSelectedCharacterId(e.target.value)}>
                      <option value="" className="bg-slate-900">Deploy Character DNA...</option>
                      {characters.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                    </select>
                    {selectedCharacter && (
                      <div
                        className="h-24 w-full rounded-2xl border border-green-500/20 overflow-hidden bg-black animate-in slide-in-from-top-2 duration-300 flex items-center justify-center cursor-pointer group/char relative"
                        onClick={() => setFullPreview(selectedCharacter.dna.reference_images[0])}
                      >
                        <img src={selectedCharacter.dna.reference_images[0]} className="w-full h-full object-cover opacity-60 group-hover/char:opacity-100 transition-opacity" alt="Preview" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/char:opacity-100 transition-opacity bg-black/40">
                          <Eye size={18} className="text-white" />
                        </div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <span className="bg-green-500/20 text-green-400 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-green-500/30">Identity Locked</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. GENERATION MODE */}
          <div className="p-8 rounded-[2.5rem] border border-slate-800 bg-slate-900/40 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Zap size={18} className="text-indigo-400" />
                </div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">2. Generation Mode</label>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => setCarouselMode(!carouselMode)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${carouselMode ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'}`}>
                  <Layers size={12} />
                  <span>CAROUSEL</span>
                </button>
                <button onClick={() => setPrecisionMode(!precisionMode)} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${precisionMode ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'}`}>
                  <Target size={12} />
                  <span>PRECISION</span>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Main Topic / Headline</label>
                <input type="text" placeholder="e.g. 5 Habits of Successful Leaders" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all" value={brief.topic} onChange={(e) => setBrief({ ...brief, topic: e.target.value })} />
              </div>

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
                          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
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
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none"
                      value={brief.elements_to_display}
                      onChange={(e) => setBrief({ ...brief, elements_to_display: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {carouselMode && (
                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Carousel Sequence</span>
                  <div className="flex items-center space-x-2">
                    <input type="number" min="1" className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center" value={brief.slide_number} onChange={(e) => setBrief({ ...brief, slide_number: parseInt(e.target.value) })} />
                    <span className="text-slate-600">of</span>
                    <input type="number" min="1" className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center" value={brief.total_slides} onChange={(e) => setBrief({ ...brief, total_slides: parseInt(e.target.value) })} />
                  </div>
                </div>
              )}

              {/* ACTION BAR RELOCATED HERE */}
              <div className="pt-6 mt-auto border-t border-slate-800/50 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2 bg-slate-800/40 p-1 rounded-xl border border-slate-700/30">
                    <select value={brief.aspectRatio} onChange={(e) => setBrief({ ...brief, aspectRatio: e.target.value as AspectRatio })} className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer px-2">
                      <option value="1:1" className="bg-slate-900">1:1 Square</option>
                      <option value="4:3" className="bg-slate-900">4:3 Slide</option>
                      <option value="3:4" className="bg-slate-900">3:4 Portrait</option>
                      <option value="9:16" className="bg-slate-900">9:16 Story</option>
                      <option value="16:9" className="bg-slate-900">16:9 Landscape</option>
                    </select>
                    <div className="w-px h-3 bg-slate-700/50" />
                    <select value={intensity} onChange={(e) => setIntensity(e.target.value as RemixIntensity)} className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-slate-500 outline-none cursor-pointer px-2">
                      <option value="strict" className="bg-slate-900">Strict DNA</option>
                      <option value="light" className="bg-slate-900">Light Touch</option>
                      <option value="heavy" className="bg-slate-900">Creative Heavy</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handlePreviewPrompt}
                    disabled={!selectedId || !brief.topic}
                    className="py-4 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <Eye size={18} />
                    <span>View Prompt</span>
                  </button>
                  <button onClick={handleGenerate} disabled={loading || !selectedId || !brief.topic} className={`py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl hover:shadow-indigo-500/20'}`}>
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    <span>{loading ? 'SYNTHESIZING...' : 'Deploy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: SYNTHESIS CHAMBER */}
        <div className="p-10 rounded-[3rem] border border-slate-800 bg-slate-900/60 shadow-[0_0_50px_rgba(0,0,0,0.3)] space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <Rocket size={24} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white mb-1">The Synthesis Chamber</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'}`} />
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
                  <div className="flex flex-col items-center justify-center text-slate-700 opacity-20">
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
                <div className="flex-1 rounded-[2.5rem] bg-slate-950/50 border border-slate-800 p-8 flex flex-col shadow-inner">
                  <div className="flex items-center space-x-2 mb-6 text-slate-500">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Synthesis Neural Report</span>
                  </div>
                  <div className="flex-1 overflow-y-auto text-sm text-slate-400 leading-relaxed font-light scrollbar-hide">
                    {resultText}
                  </div>
                </div>
              ) : (
                <div className="flex-1 rounded-[2.5rem] border border-slate-800 border-dashed p-8 flex flex-col items-center justify-center opacity-20 hover:opacity-40 transition-opacity">
                  <FileCode size={48} className="mb-4 text-slate-600" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center max-w-[200px]">Waiting for Synthesis deployment</p>
                </div>
              )}
              {error && <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in shake duration-300"><AlertCircle size={14} className="inline mr-2" />{error}</div>}
            </div>
          </div>
        </div>
      </div>

      {isAnnotating && remixImage && (
        <AnnotationCanvas
          imageSource={remixImage}
          onCancel={() => setIsAnnotating(false)}
          onSave={(sketch) => {
            setAnnotationSketch(sketch);
            setIsAnnotating(false);
          }}
        />
      )}

      {/* FULL PREVIEW MODAL */}
      {fullPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/95 animate-in fade-in duration-300">
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
          title="Post Generator Prompt"
        />
      )}
    </div>
  );
};

export default Generator;
