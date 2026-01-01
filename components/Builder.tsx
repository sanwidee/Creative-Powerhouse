
import React, { useState, useRef } from 'react';
// Added missing Rocket import
import { Upload, Sparkles, Save, ArrowLeft, Loader2, Terminal, Zap, AlertCircle, CheckCircle2, ChevronRight, XCircle, Code, Layers, Palette, Type as TypeIcon, Rocket, Target, LayoutTemplate } from 'lucide-react';
import { analyzeDesign, generateTemplateImage } from '../services/geminiService';
import { DesignReference, DesignPromptJson, AspectRatio, UsageLog } from '../types';

interface BuilderProps {
  onSave: (ref: DesignReference) => void;
  onBack: () => void;
}

const Builder: React.FC<BuilderProps> = ({ onSave, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [ratio, setRatio] = useState<AspectRatio>('1:1');
  const [result, setResult] = useState<{ markdown: string, json: DesignPromptJson, usage: UsageLog } | null>(null);
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    setTemplateImage(null);
    setError(null);
    setIsSaved(false);

    try {
      const data = await analyzeDesign(image, notes);
      if (!data.json || !data.markdown) throw new Error("Incomplete DNA extraction.");
      setResult(data);

      // Auto-generate visual sample
      setTemplateLoading(true);
      try {
        const generated = await generateTemplateImage(data.json, ratio);
        setTemplateImage(generated.image);
      } catch (tErr) {
        console.warn("Auto-visual generation failed, but DNA was captured.");
      } finally {
        setTemplateLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "The lab couldn't decode this design DNA. Please try another image.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!result) return;
    setTemplateLoading(true);
    setError(null);
    try {
      const generated = await generateTemplateImage(result.json, ratio);
      setTemplateImage(generated.image);
    } catch (err: any) {
      setError("Visual validation failed. The layout engine encountered an error.");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleSave = () => {
    if (!result || !image) return;
    onSave({
      id: Date.now().toString(),
      name: result.json.template_name || 'Untitled Blueprint',
      tags: [],
      imageSource: image,
      templateImage: templateImage || undefined,
      markdownBrief: result.markdown,
      jsonSpec: result.json,
      aspectRatio: ratio,
      createdAt: Date.now(),
    });
    setIsSaved(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Design DNA Builder</h2>
          <p className="text-slate-400">Deconstruct visuals into production logic.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* INPUT COLUMN */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/50 shadow-2xl space-y-6 relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Step 1: Upload Source</label>
                {!image ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-video border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/30 hover:border-blue-500/50 transition-all group active:scale-[0.99]"
                  >
                    <div className="p-4 rounded-full bg-slate-800/50 group-hover:scale-110 transition-transform">
                      <Upload size={32} className="text-slate-500 group-hover:text-blue-400" />
                    </div>
                    <span className="text-sm text-slate-400 mt-4">Drop inspiration here</span>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black group aspect-video flex items-center justify-center">
                    <img src={image} className="w-full h-full object-contain" alt="Ref" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => { setImage(null); setResult(null); setError(null); }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all active:scale-95"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Step 2: Focus Parameters</label>
                <textarea
                  rows={4}
                  placeholder="Add context... (e.g., 'Focus only on the grid layout' or 'Ignore the illustration style')"
                  className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all placeholder:text-slate-600"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start space-x-3 text-red-400 text-sm animate-in shake duration-300">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || !image}
              className={`w-full py-5 mt-6 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-lg ${loading ? 'bg-slate-800 text-slate-500 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span className="animate-pulse">DECODING DESIGN DNA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="text-blue-200" />
                  <span>Analyze DNA</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="lg:col-span-7 h-full flex flex-col">
          {result ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col h-full space-y-6 flex-1">
              <div className="bg-slate-900/80 backdrop-blur-md rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle2 size={16} className="text-green-500" />
                      <h4 className="font-bold text-lg">DNA Synthesis Complete</h4>
                    </div>
                    <p className="text-sm text-slate-500 italic">Extracted: {result.json?.template_name || 'Unknown Blueprint'}</p>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
                    <LayoutTemplate size={14} className="ml-2 text-slate-500" />
                    <select
                      value={result.json.blueprint_type || 'headline'}
                      onChange={(e) => setResult({ ...result, json: { ...result.json, blueprint_type: e.target.value as any } })}
                      className="bg-transparent text-xs font-bold text-slate-300 outline-none px-2 cursor-pointer w-24"
                    >
                      <option value="headline" className="bg-slate-900">Headline</option>
                      <option value="carousel" className="bg-slate-900">Carousel</option>
                      <option value="mixed" className="bg-slate-900">Mixed</option>
                    </select>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <select
                      value={ratio}
                      onChange={(e) => setRatio(e.target.value as AspectRatio)}
                      className="bg-transparent text-xs font-bold text-slate-300 outline-none px-2 cursor-pointer"
                    >
                      {['1:1', '9:16', '16:9', '4:3', '3:4'].map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateTemplate}
                    disabled={templateLoading}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all active:scale-95 flex items-center space-x-2 shadow-lg shadow-indigo-900/20"
                  >
                    {templateLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    <span>{templateLoading ? 'Rendering...' : 'Validate'}</span>
                  </button>
                </div>

                <div className="flex-1 min-h-[300px] bg-black rounded-[1.5rem] overflow-hidden border border-slate-800 flex items-center justify-center relative shadow-inner group">
                  {templateImage ? (
                    <img src={templateImage} className="w-full h-full object-contain animate-in zoom-in-95 duration-500" alt="Mockup" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-700 p-8 text-center">
                      <Terminal size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-mono uppercase tracking-widest opacity-40">Awaiting Validation Pulse</p>
                    </div>
                  )}
                  {templateLoading && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-pulse z-10 text-center px-4">
                      <Zap size={32} className="text-indigo-400 mb-4 animate-bounce" />
                      <span className="text-xs font-bold text-indigo-300 tracking-[0.2em]">GENERATING VISUAL PROXY...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Archetype</span>
                    <p className="text-xs font-semibold text-blue-400">{result.json?.structural_rules?.layout_archetype || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Typography</span>
                    <p className="text-xs font-semibold text-slate-300 truncate">{result.json?.structural_rules?.typography_system || 'N/A'}</p>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaved}
                  className={`w-full mt-6 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] flex items-center justify-center space-x-2 border shadow-lg ${isSaved
                    ? 'bg-green-500/10 border-green-500/50 text-green-400 cursor-default'
                    : 'bg-green-600 hover:bg-green-500 border-green-500/20 text-white shadow-green-900/20'
                    }`}
                >
                  {isSaved ? (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Blueprint Saved to Library</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Save DNA to Library</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] border border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-slate-600 text-center p-12 transition-all">
              <div className="relative mb-6">
                <Zap size={64} className="opacity-5" />
                {loading && <Loader2 size={64} className="absolute inset-0 animate-spin text-blue-500/30" />}
              </div>
              <h3 className="text-xl font-bold text-slate-400 mb-2">System Initialized</h3>
              <p className="text-sm max-w-sm mx-auto leading-relaxed">
                Upload a reference design to start the deconstruction sequence. The lab will extract layout, typography, and visual DNA.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED DNA REGISTRY OUTPUT */}
      {result && (
        <div className="mt-12 animate-in slide-in-from-bottom-8 duration-700">
          <div className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800/50 shadow-2xl">
            <div className="flex items-center space-x-3 mb-8 border-b border-slate-800 pb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Code size={18} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Machine DNA Registry</h3>
              <span className="text-[10px] font-mono text-slate-500 ml-auto uppercase tracking-[0.3em]">PROMPT_VARIABLES_V2.0</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <VariableBox
                icon={<Zap size={14} className="text-yellow-400" />}
                label="Archetype"
                value={result.json.structural_rules.layout_archetype}
              />
              <VariableBox
                icon={<Layers size={14} className="text-indigo-400" />}
                label="Composition Map"
                value={result.json.structural_rules.composition_map}
              />
              <VariableBox
                icon={<Palette size={14} className="text-pink-400" />}
                label="Aesthetic Motifs"
                value={result.json.structural_rules.aesthetic_motifs}
              />
              <VariableBox
                icon={<TypeIcon size={14} className="text-cyan-400" />}
                label="Typography System"
                value={result.json.structural_rules.typography_system}
              />
              <VariableBox
                icon={<Rocket size={14} className="text-green-400" />}
                label="Aspect Ratio"
                value={ratio}
              />
              <VariableBox
                icon={<Target size={14} className={result.json.structural_rules.has_character_slot ? "text-green-400" : "text-slate-600"} />}
                label="Character Slot"
                value={result.json.structural_rules.has_character_slot ? "Detected" : "None"}
              />
              <VariableBox
                icon={<Palette size={14} className="text-slate-200" />}
                label="Dark Theme"
                value={result.json.structural_rules.dark_theme_adaptation || 'Standard'}
              />
              <VariableBox
                icon={<Palette size={14} className="text-white" />}
                label="Light Theme"
                value={result.json.structural_rules.light_theme_adaptation || 'Standard'}
              />
            </div>

            <div className="mt-12 space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Terminal size={18} className="text-orange-400" />
                </div>
                <h3 className="text-lg font-bold tracking-tight">Content Inventory Registry</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.json.content_registry.map((field, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{field.label}</span>
                      <span className="text-[8px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 uppercase font-bold">{field.type}</span>
                    </div>
                    <p className="text-xs text-slate-300 italic">"{field.placeholder}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-slate-950/50 border border-slate-800/80 font-mono text-xs text-blue-400/70 overflow-x-auto">
              <p className="mb-2 opacity-50 uppercase tracking-widest text-[10px] font-bold">Generated Visual DNA Prompt</p>
              <p className="italic leading-relaxed">"{result.json.base_visual_dna_prompt}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VariableBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/30 flex flex-col space-y-3 transition-all hover:border-slate-600 group">
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-xs font-medium text-slate-200 leading-relaxed group-hover:text-white transition-colors capitalize">
      {value || 'N/A'}
    </p>
  </div>
);

export default Builder;
