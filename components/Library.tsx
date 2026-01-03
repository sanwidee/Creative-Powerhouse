
import React, { useState, useRef } from 'react';
/* Added missing XCircle to the import list from lucide-react */
import { Search, Tag, Trash2, ExternalLink, Download, ArrowLeft, Filter, Grid, List as ListIcon, ImageIcon, LayoutTemplate, Copy, Check, Palette, ShieldAlert, Zap, History, FileCode, Terminal, Rocket, Clock, MessageSquare, Send, Loader2, Upload, AlertCircle, Eye, XCircle, Type as TypeIcon, Target, Users, Wand2, Layers, Sparkles, Moon, Sun, Volume2 } from 'lucide-react';
import { DesignReference, BrandReference, GeneratedPost, RetouchHistory, UsageLog, CharacterReference, GeneratedCharacterPose, GeneratedCarousel, AudioReference } from '../types';
import { refinePostImage, analyzeBrand, analyzeDesign } from '../services/geminiService';
import AnnotationCanvas from './AnnotationCanvas';

interface LibraryProps {
  references: DesignReference[];
  brands: BrandReference[];
  generatedPosts: GeneratedPost[];
  generatedCarousels: GeneratedCarousel[];
  characters: CharacterReference[];
  characterPoses: GeneratedCharacterPose[];
  audioVoices: AudioReference[];
  onDelete: (id: string) => void;
  onDeleteBrand: (id: string) => void;
  onDeletePost: (id: string) => void;
  onDeleteCarousel: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
  onDeleteCharacterPose: (id: string) => void;
  onDeleteAudioVoice: (id: string) => void;
  onUpdateReference: (ref: DesignReference) => void;
  onUpdateBrand: (brand: BrandReference) => void;
  onUpdatePost: (post: GeneratedPost) => void;
  onUpdateCharacter: (char: CharacterReference) => void;
  onBack: () => void;
}

