import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Upload,
  Trash2,
  Tag,
  Search,
  Palette,
  Image as ImageIcon,
  X,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { BrandAsset, BrandReference } from '../types';

interface BrandAssetManagerProps {
  brands: BrandReference[];
  assets: BrandAsset[];
  onSaveBulk: (assets: BrandAsset[]) => void;
  onUpdate: (asset: BrandAsset) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const BrandAssetManager: React.FC<BrandAssetManagerProps> = ({ brands, assets, onSaveBulk, onUpdate, onDelete, onBack }) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>(brands[0]?.id || '');
  const [isDragging, setIsDragging] = useState(false);
  const [search, setSearch] = useState('');
  const [editingAsset, setEditingAsset] = useState<BrandAsset | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (a.brand_id !== selectedBrandId) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, selectedBrandId, search]);

  const ingestFiles = async (files: FileList | File[]) => {
    if (!selectedBrandId) {
      alert('Pick a brand first.');
      return;
    }
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    const newAssets: BrandAsset[] = [];
    for (const file of list) {
      const dataUrl = await readFileAsDataUrl(file);
      newAssets.push({
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brand_id: selectedBrandId,
        name: file.name.replace(/\.[^.]+$/, ''),
        dataUrl,
        source: 'upload',
        tags: [],
        createdAt: Date.now(),
      });
    }
    onSaveBulk(newAssets);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) ingestFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEdit = (asset: BrandAsset) => {
    setEditingAsset(asset);
    setNameDraft(asset.name);
    setTagDraft('');
  };

  const commitEdit = () => {
    if (!editingAsset) return;
    onUpdate({ ...editingAsset, name: nameDraft.trim() || editingAsset.name });
    setEditingAsset(null);
  };

  const addTag = () => {
    if (!editingAsset) return;
    const trimmed = tagDraft.trim().toLowerCase();
    if (!trimmed) return;
    if (editingAsset.tags.includes(trimmed)) {
      setTagDraft('');
      return;
    }
    onUpdate({ ...editingAsset, tags: [...editingAsset.tags, trimmed] });
    setEditingAsset({ ...editingAsset, tags: [...editingAsset.tags, trimmed] });
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    if (!editingAsset) return;
    const next = { ...editingAsset, tags: editingAsset.tags.filter((t) => t !== tag) };
    onUpdate(next);
    setEditingAsset(next);
  };

  if (brands.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold">Brand assets</h1>
        </div>
        <div className="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <Palette size={32} className="mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-300 mb-3">No brands saved yet.</p>
          <p className="text-xs text-slate-500 mb-6">Save a brand first — then come back here to upload its visual assets (logo, icons, motifs).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Brand assets</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload reusable visual elements per brand. They'll be available to templates and batch generators.</p>
          </div>
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-full font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}>
          {assets.filter((a) => a.brand_id === selectedBrandId).length} for this brand · {assets.length} total
        </div>
      </div>

      {/* Brand selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Brand</label>
        <select
          value={selectedBrandId}
          onChange={(e) => setSelectedBrandId(e.target.value)}
          className="flex-1 max-w-md px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none focus:ring-2 focus:ring-pink-500/50"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {selectedBrand && (
          <img
            src={selectedBrand.imageSource}
            alt={selectedBrand.name}
            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
          />
        )}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-6 p-8 rounded-3xl border-2 border-dashed cursor-pointer transition ${
          isDragging
            ? 'border-pink-500 bg-pink-500/5'
            : 'border-slate-300 dark:border-slate-700 hover:border-pink-400 hover:bg-pink-500/5'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFilePick}
        />
        <div className="flex items-center justify-center gap-4">
          <Upload size={28} className="text-pink-500" />
          <div>
            <div className="font-bold text-slate-900 dark:text-white">Drop assets here or click to upload</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">PNG · JPG · SVG · WebP — multi-file supported</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5 relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag…"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-pink-500/50"
        />
      </div>

      {/* Gallery */}
      {filteredAssets.length === 0 ? (
        <div className="p-10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <ImageIcon size={28} className="mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-500">No assets yet for this brand. Upload some above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-pink-400 dark:hover:border-pink-500 transition cursor-pointer"
              onClick={() => openEdit(asset)}
            >
              <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-contain p-3" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 opacity-0 group-hover:opacity-100 transition">
                <div className="text-[11px] font-bold text-white truncate">{asset.name}</div>
                {asset.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {asset.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 text-white">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              {asset.source === 'gemini-gen' && (
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-pink-500/90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={10} /> AI
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingAsset && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm" onClick={() => setEditingAsset(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr,1.2fr]">
              <div className="bg-slate-50 dark:bg-slate-950 aspect-square flex items-center justify-center p-6">
                <img src={editingAsset.dataUrl} alt={editingAsset.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-black tracking-tight">Edit asset</h3>
                  <button onClick={() => setEditingAsset(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-1.5">Name</label>
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-pink-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 block mb-1.5">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editingAsset.tags.map((t) => (
                      <span key={t} className="px-2 py-1 rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-300 text-[11px] font-bold flex items-center gap-1.5">
                        {t}
                        <button onClick={() => removeTag(t)} className="hover:text-pink-900 dark:hover:text-white">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="Add tag (e.g. logo, motif, scissor)…"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-pink-500/50"
                    />
                    <button onClick={addTag} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono space-y-0.5">
                  <div>Source: {editingAsset.source}</div>
                  {editingAsset.prompt && <div>Prompt: {editingAsset.prompt}</div>}
                  <div>Created: {new Date(editingAsset.createdAt).toLocaleString()}</div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => { if (confirm('Delete this asset?')) { onDelete(editingAsset.id); setEditingAsset(null); } }}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold transition flex items-center gap-2"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={commitEdit}
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-black transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandAssetManager;
