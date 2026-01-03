
import React, { useState, useRef } from 'react';
import { Palette, Upload, Loader2, Sparkles, Save, ArrowLeft, ShieldAlert, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { analyzeBrand } from '../services/geminiService';
import { BrandReference, BrandDNA } from '../types';

interface BrandLabProps {
  onSave: (ref: BrandReference) => void;
  onBack: () => void;
}

const BrandLab: React.FC<BrandLabProps> = ({ onSave, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [dna, setDna] = useState<BrandDNA | null>(null);
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
    setDna(null);
    setError(null);
    setIsSaved(false);
    try {
      const { dna } = await analyzeBrand(image);
      setDna(dna);
    } catch (err: any) {
      setError(err.message || "Brand analysis failed. The image might be too small or blocked.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!dna || !image) return;
    onSave({
      id: Date.now().toString(),
      name: dna.brand_name,
      imageSource: image,
      dna: dna,
      createdAt: Date.now()
    });
    setIsSaved(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-500 text-slate-900 dark:text-slate-100">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={onBack}
          className="p-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Brand Identity Lab</h2>
          <p className="text-slate-500 dark:text-slate-400">Extract core color grammar and vibe DNA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 shadow-xl dark:shadow-2xl backdrop-blur-xl space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Asset Input</h3>
            {!image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:border-pink-500/50 transition-all group active:scale-[0.99]"
              >
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/50 group-hover:scale-110 transition-transform">
                  <Upload size={32} className="text-slate-400 dark:text-slate-500 group-hover:text-pink-400" />
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-4">Drop Logo or Moodboard</span>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative aspect-square rounded-3xl overflow-hidden border border-slate-700 bg-black group flex items-center justify-center">
                <img src={image} className="w-full h-full object-contain" alt="Brand Asset" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => { setImage(null); setDna(null); setError(null); }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all active:scale-95"
                  >
                    Change Asset
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start space-x-3 text-red-400 text-sm animate-in shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !image}
              className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all active:scale-[0.98] shadow-lg ${loading ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500' : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-900/20'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span className="animate-pulse">EXTRACTING BRAND DNA...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="text-pink-200" />
                  <span>Analyze Brand DNA</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div>
          {dna ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-pink-500 dark:text-pink-400">{dna.brand_name}</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">DNA Analysis Report</p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaved}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center space-x-2 transition-all active:scale-95 ${isSaved ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'
                      }`}
                  >
                    {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    <span>{isSaved ? 'Saved to Lab' : 'Save Identity'}</span>
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Color Palette Logic</span>
                    <div className="flex flex-wrap gap-3">
                      {dna.primary_colors.map((c, idx) => (
                        <div key={`${c}-${idx}`} className="group flex flex-col items-center space-y-2">
                          <div className="h-14 w-14 rounded-2xl border border-white/10 shadow-lg transform transition-transform group-hover:scale-110" style={{ backgroundColor: c }} />
                          <span className="text-[10px] font-mono text-slate-500">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Brand Vibe</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{dna.brand_vibe}"</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Color Usage</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{dna.color_logic}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/20 flex items-start space-x-4">
                    <ShieldAlert size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest block mb-1">Visual Constraints</span>
                      <p className="text-xs text-slate-400 italic leading-relaxed">
                        Forbidden Styles: {dna.forbidden_styles?.length > 0 ? dna.forbidden_styles.join(', ') : 'No violations found.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border border-slate-200 dark:border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-600 text-center transition-all">
              <div className="p-6 rounded-full bg-slate-100 dark:bg-slate-800/30 mb-6">
                <Palette size={48} className="opacity-10 dark:opacity-20 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 mb-2">Awaiting Brand Input</h3>
              <p className="text-sm max-w-xs mx-auto leading-relaxed text-slate-500 dark:text-slate-500">
                Extract Brand DNA to see color grammar, visual constraints, and style logic. This data can be used as a filter in the Generator.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrandLab;