const Library: React.FC<LibraryProps> = ({ references, brands, generatedPosts, generatedCarousels, characters, characterPoses, audioVoices, onDelete, onDeleteBrand, onDeletePost, onDeleteCarousel, onDeleteCharacter, onDeleteCharacterPose, onDeleteAudioVoice, onUpdateReference, onUpdateBrand, onUpdatePost, onUpdateCharacter, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRef, setSelectedRef] = useState<DesignReference | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandReference | null>(null);
  const [selectedPost, setSelectedPost] = useState<GeneratedPost | null>(null);
  const [selectedCarousel, setSelectedCarousel] = useState<GeneratedCarousel | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterReference | null>(null);
  const [selectedCharacterPose, setSelectedCharacterPose] = useState<GeneratedCharacterPose | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioReference | null>(null);
  const [viewMode, setViewMode] = useState<'template' | 'brands' | 'generated' | 'carousels' | 'characters' | 'character_poses' | 'audio_voices'>('template');
  const [copied, setCopied] = useState(false);

  // Retouch Studio State
  const [retouchInput, setRetouchInput] = useState('');
  const [retouchRefImg, setRetouchRefImg] = useState<string | null>(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationSketch, setAnnotationSketch] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [studioError, setStudioError] = useState<string | null>(null);
  const retouchFileRef = useRef<HTMLInputElement>(null);

  // UI State
  const [fullPreview, setFullPreview] = useState<string | null>(null);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editedBrand, setEditedBrand] = useState<BrandReference | null>(null);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editedCharacter, setEditedCharacter] = useState<CharacterReference | null>(null);

  // CRUD State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleEditStart = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleRefreshDNA = async (type: 'brand' | 'ref', item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (refreshingId) return;

    setRefreshingId(item.id);
    try {
      if (type === 'brand') {
        const { dna } = await analyzeBrand(item.imageSource);
        onUpdateBrand({ ...item, dna });
      } else {
        const { json } = await analyzeDesign(item.imageSource);
        onUpdateReference({ ...item, jsonSpec: json });
      }
    } catch (err) {
      console.error("Failed to refresh DNA:", err);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleEditSave = (type: 'ref' | 'brand', original: any, e: React.KeyboardEvent | React.FocusEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;

    if (editValue.trim() && editValue !== original.name) {
      if (type === 'ref') {
        onUpdateReference({ ...original, name: editValue });
      } else {
        onUpdateBrand({ ...original, name: editValue });
      }
    }
    setEditingId(null);
  };

  const filteredRefs = references.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.jsonSpec?.structural_rules?.aesthetic_motifs || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = generatedPosts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCarousels = (generatedCarousels || []).filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCharacters = characters.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCharacterPoses = characterPoses.filter(p => {
    const char = characters.find(c => c.id === p.characterId);
    return p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (char?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredAudioVoices = audioVoices.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.dna.gender.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRetouch = async () => {
    if (!selectedPost || !retouchInput) return;
    setIsProcessing(true);
    setStudioError(null);
    try {
      const { image: refinedImg } = await refinePostImage(
        selectedPost.imageSource,
        retouchInput,
        selectedPost.aspectRatio,
        annotationSketch || retouchRefImg || undefined,
        !!annotationSketch
      );

      const newHistory: RetouchHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        instruction: retouchInput,
        image: refinedImg,
        type: annotationSketch ? 'annotation' : (retouchRefImg ? 'visual_reference' : 'text')
      };

      const updatedPost: GeneratedPost = {
        ...selectedPost,
        imageSource: refinedImg,
        history: [newHistory, ...selectedPost.history]
      };

      onUpdatePost(updatedPost);
      setSelectedPost(updatedPost);
      setRetouchInput('');
      setRetouchRefImg(null);
      setAnnotationSketch(null);
    } catch (err: any) {
      setStudioError("Production engine failed. The instruction was too complex or output blocked.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRetouchRefImg(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
        <div className="flex items-center space-x-5">
          <button onClick={onBack} className="p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center border border-slate-700/50">
            <ArrowLeft size={22} />
          </button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <img src="./logo.png" className="w-8 h-8 object-contain" />
              <h2 className="text-4xl font-black tracking-tighter italic uppercase">MY <span className="text-green-500">FILES</span></h2>
            </div>
            <p className="text-slate-400 text-sm font-medium">Centralized DNA Registry & Asset Vault.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900/50 p-2 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
          <button onClick={() => setViewMode('generated')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'generated' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            <Rocket size={14} /><span>Generated</span>
          </button>
          <button onClick={() => setViewMode('template')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'template' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            <LayoutTemplate size={14} /><span>Blueprints</span>
          </button>
          <button onClick={() => setViewMode('brands')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'brands' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            <Palette size={14} /><span>Brands</span>
          </button>
          <button onClick={() => setViewMode('characters')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'characters' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            <Users size={14} /><span>Characters</span>
          </button>
          <button onClick={() => setViewMode('character_poses')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'character_poses' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            <Wand2 size={14} /><span>Poses</span>
          </button>
          <button onClick={() => setViewMode('audio_voices')} className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'audio_voices' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            <Volume2 size={14} /><span>Audio</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-10">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input type="text" placeholder="Search the Vault..." className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm text-slate-900 dark:text-white placeholder-slate-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {viewMode === 'generated' && (
          filteredPosts.length === 0 ? <EmptyState icon={<Rocket size={64} />} label="No generated content yet." /> :
            filteredPosts.map(post => (
              <div key={post.id} onClick={() => setSelectedPost(post)} className="group rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden hover:border-green-500/40 transition-all cursor-pointer relative flex flex-col shadow-sm dark:shadow-none">
                <div className="aspect-[4/5] relative bg-black">
                  <img src={post.imageSource} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt={post.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-center space-x-2 mb-2"><Clock size={12} className="text-green-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">{post.history.length} Iterations</span></div>
                    <h4 className="font-bold text-lg text-white truncate">{post.name}</h4>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(post.createdAt).toLocaleDateString()}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDeletePost(post.id); }} className="p-2 rounded-xl text-slate-600 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
        )}

        {viewMode === 'carousels' && (
          filteredCarousels.length === 0 ? <EmptyState icon={<Layers size={64} />} label="No generated carousels yet." /> :
            filteredCarousels.map(carousel => (
              <div key={carousel.id} onClick={() => setSelectedCarousel(carousel)} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-indigo-500/40 transition-all cursor-pointer relative flex flex-col">
                <div className="aspect-[4/5] relative bg-black">
                  {carousel.slides[0]?.generatedImage ? (
                    <img src={carousel.slides[0].generatedImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" alt={carousel.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                      <Layers size={48} className="opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute top-4 right-4"><span className="px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-400 text-[8px] font-bold border border-indigo-500/30 uppercase">{carousel.slides.length} Slides</span></div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <h4 className="font-bold text-lg text-white truncate">{carousel.name}</h4>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between border-t border-slate-800/50">
                  <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(carousel.createdAt).toLocaleDateString()}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCarousel(carousel.id); }} className="p-2 rounded-xl text-slate-600 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
        )}



        {viewMode === 'brands' && (
          filteredBrands.map(brand => (
            <div key={brand.id} onClick={() => setSelectedBrand(brand)} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-pink-500/40 transition-all cursor-pointer">
              <div className="aspect-[4/5] bg-slate-950 flex items-center justify-center p-8 relative">
                <img src={brand.imageSource} className="max-w-full max-h-full object-contain opacity-60 group-hover:opacity-100" alt={brand.name} />
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button onClick={(e) => handleEditStart(brand.id, brand.name, e)} className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"><FileCode size={14} /></button>
                  <button onClick={(e) => handleRefreshDNA('brand', brand, e)} className={`p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-pink-400 opacity-0 group-hover:opacity-100 transition-all ${refreshingId === brand.id ? 'animate-spin text-pink-500 opacity-100' : ''} ${!brand.dna.dark_mode_colors && !refreshingId ? 'text-pink-400 opacity-100 animate-pulse' : ''}`} disabled={!!refreshingId} title="Refresh DNA (Updates Theme Data)">
                    {refreshingId === brand.id ? <Loader2 size={14} /> : <Sparkles size={14} />}
                  </button>
                </div>
              </div>
              <div className="p-5 flex items-center justify-between border-t border-slate-800/50">
                {editingId === brand.id ? (
                  <input
                    autoFocus
                    className="bg-slate-800 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-pink-500 w-full"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={(e) => handleEditSave('brand', brand, e)}
                    onKeyDown={(e) => handleEditSave('brand', brand, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex flex-col">
                    <h4 className="font-bold text-white truncate">{brand.name}</h4>
                    {brand.dna.dark_mode_colors ? (
                      <div className="flex items-center space-x-1 mt-1"><Moon size={10} className="text-slate-500" /><Sun size={10} className="text-slate-500" /><span className="text-[10px] text-slate-600 font-bold uppercase">Theme Ready</span></div>
                    ) : (
                      <div className="flex items-center space-x-1 mt-1"><span className="text-[10px] text-pink-500/50 font-bold uppercase italic">Refresh to Upgrade</span></div>
                    )}
                  </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); onDeleteBrand(brand.id); }} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}



        {viewMode === 'template' && (
          filteredRefs.length === 0 ? <EmptyState icon={<LayoutTemplate size={64} />} label="No blueprints generated yet." /> :
            filteredRefs.map(ref => (
              <div key={ref.id} onClick={() => setSelectedRef(ref)} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-blue-500/40 transition-all cursor-pointer relative flex flex-col">
                <div className="aspect-[4/5] bg-black">
                  <img src={ref.imageSource} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={ref.name} />
                  <div className="absolute top-4 right-4"><span className={`px-2 py-1 rounded-md text-[8px] font-bold border uppercase ${ref.jsonSpec.blueprint_type === 'carousel' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>{ref.jsonSpec.blueprint_type || 'Headline'} BP</span></div>
                  <div className="absolute bottom-4 right-4 flex space-x-2">
                    <button onClick={(e) => handleRefreshDNA('ref', ref, e)} className={`p-2 rounded-lg bg-black/50 backdrop-blur-md text-slate-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all ${refreshingId === ref.id ? 'animate-spin text-blue-500 opacity-100' : ''} ${!ref.jsonSpec.structural_rules.dark_theme_adaptation && !refreshingId ? 'text-blue-400 opacity-100 animate-pulse' : ''}`} disabled={!!refreshingId} title="Refresh DNA (Get Theme Rules)">
                      {refreshingId === ref.id ? <Loader2 size={14} /> : <Sparkles size={14} />}
                    </button>
                  </div>
                </div>
                <div className="p-5 flex items-center justify-between border-t border-slate-800/50">
                  {editingId === ref.id ? (
                    <input
                      autoFocus
                      className="bg-slate-800 text-white text-sm px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500 w-full"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={(e) => handleEditSave('ref', ref, e)}
                      onKeyDown={(e) => handleEditSave('ref', ref, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex flex-col">
                      <h4 className="font-bold text-white truncate text-sm">{ref.name}</h4>
                      {ref.jsonSpec.base_visual_dna_prompt?.includes("IGNORE THIS FIELD") ? (
                        ref.jsonSpec.structural_rules.dark_theme_adaptation ? (
                          <div className="flex items-center space-x-1 mt-1"><Moon size={10} className="text-slate-500" /><Sun size={10} className="text-slate-500" /><span className="text-[10px] text-slate-600 font-bold uppercase">Ready</span></div>
                        ) : (
                          <div className="flex items-center space-x-1 mt-1"><span className="text-[10px] text-blue-500/50 font-bold uppercase italic">Refresh Theme</span></div>
                        )
                      ) : (
                        <div className="flex items-center space-x-1 mt-1 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20"><ShieldAlert size={10} className="text-yellow-500" /><span className="text-[10px] text-yellow-500 font-bold uppercase">Upgrade DNA</span></div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center">
                    <button onClick={(e) => handleEditStart(ref.id, ref.name, e)} className="p-2 text-slate-600 hover:text-blue-400"><FileCode size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(ref.id); }} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))
        )}

        {viewMode === 'characters' && (
          filteredCharacters.length === 0 ? <EmptyState icon={<Users size={64} />} label="No characters saved yet." /> :
            filteredCharacters.map(char => (
              <div key={char.id} onClick={() => setSelectedCharacter(char)} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-green-500/40 transition-all cursor-pointer">
                <div className="aspect-[4/5] bg-black">
                  {char.dna.reference_images.length > 0 ? (
                    <img src={char.dna.reference_images[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={char.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <Users size={64} className="opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4"><span className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-[8px] font-bold border border-green-500/30 uppercase">Character DNA</span></div>
                </div>
                <div className="p-5 flex items-center justify-between border-t border-slate-800/50">
                  <h4 className="font-bold text-white truncate">{char.name}</h4>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCharacter(char.id); }} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
        )}

        {viewMode === 'character_poses' && (
          filteredCharacterPoses.length === 0 ? <EmptyState icon={<Wand2 size={64} />} label="No character poses generated yet." /> :
            filteredCharacterPoses.map(pose => {
              const char = characters.find(c => c.id === pose.characterId);
              return (
                <div key={pose.id} onClick={() => setSelectedCharacterPose(pose)} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-purple-500/40 transition-all cursor-pointer">
                  <div className="aspect-[4/5] bg-black">
                    <img src={pose.generatedImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={pose.name} />
                    <div className="absolute top-4 right-4"><span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-[8px] font-bold border border-purple-500/30 uppercase">Pose</span></div>
                  </div>
                  <div className="p-5 border-t border-slate-800/50">
                    <h4 className="font-bold text-white truncate text-sm mb-1">{pose.name}</h4>
                    {char && <p className="text-[10px] text-slate-500">Character: {char.name}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(pose.createdAt).toLocaleDateString()}</span>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteCharacterPose(pose.id); }} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })
        )}
        {viewMode === 'audio_voices' && (
          filteredAudioVoices.length === 0 ? <EmptyState icon={<Volume2 size={64} />} label="No audio voices synthesized yet." /> :
            filteredAudioVoices.map(voice => (
              <div key={voice.id} onClick={() => setSelectedAudio(voice)} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-pink-500/40 transition-all cursor-pointer">
                <div className="aspect-[4/5] bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative">
                  <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                    <Volume2 size={32} className="text-pink-400" />
                  </div>
                  <h4 className="font-bold text-white text-lg mb-2">{voice.name}</h4>
                  <p className="text-xs text-slate-500 uppercase font-bold">{voice.dna.gender} • {voice.dna.accent}</p>

                  <div className="absolute top-4 right-4"><span className="px-2 py-1 rounded-md bg-pink-500/20 text-pink-400 text-[8px] font-bold border border-pink-500/30 uppercase">Voice DNA</span></div>
                </div>
                <div className="p-5 flex items-center justify-between border-t border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-600 font-mono uppercase">{new Date(voice.createdAt).toLocaleDateString()}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteAudioVoice(voice.id); }} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
        )}
      </div>

      {
        selectedAudio && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300 flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 max-w-2xl w-full relative shadow-2xl">
              <button onClick={() => setSelectedAudio(null)} className="absolute top-8 right-8 p-2 rounded-full bg-slate-800 hover:text-white text-slate-500">
                <XCircle size={24} />
              </button>

              <div className="flex items-center space-x-6 mb-8">
                <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20"><Volume2 size={32} className="text-pink-400" /></div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedAudio.name}</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Voice Identity Profile</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</span>
                    <span className="text-white font-bold">{selectedAudio.dna.gender}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age</span>
                    <span className="text-white font-bold">{selectedAudio.dna.age}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tone</span>
                    <span className="text-white font-bold">{selectedAudio.dna.tone}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Accent</span>
                    <span className="text-white font-bold">{selectedAudio.dna.accent}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Style Prompt</span>
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-400 italic">
                    "{selectedAudio.dna.style_prompt}"
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* PRODUCTION STUDIO MODAL (GENERATED POSTS) */}
      {
        selectedPost && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 shadow-2xl"><Rocket size={32} className="text-green-400" /></div>
                  <div><h2 className="text-4xl font-bold text-white">{selectedPost.name}</h2><p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Production Studio Studio v3.0</p></div>
                </div>
                <button onClick={() => setSelectedPost(null)} className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300">Exit Studio</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* LEFT: LIVE RENDER & RETOUCH */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="rounded-[3rem] overflow-hidden border border-slate-800 bg-black aspect-square shadow-2xl relative flex items-center justify-center p-4">
                    <img src={selectedPost.imageSource} className="max-w-full max-h-full object-contain" alt="Current Render" />
                    {isProcessing && <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-pulse z-20"><Zap size={48} className="text-green-400 mb-6 animate-bounce" /><span className="text-xs font-bold text-green-300 tracking-[0.3em]">PROCESSING LAYER...</span></div>}
                  </div>

                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-green-400 font-bold text-[10px] uppercase tracking-widest"><MessageSquare size={14} /><span>Human Guidance</span></div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setIsAnnotating(true)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${annotationSketch ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                        >
                          <Target size={12} />
                          <span>{annotationSketch ? 'SKECH READY' : 'DRAW FEEDBACK'}</span>
                        </button>
                        <button onClick={() => retouchFileRef.current?.click()} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${retouchRefImg ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}><ImageIcon size={12} /><span>REF IMAGE</span></button>
                        <input type="file" ref={retouchFileRef} onChange={handleRefImgUpload} className="hidden" accept="image/*" />
                      </div>
                    </div>

                    {retouchRefImg && (
                      <div className="flex items-center space-x-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 animate-in zoom-in-95">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-blue-500/40 flex items-center justify-center bg-black"><img src={retouchRefImg} className="max-w-full max-h-full object-contain" /></div>
                        <div className="flex-1"><span className="text-[10px] font-bold text-blue-400 block mb-1">REFERENCE LAYER DETECTED</span><p className="text-xs text-slate-500 italic">This image will be used as a structural or content reference for the retouch.</p></div>
                        <button onClick={() => setRetouchRefImg(null)} className="p-2 text-slate-600 hover:text-red-400"><XCircle size={18} /></button>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <input type="text" placeholder={annotationSketch ? "Describe what you drew..." : "e.g. 'Add a neon glow to the background', 'Change text to bold navy'..."} className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-green-500/50 text-sm" value={retouchInput} onChange={(e) => setRetouchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRetouch()} />
                      <button onClick={handleRetouch} disabled={!retouchInput || isProcessing} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 p-4 rounded-2xl transition-all active:scale-90 text-white shadow-xl flex items-center justify-center min-w-[64px]">
                        {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                      </button>
                    </div>

                    {studioError && <div className="flex items-center space-x-3 text-red-400 text-sm p-4 rounded-2xl bg-red-500/10 border border-red-500/20"><AlertCircle size={18} /><p>{studioError}</p></div>}
                  </div>
                </div>

                {/* RIGHT: VERSION LOG */}
                <div className="lg:col-span-4 flex flex-col h-full">
                  <div className="flex items-center space-x-3 mb-6"><Clock size={20} className="text-slate-500" /><h3 className="text-lg font-bold text-slate-200">Revision History</h3></div>
                  <div className="flex-1 overflow-y-auto pr-4 space-y-6 scrollbar-hide">
                    {selectedPost.history.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-slate-800 rounded-[2rem] text-center text-slate-600 text-xs uppercase tracking-widest font-bold">No revisions logged.</div>
                    ) : (
                      selectedPost.history.map((log) => (
                        <div key={log.id} className="p-4 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 group hover:border-slate-600 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${log.type === 'annotation' ? 'bg-orange-500/10 text-orange-400' : log.type === 'visual_reference' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>{log.type}</span>
                          </div>
                          <div
                            className="aspect-square rounded-2xl overflow-hidden border border-slate-800/50 bg-black cursor-pointer relative group/img"
                            onClick={() => onUpdatePost({ ...selectedPost, imageSource: log.image })}
                          >
                            <img src={log.image} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-green-500/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="bg-green-600 text-white text-[10px] font-bold py-1 px-3 rounded-full shadow-lg">ROLLBACK</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 italic">"{log.instruction}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* CAROUSEL PREVIEW MODAL */}
      {
        selectedCarousel && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-2xl"><Layers size={32} className="text-indigo-400" /></div>
                  <div>
                    <h2 className="text-4xl font-bold text-white">{selectedCarousel.name}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Carousel Deck v1.0</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCarousel(null)} className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300">Exit Deck</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {selectedCarousel.slides.map((slide) => (
                  <div key={slide.id} className="group rounded-[2.5rem] border border-slate-800 bg-slate-900/40 overflow-hidden hover:border-indigo-500/40 transition-all relative flex flex-col">
                    <div className="aspect-[4/5] relative bg-black">
                      {slide.generatedImage ? (
                        <img src={slide.generatedImage} className="w-full h-full object-cover" alt={`Slide ${slide.slideNumber}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-700">
                          <Zap size={48} className="opacity-20 animate-pulse" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4"><span className="px-2 py-1 rounded-md bg-white/10 text-white/50 text-[10px] font-bold border border-white/10 uppercase">Slide {slide.slideNumber}</span></div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-6 text-center">
                        <p className="text-xs text-slate-300 italic">"{slide.copyBrief}"</p>
                      </div>
                    </div>
                    <div className="p-5 border-t border-slate-800/50">
                      <button
                        onClick={() => slide.generatedImage && setFullPreview(slide.generatedImage)}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                      >
                        <Eye size={12} />
                        <span>Expand View</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl">
                <div className="flex items-center space-x-3 mb-8">
                  <Terminal size={18} className="text-indigo-400" />
                  <h3 className="text-lg font-bold">Carousel Metadata</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Linked Blueprint</span>
                    <p className="text-sm text-slate-300">{references.find(r => r.id === selectedCarousel.blueprintId)?.name || 'Generic Blueprint'}</p>
                  </div>
                  {selectedCarousel.brandId && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Active Brand DNA</span>
                      <p className="text-sm text-slate-300">{brands.find(b => b.id === selectedCarousel.brandId)?.name || 'Custom Brand'}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Deployment Date</span>
                    <p className="text-sm text-slate-300">{new Date(selectedCarousel.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* DETAIL MODALS (ORIGINALS/TEMPLATES/BRANDS) */}
      {
        selectedRef && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-2xl"><LayoutTemplate size={32} className="text-blue-400" /></div>
                  <div>
                    <h2 className="text-4xl font-bold text-white">{selectedRef.name}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Blueprint DNA Registry</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRef(null)} className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300">Close Registry</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-6 space-y-8">
                  <div className="rounded-[3rem] overflow-hidden border border-slate-800 bg-black aspect-[4/5] shadow-2xl flex items-center justify-center p-4">
                    <img src={selectedRef.templateImage || selectedRef.imageSource} className="max-w-full max-h-full object-contain" alt="Render" />
                  </div>
                  {selectedRef.templateImage && (
                    <div className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Source Comparison</h4>
                      <div className="aspect-video rounded-xl overflow-hidden border border-slate-800 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
                        <img src={selectedRef.imageSource} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-6 space-y-8">
                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl space-y-8">
                    <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
                      <Terminal size={18} className="text-blue-400" />
                      <h3 className="text-lg font-bold tracking-tight">Machine DNA Data</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <VariableBox icon={<LayoutTemplate size={14} className="text-white" />} label="Typology" value={selectedRef.jsonSpec.blueprint_type || 'Headline'} />
                      <VariableBox icon={<Zap size={14} className="text-yellow-400" />} label="Archetype" value={selectedRef.jsonSpec.structural_rules.layout_archetype} />
                      <VariableBox icon={<Grid size={14} className="text-indigo-400" />} label="Composition" value={selectedRef.jsonSpec.structural_rules.composition_map} />
                      <VariableBox icon={<Palette size={14} className="text-pink-400" />} label="Aesthetics" value={selectedRef.jsonSpec.structural_rules.aesthetic_motifs} />
                      <VariableBox icon={<TypeIcon size={14} className="text-cyan-400" />} label="Typography" value={selectedRef.jsonSpec.structural_rules.typography_system} />
                    </div>

                    <div className="space-y-4 pt-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visual DNA Prompt</h4>
                      <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 font-mono text-xs text-blue-400/80 leading-relaxed italic">
                        "{selectedRef.jsonSpec.base_visual_dna_prompt}"
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Layout Constraints</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span>Forbidden: {selectedRef.jsonSpec.layout_constraints.forbidden_elements.join(', ') || 'None'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span>Mandatory: {selectedRef.jsonSpec.layout_constraints.mandatory_anchors.join(', ') || 'None'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl">
                    <div className="flex items-center space-x-3 mb-6">
                      <History size={18} className="text-indigo-400" />
                      <h3 className="text-lg font-bold">Metadata</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Stored On</span>
                        <span className="text-slate-300">{new Date(selectedRef.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Native Aspect Ratio</span>
                        <span className="text-slate-300 font-bold">{selectedRef.aspectRatio}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Registry ID</span>
                        <span className="text-slate-300 font-mono">#BP-{selectedRef.id.slice(-6)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedBrand && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 shadow-2xl"><Palette size={32} className="text-pink-400" /></div>
                  <div>
                    {isEditingBrand && editedBrand ? (
                      <input
                        type="text"
                        className="text-4xl font-bold bg-slate-800 border-none rounded-lg text-white outline-none ring-2 ring-pink-500/30 px-3 py-1"
                        value={editedBrand.name}
                        onChange={(e) => setEditedBrand({ ...editedBrand, name: e.target.value })}
                      />
                    ) : (
                      <h2 className="text-4xl font-bold text-white">{selectedBrand.name}</h2>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Brand DNA Profile</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {isEditingBrand ? (
                    <>
                      <button
                        onClick={() => {
                          if (editedBrand) {
                            onUpdateBrand(editedBrand);
                            setSelectedBrand(editedBrand);
                            setIsEditingBrand(false);
                          }
                        }}
                        className="px-8 py-3.5 rounded-2xl bg-pink-600 hover:bg-pink-500 transition-all font-bold text-white shadow-xl shadow-pink-500/20"
                      >
                        Save Changes
                      </button>
                      <button onClick={() => setIsEditingBrand(false)} className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-400">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditedBrand(selectedBrand);
                          setIsEditingBrand(true);
                        }}
                        className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300"
                      >
                        Edit Profile
                      </button>
                      <button onClick={() => setSelectedBrand(null)} className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300">Close Profile</button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5">
                  <div
                    className="rounded-[3rem] bg-slate-950 border border-slate-800 aspect-square flex items-center justify-center p-12 shadow-2xl cursor-zoom-in group relative overflow-hidden"
                    onClick={() => setFullPreview(selectedBrand.imageSource)}
                  >
                    <img src={selectedBrand.imageSource} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" alt="Logo" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye size={32} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-8">
                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brand Vibe</h4>
                        {isEditingBrand && editedBrand ? (
                          <textarea
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed outline-none ring-1 ring-pink-500/20 focus:ring-pink-500/50 min-h-[160px]"
                            value={editedBrand.dna.brand_vibe}
                            onChange={(e) => setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, brand_vibe: e.target.value } })}
                          />
                        ) : (
                          <p className="text-sm text-slate-300 leading-relaxed break-words">{selectedBrand.dna.brand_vibe}</p>
                        )}
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Color Logic</h4>
                        {isEditingBrand && editedBrand ? (
                          <textarea
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed outline-none ring-1 ring-slate-700/50 focus:ring-slate-500/50 min-h-[160px]"
                            value={editedBrand.dna.color_logic}
                            onChange={(e) => setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, color_logic: e.target.value } })}
                          />
                        ) : (
                          <p className="text-sm text-slate-300 leading-relaxed">{selectedBrand.dna.color_logic}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Primary Palette</h4>
                        {isEditingBrand && editedBrand && (
                          <button
                            onClick={() => setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, primary_colors: [...editedBrand.dna.primary_colors, '#000000'] } })}
                            className="text-[10px] font-bold text-pink-400 uppercase tracking-widest hover:text-pink-300 transition-colors"
                          >
                            + Add Color
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {(isEditingBrand && editedBrand ? editedBrand.dna.primary_colors : selectedBrand.dna.primary_colors).map((color, idx) => (
                          <div key={idx} className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 group/color relative">
                            {isEditingBrand && editedBrand ? (
                              <>
                                <input
                                  type="color"
                                  className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer outline-none"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...editedBrand.dna.primary_colors];
                                    newColors[idx] = e.target.value;
                                    setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, primary_colors: newColors } });
                                  }}
                                />
                                <input
                                  type="text"
                                  className="text-xs font-mono text-slate-400 uppercase bg-transparent border-none w-16 outline-none"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...editedBrand.dna.primary_colors];
                                    newColors[idx] = e.target.value;
                                    setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, primary_colors: newColors } });
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const newColors = editedBrand.dna.primary_colors.filter((_, i) => i !== idx);
                                    setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, primary_colors: newColors } });
                                  }}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/color:opacity-100 transition-opacity"
                                >
                                  <XCircle size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-xl shadow-inner border border-white/10" style={{ backgroundColor: color }} />
                                <span className="text-xs font-mono text-slate-400 uppercase">{color}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Typography Systems</h4>
                      {isEditingBrand && editedBrand ? (
                        <textarea
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed outline-none min-h-[120px]"
                          value={editedBrand.dna.typography_notes}
                          onChange={(e) => setEditedBrand({ ...editedBrand, dna: { ...editedBrand.dna, typography_notes: e.target.value } })}
                        />
                      ) : (
                        <p className="text-sm text-slate-400 italic bg-slate-950/50 p-4 rounded-xl border border-slate-800 leading-relaxed">
                          {selectedBrand.dna.typography_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Forbidden Styles</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedBrand.dna.forbidden_styles.map((style, idx) => (
                        <span key={idx} className="px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase">
                          NO {style}
                        </span>
                      ))}
                      {selectedBrand.dna.forbidden_styles.length === 0 && <span className="text-xs text-slate-600 italic">No restrictions saved.</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedCharacter && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 shadow-2xl"><Users size={32} className="text-green-400" /></div>
                  <div>
                    {isEditingCharacter && editedCharacter ? (
                      <input
                        type="text"
                        className="text-4xl font-bold bg-slate-800 border-none rounded-lg text-white outline-none ring-2 ring-green-500/30 px-3 py-1"
                        value={editedCharacter.name}
                        onChange={(e) => setEditedCharacter({ ...editedCharacter, name: e.target.value })}
                      />
                    ) : (
                      <h2 className="text-4xl font-bold text-white">{selectedCharacter.name}</h2>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Character DNA Profile</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {isEditingCharacter ? (
                    <>
                      <button
                        onClick={() => {
                          if (editedCharacter) {
                            onUpdateCharacter(editedCharacter);
                            setSelectedCharacter(editedCharacter);
                            setIsEditingCharacter(false);
                          }
                        }}
                        className="px-8 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 transition-all font-bold text-white shadow-xl shadow-green-500/20"
                      >
                        Save Changes
                      </button>
                      <button onClick={() => setIsEditingCharacter(false)} className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-400">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditedCharacter(selectedCharacter);
                          setIsEditingCharacter(true);
                        }}
                        className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300"
                      >
                        Edit Profile
                      </button>
                      <button onClick={() => setSelectedCharacter(null)} className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300">Close Profile</button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                  <div
                    className="rounded-[3rem] bg-slate-950 border border-slate-800 aspect-[4/5] flex items-center justify-center p-8 shadow-2xl cursor-zoom-in group relative overflow-hidden"
                    onClick={() => setFullPreview(selectedCharacter.dna.reference_images[0])}
                  >
                    <img src={selectedCharacter.dna.reference_images[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Character Ref" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye size={32} className="text-white" />
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="flex items-center space-x-2 mb-2"><Users size={12} className="text-green-400" /><span className="text-[10px] font-bold text-slate-400 uppercase">Primary Reference</span></div>
                    </div>
                  </div>

                  <div className="p-8 rounded-[2rem] bg-slate-900/50 border border-slate-800">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Reference Gallery</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedCharacter.dna.reference_images.slice(1).map((img, idx) => (
                        <div key={idx} onClick={() => setFullPreview(img)} className="aspect-square rounded-xl overflow-hidden border border-slate-800 cursor-pointer hover:border-green-500/50 transition-all">
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 space-y-8">
                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Physical Features</h4>
                      {isEditingCharacter && editedCharacter ? (
                        <textarea
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed outline-none ring-1 ring-green-500/20 focus:ring-green-500/50 min-h-[140px]"
                          value={editedCharacter.dna.physical_features}
                          onChange={(e) => setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, physical_features: e.target.value } })}
                        />
                      ) : (
                        <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">{selectedCharacter.dna.physical_features}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visual Details</h4>
                      {isEditingCharacter && editedCharacter ? (
                        <textarea
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed outline-none ring-1 ring-green-500/20 focus:ring-green-500/50 min-h-[140px]"
                          value={editedCharacter.dna.visual_details}
                          onChange={(e) => setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, visual_details: e.target.value } })}
                        />
                      ) : (
                        <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">{selectedCharacter.dna.visual_details}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Style Notes</h4>
                      {isEditingCharacter && editedCharacter ? (
                        <textarea
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed outline-none ring-1 ring-green-500/20 focus:ring-green-500/50 min-h-[100px]"
                          value={editedCharacter.dna.style_notes}
                          onChange={(e) => setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, style_notes: e.target.value } })}
                        />
                      ) : (
                        <p className="text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">{selectedCharacter.dna.style_notes}</p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Character Palette</h4>
                        {isEditingCharacter && editedCharacter && (
                          <button
                            onClick={() => setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, color_palette: [...editedCharacter.dna.color_palette, '#000000'] } })}
                            className="text-[10px] font-bold text-green-400 uppercase tracking-widest hover:text-green-300 transition-colors"
                          >
                            + Add Color
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {(isEditingCharacter && editedCharacter ? editedCharacter.dna.color_palette : selectedCharacter.dna.color_palette).map((color, idx) => (
                          <div key={idx} className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 group/color relative">
                            {isEditingCharacter && editedCharacter ? (
                              <>
                                <input
                                  type="color"
                                  className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer outline-none"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...editedCharacter.dna.color_palette];
                                    newColors[idx] = e.target.value;
                                    setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, color_palette: newColors } });
                                  }}
                                />
                                <input
                                  type="text"
                                  className="text-xs font-mono text-slate-400 uppercase bg-transparent border-none w-16 outline-none"
                                  value={color}
                                  onChange={(e) => {
                                    const newColors = [...editedCharacter.dna.color_palette];
                                    newColors[idx] = e.target.value;
                                    setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, color_palette: newColors } });
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    const newColors = editedCharacter.dna.color_palette.filter((_, i) => i !== idx);
                                    setEditedCharacter({ ...editedCharacter, dna: { ...editedCharacter.dna, color_palette: newColors } });
                                  }}
                                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/color:opacity-100 transition-opacity"
                                >
                                  <XCircle size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded-xl shadow-inner border border-white/10" style={{ backgroundColor: color }} />
                                <span className="text-xs font-mono text-slate-400 uppercase">{color}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedCharacterPose && (
          <div className="fixed inset-0 z-[100] bg-[#020617] backdrop-blur-3xl overflow-y-auto animate-in fade-in duration-300">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                <div className="flex items-center space-x-6">
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-2xl"><Wand2 size={32} className="text-purple-400" /></div>
                  <div>
                    <h2 className="text-4xl font-bold text-white">{selectedCharacterPose.name}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Character Pose detail</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCharacterPose(null)} className="px-8 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 transition-all font-bold text-slate-300">Close Pose</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-6">
                  <div
                    className="rounded-[3rem] bg-slate-950 border border-slate-800 aspect-[4/5] flex items-center justify-center p-8 shadow-2xl cursor-zoom-in group relative overflow-hidden"
                    onClick={() => setFullPreview(selectedCharacterPose.generatedImage)}
                  >
                    <img src={selectedCharacterPose.generatedImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Generated Pose" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye size={32} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-8">
                  <div className="p-10 rounded-[3rem] bg-slate-900/50 border border-slate-800 shadow-2xl space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Linked Character</h4>
                      <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center space-x-4">
                        {characters.find(c => c.id === selectedCharacterPose.characterId)?.dna.reference_images[0] && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-800">
                            <img src={characters.find(c => c.id === selectedCharacterPose.characterId)?.dna.reference_images[0]} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-bold">{characters.find(c => c.id === selectedCharacterPose.characterId)?.name || 'Unknown Character'}</p>
                          <p className="text-xs text-slate-500 uppercase tracking-widest">Active Identity Anchor</p>
                        </div>
                      </div>
                    </div>

                    {selectedCharacterPose.posePrompt && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pose Instruction</h4>
                        <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 font-mono text-xs text-purple-400/80 leading-relaxed">
                          "{selectedCharacterPose.posePrompt}"
                        </div>
                      </div>
                    )}

                    {selectedCharacterPose.poseReference && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pose Reference Anchor</h4>
                        <div className="aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-black group relative cursor-zoom-in" onClick={() => setFullPreview(selectedCharacterPose.poseReference!)}>
                          <img src={selectedCharacterPose.poseReference} className="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <Eye size={24} className="text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex flex-col space-y-1">
                        <span className="text-slate-500 uppercase tracking-widest text-[8px] font-bold">Generated On</span>
                        <span className="text-slate-300">{new Date(selectedCharacterPose.createdAt).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => {
                          onDeleteCharacterPose(selectedCharacterPose.id);
                          setSelectedCharacterPose(null);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all font-bold uppercase text-[10px]"
                      >
                        <Trash2 size={14} />
                        <span>Delete Pose</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        isAnnotating && selectedPost && (
          <AnnotationCanvas
            imageSource={selectedPost.imageSource}
            onCancel={() => setIsAnnotating(false)}
            onSave={(sketch) => {
              setAnnotationSketch(sketch);
              setIsAnnotating(false);
            }}
          />
        )
      }

      {
        fullPreview && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-8 bg-black/95 animate-in fade-in duration-300">
            <button onClick={() => setFullPreview(null)} className="absolute top-8 right-8 p-4 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10">
              <XCircle size={32} />
            </button>
            <img src={fullPreview} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-white/10" alt="Full Preview" />
          </div>
        )
      }
    </div >
  );
};

const VariableBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="p-6 rounded-2xl bg-slate-800/40 border border-slate-700/30 flex flex-col space-y-3 transition-all">
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-sm font-medium text-slate-200 leading-relaxed capitalize">
      {value || 'N/A'}
    </p>
  </div>
);

const EmptyState = ({ icon, label }: any) => (
  <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/20 flex flex-col items-center">
    <div className="opacity-10 mb-6">{icon}</div>
    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">{label}</p>
  </div>
);

export default Library;
