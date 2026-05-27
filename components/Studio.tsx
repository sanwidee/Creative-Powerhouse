import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Save, Loader2, RotateCcw, LayoutTemplate, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { TEMPLATES, RENDER_DIMENSIONS, type TemplateManifest, type SlotValues, type TokenValues } from '../templates';
import type { AspectRatio, GeneratedPost } from '../types';

interface StudioProps {
  onSavePost: (post: GeneratedPost) => void;
  onBack: () => void;
}

const buildDefaultSlots = (tpl: TemplateManifest): SlotValues => {
  const next: SlotValues = {};
  for (const slot of tpl.slots) next[slot.id] = slot.placeholder || '';
  return next;
};

const buildDefaultTokens = (tpl: TemplateManifest): TokenValues => {
  const next: TokenValues = {};
  for (const tok of tpl.tokens) next[tok.id] = tok.defaultValue;
  return next;
};

const PREVIEW_MAX_HEIGHT = 720;

const Studio: React.FC<StudioProps> = ({ onSavePost, onBack }) => {
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0]?.id || '');
  const template = useMemo(() => TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0], [templateId]);

  const [ratio, setRatio] = useState<AspectRatio>(template?.defaultRatio || '4:5');
  const [slots, setSlots] = useState<SlotValues>(() => buildDefaultSlots(template));
  const [tokens, setTokens] = useState<TokenValues>(() => buildDefaultTokens(template));

  const [isCapturing, setIsCapturing] = useState(false);
  const [lastCapture, setLastCapture] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!template) return;
    setRatio(template.defaultRatio);
    setSlots(buildDefaultSlots(template));
    setTokens(buildDefaultTokens(template));
  }, [templateId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const dims = RENDER_DIMENSIONS[ratio];
  const previewScale = PREVIEW_MAX_HEIGHT / dims.height;

  const updateSlot = (id: string, value: string, max?: number) => {
    setSlots((prev) => ({ ...prev, [id]: max ? value.slice(0, max) : value }));
  };

  const updateToken = (id: string, value: string) => {
    setTokens((prev) => ({ ...prev, [id]: value }));
  };

  const resetDefaults = () => {
    if (!template) return;
    setSlots(buildDefaultSlots(template));
    setTokens(buildDefaultTokens(template));
    setToast('Defaults restored');
  };

  const capture = async (mode: 'download' | 'save'): Promise<string | null> => {
    if (!renderRef.current) return null;

    try {
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
    } catch {}

    const dataUrl = await toPng(renderRef.current, {
      pixelRatio: 1,
      cacheBust: true,
      backgroundColor: tokens.bg_color,
      width: dims.width,
      height: dims.height,
      style: {
        transform: 'none',
        margin: '0',
      },
    });

    setLastCapture(dataUrl);

    if (mode === 'download') {
      const link = document.createElement('a');
      link.download = `${template.id}_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }

    return dataUrl;
  };

  const handleDownload = async () => {
    setIsCapturing(true);
    try {
      await capture('download');
      setToast('PNG downloaded');
    } catch (e) {
      console.error(e);
      setToast('Capture failed — see console');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSave = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await capture('save');
      if (!dataUrl) throw new Error('No capture');

      const post: GeneratedPost = {
        id: `studio_${Date.now()}`,
        name: `${template.name} — ${slots.headline ? slots.headline.slice(0, 40) : 'Untitled'}`,
        imageSource: dataUrl,
        history: [],
        blueprintId: `template:${template.id}`,
        aspectRatio: ratio,
        createdAt: Date.now(),
      };
      onSavePost(post);
      setToast('Saved to Library');
    } catch (e) {
      console.error(e);
      setToast('Save failed — see console');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!template) {
    return (
      <div className="p-8 text-slate-500">No templates registered.</div>
    );
  }

  const Renderer = template.Component;

  return (
    <div className="max-w-[1500px] mx-auto px-6 py-8 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center border border-slate-200 dark:border-slate-700/50"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-1">Programmable rendering</div>
          <h1 className="text-2xl font-black">Studio</h1>
        </div>
        <button
          onClick={resetDefaults}
          className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center border border-slate-200 dark:border-slate-700/50"
          title="Reset to defaults"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
        {/* Controls */}
        <div className="space-y-5">
          {/* Template picker */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <LayoutTemplate size={16} className="text-slate-500" />
              <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Template</h2>
            </div>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-pink-500/50"
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{template.description}</p>
          </section>

          {/* Aspect ratio */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">Aspect ratio</h2>
            <div className="grid grid-cols-3 gap-2">
              {template.supportedRatios.map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition ${
                    ratio === r
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Slots */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Content</h2>
            <div className="space-y-4">
              {template.slots.map((slot) => {
                const value = slots[slot.id] || '';
                const count = value.length;
                const isOver = slot.maxLength ? count > slot.maxLength : false;
                return (
                  <div key={slot.id}>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      <span>{slot.label}{slot.required && <span className="text-pink-500 ml-0.5">*</span>}</span>
                      {slot.maxLength && (
                        <span className={`text-[10px] font-mono ${isOver ? 'text-red-500' : 'text-slate-400'}`}>
                          {count}/{slot.maxLength}
                        </span>
                      )}
                    </label>
                    {slot.type === 'longtext' ? (
                      <textarea
                        value={value}
                        onChange={(e) => updateSlot(slot.id, e.target.value, slot.maxLength)}
                        placeholder={slot.placeholder}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-pink-500/50 resize-none"
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={(e) => updateSlot(slot.id, e.target.value, slot.maxLength)}
                        placeholder={slot.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-pink-500/50"
                      />
                    )}
                    {slot.helper && (
                      <p className="text-[10px] text-slate-400 mt-1">{slot.helper}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tokens */}
          <section className="p-5 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold mb-4">Design tokens</h2>
            <div className="space-y-3">
              {template.tokens.map((tok) => {
                const value = tokens[tok.id] || tok.defaultValue;
                if (tok.type === 'color') {
                  return (
                    <div key={tok.id} className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{tok.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => updateToken(tok.id, e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                        />
                        <input
                          value={value}
                          onChange={(e) => updateToken(tok.id, e.target.value)}
                          className="w-24 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none"
                        />
                      </div>
                    </div>
                  );
                }
                if (tok.type === 'select' && tok.options) {
                  return (
                    <div key={tok.id} className="flex items-center justify-between gap-3">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{tok.label}</label>
                      <div className="flex gap-1.5">
                        {tok.options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateToken(tok.id, opt.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              value === opt.value
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </section>

          {/* Actions */}
          <section className="p-5 rounded-3xl bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-pink-500" />
              <h2 className="text-xs uppercase tracking-[0.2em] text-pink-500 font-bold">Export</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleSave}
                disabled={isCapturing}
                className="w-full px-4 py-3 rounded-2xl bg-pink-600 hover:bg-pink-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-black transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isCapturing ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save to Library
              </button>
              <button
                onClick={handleDownload}
                disabled={isCapturing}
                className="w-full px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-slate-900 text-sm font-black transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Download size={16} />
                Download PNG ({dims.width}×{dims.height})
              </button>
            </div>
          </section>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-mono">
              {dims.width} × {dims.height} px · scaled to {Math.round(previewScale * 100)}%
            </div>
            {lastCapture && (
              <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Last capture cached</div>
            )}
          </div>

          <div className="rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 flex items-start justify-center overflow-auto">
            <div
              style={{
                width: dims.width * previewScale,
                height: dims.height * previewScale,
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                  width: dims.width,
                  height: dims.height,
                  boxShadow: '0 30px 80px -20px rgba(0,0,0,0.25)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div ref={renderRef} style={{ width: dims.width, height: dims.height }}>
                  <Renderer slots={slots} tokens={tokens} ratio={ratio} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Templates render at full IG resolution. The preview is a scaled view; capture uses the underlying full-size DOM, so exports are pixel-perfect.
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Studio;
