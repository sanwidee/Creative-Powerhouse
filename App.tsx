
import React, { useState, useEffect } from 'react';
import { Wrench, Star, Rocket, Terminal, Github, Moon, Sun, Zap, Palette, ChevronRight, Key, Globe, Settings as SettingsIcon, Users, Wand2, Leaf, Layers, Volume2, BookOpen, Briefcase, Grid3X3, LayoutTemplate } from 'lucide-react';
import { AppTool, DesignReference, BrandReference, GeneratedPost, CharacterReference, GeneratedCharacterPose, AudioReference, Preset, FeedPreviewProject, FeedPreviewState } from './types';
import Builder from './components/Builder';
import Library from './components/Library';
import Generator from './components/Generator';
import BrandLab from './components/BrandLab';
import CharacterLab from './components/CharacterLab';
import CharacterStudio from './components/CharacterStudio';
import CarouselGenerator from './components/CarouselGenerator';
import Settings from './components/Settings';
import AssistantHub from './components/AssistantHub';
import AudioLab from './components/AudioLab';
import Documentation from './components/Documentation';
import BrandStudio from './components/BrandStudio';
import FeedPreview from './components/FeedPreview';
import Studio from './components/Studio';


// Branding Assets
const LOGO_SRC = "./logo.png";

const createDefaultFeedPreview = (): FeedPreviewState => ({
  version: 1,
  profile: {
    handle: 'qlipper.ai',
    displayName: 'Qlipper AI',
    bio: 'Draft your Instagram grid using generated posts.\nKeep the feed consistent. Keep the cadence steady.',
    website: 'https://qlipper.ai',
    igTheme: 'light',
  },
  postIds: [],
  captions: {},
  updatedAt: Date.now(),
});

const createFeedPreviewProject = (name: string, state?: FeedPreviewState): FeedPreviewProject => ({
  id: `feed_${Date.now()}`,
  name,
  createdAt: Date.now(),
  state: state || {
    ...createDefaultFeedPreview(),
    profile: {
      ...createDefaultFeedPreview().profile,
      handle: name,
      displayName: name,
      website: name.includes('.') ? `https://${name}` : '',
    },
  },
});

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<AppTool>(AppTool.LANDING);
  const [references, setReferences] = useState<DesignReference[]>([]);
  const [brands, setBrands] = useState<BrandReference[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [characters, setCharacters] = useState<CharacterReference[]>([]);
  const [characterPoses, setCharacterPoses] = useState<GeneratedCharacterPose[]>([]);
  const [generatedCarousels, setGeneratedCarousels] = useState<any[]>([]);
  const [audioVoices, setAudioVoices] = useState<AudioReference[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [feedPreviews, setFeedPreviews] = useState<FeedPreviewProject[]>([]);
  const [activeFeedPreviewId, setActiveFeedPreviewId] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem('ikhsan_active_feed_preview') || '';
  });
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('ikhsan_theme')) {
      return localStorage.getItem('ikhsan_theme') as 'light' | 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('ikhsan_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        setIsStandalone(false);
      } else {
        setIsStandalone(true);
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        const savedKey = localStorage.getItem('IKHSAN_LAB_KEY');
        setHasKey(!!(envKey || savedKey));
      }
    };
    checkKey();

    const loadData = async () => {
      try {
        const fetchCollection = async (coll: string) => {
          try {
            const res = await fetch(`/api/${coll}`);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
          } catch (e) {
            console.error(`Failed to fetch ${coll}:`, e);
            return [];
          }
        };

        const remoteRefs = await fetchCollection('references');
        const remoteBrands = await fetchCollection('brands');
        const remotePosts = await fetchCollection('posts');
        const remoteCarousels = await fetchCollection('carousels');
        const remoteChars = await fetchCollection('characters');
        const remoteCharPoses = await fetchCollection('character_poses');
        const remoteVoices = await fetchCollection('audio_voices');
        const remotePresets = await fetchCollection('presets');
        const remoteFeedPreviewsRaw = await fetchCollection('feed_previews');

        let remoteFeedPreviews: FeedPreviewProject[] = Array.isArray(remoteFeedPreviewsRaw)
          ? (remoteFeedPreviewsRaw as any[]).filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' && p.state && typeof p.state === 'object') as FeedPreviewProject[]
          : [];

        // Back-compat: migrate legacy single-object feed_preview -> feed_previews
        if (remoteFeedPreviews.length === 0) {
          try {
            const res = await fetch('/api/feed_preview');
            if (res.ok) {
              const legacy = await res.json();
              if (legacy && typeof legacy === 'object' && Array.isArray((legacy as any).postIds) && (legacy as any).profile) {
                const legacyState = legacy as FeedPreviewState;
                const legacyName = (legacyState.profile?.handle || 'Default Feed').trim() || 'Default Feed';
                remoteFeedPreviews = [createFeedPreviewProject(legacyName, legacyState)];
                await saveData('feed_previews', remoteFeedPreviews);
              }
            }
          } catch (e) {
            // Ignore; we'll fall back to defaults
          }
        }

        // Migration Check
        const localRefs = localStorage.getItem('ikhsan_design_refs');
        const localBrands = localStorage.getItem('ikhsan_brand_refs');
        const localPosts = localStorage.getItem('ikhsan_generated_posts');

        if (localRefs || localBrands || localPosts) {
          console.log("Migration detected. Merging local data to disk...");
          const migratedRefs = [...remoteRefs, ...(localRefs ? JSON.parse(localRefs) : [])];
          const migratedBrands = [...remoteBrands, ...(localBrands ? JSON.parse(localBrands) : [])];
          const migratedPosts = [...remotePosts, ...(localPosts ? JSON.parse(localPosts) : [])];

          await saveData('references', migratedRefs);
          await saveData('brands', migratedBrands);
          await saveData('posts', migratedPosts);

          setReferences(migratedRefs);
          setBrands(migratedBrands);
          setGeneratedPosts(migratedPosts);
          setGeneratedCarousels(remoteCarousels);
          if (remoteFeedPreviews.length === 0) remoteFeedPreviews = [createFeedPreviewProject('qlipper.ai')];
          setFeedPreviews(remoteFeedPreviews);

          localStorage.removeItem('ikhsan_design_refs');
          localStorage.removeItem('ikhsan_brand_refs');
          localStorage.removeItem('ikhsan_generated_posts');
          console.log("Migration complete.");
        } else {
          setReferences(remoteRefs);
          setBrands(remoteBrands);
          setGeneratedPosts(remotePosts);
          setGeneratedCarousels(remoteCarousels);
          if (remoteFeedPreviews.length === 0) remoteFeedPreviews = [createFeedPreviewProject('qlipper.ai')];
          setFeedPreviews(remoteFeedPreviews);
        }

        // Active feed preview selection (persisted locally)
        const storedActive = localStorage.getItem('ikhsan_active_feed_preview') || '';
        const firstId = remoteFeedPreviews[0]?.id || '';
        const nextActive = remoteFeedPreviews.some((p) => p.id === storedActive) ? storedActive : firstId;
        if (nextActive) {
          setActiveFeedPreviewId(nextActive);
          localStorage.setItem('ikhsan_active_feed_preview', nextActive);
        }

        setCharacters(remoteChars);
        setCharacters(remoteChars);
        setCharacterPoses(remoteCharPoses);
        setAudioVoices(remoteVoices);
        setPresets(remotePresets);
      } catch (err) {
        console.error("Critical failure in loadData:", err);
      }
    };
    loadData();
  }, []);

  const handleOpenKey = async () => {
    if (isStandalone) {
      if (manualKey.trim().length > 20) {
        localStorage.setItem('IKHSAN_LAB_KEY', manualKey.trim());
        setHasKey(true);
      }
    } else {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const saveData = async (collection: string, data: any) => {
    try {
      await fetch(`/api/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error(`Failed to save ${collection}:`, err);
    }
  };

  const saveReference = (ref: DesignReference) => {
    const updated = [ref, ...references];
    setReferences(updated);
    saveData('references', updated);
  };

  const saveBrand = (brand: BrandReference) => {
    const updated = [brand, ...brands];
    setBrands(updated);
    saveData('brands', updated);
  };

  const saveGeneratedPost = (post: GeneratedPost) => {
    const updated = [post, ...generatedPosts];
    setGeneratedPosts(updated);
    saveData('posts', updated);
  };

  const saveGeneratedCarousel = (carousel: any) => {
    const updated = [carousel, ...generatedCarousels];
    setGeneratedCarousels(updated);
    saveData('carousels', updated);
  };

  const updateGeneratedPost = (post: GeneratedPost) => {
    const updated = generatedPosts.map(p => p.id === post.id ? post : p);
    setGeneratedPosts(updated);
    saveData('posts', updated);
  };

  const deleteReference = (id: string) => {
    const updated = references.filter(r => r.id !== id);
    setReferences(updated);
    saveData('references', updated);
  };

  const deleteBrand = (id: string) => {
    const updated = brands.filter(b => b.id !== id);
    setBrands(updated);
    saveData('brands', updated);
  };

  const updateReference = (ref: DesignReference) => {
    const updated = references.map(r => r.id === ref.id ? ref : r);
    setReferences(updated);
    saveData('references', updated);
  };

  const updateBrand = (brand: BrandReference) => {
    const updated = brands.map(b => b.id === brand.id ? brand : b);
    setBrands(updated);
    saveData('brands', updated);
  };

  const deleteGeneratedPost = (id: string) => {
    const updated = generatedPosts.filter(p => p.id !== id);
    setGeneratedPosts(updated);
    saveData('posts', updated);
  };

  const deleteGeneratedCarousel = (id: string) => {
    const updated = generatedCarousels.filter(c => c.id !== id);
    setGeneratedCarousels(updated);
    saveData('carousels', updated);
  };

  const saveCharacter = (char: CharacterReference) => {
    const updated = [char, ...characters];
    setCharacters(updated);
    saveData('characters', updated);
  };

  const updateCharacter = (char: CharacterReference) => {
    const updated = characters.map(c => c.id === char.id ? char : c);
    setCharacters(updated);
    saveData('characters', updated);
  };

  const deleteCharacter = (id: string) => {
    const updated = characters.filter(c => c.id !== id);
    setCharacters(updated);
    saveData('characters', updated);
  };

  const saveCharacterPose = (pose: GeneratedCharacterPose) => {
    const updated = [pose, ...characterPoses];
    setCharacterPoses(updated);
    saveData('character_poses', updated);
  };

  const deleteCharacterPose = (id: string) => {
    const updated = characterPoses.filter(p => p.id !== id);
    setCharacterPoses(updated);
    saveData('character_poses', updated);
  };

  const saveAudioVoice = (voice: AudioReference) => {
    const updated = [voice, ...audioVoices];
    setAudioVoices(updated);
    saveData('audio_voices', updated);
  };

  const deleteAudioVoice = (id: string) => {
    const updated = audioVoices.filter(v => v.id !== id);
    setAudioVoices(updated);
    saveData('audio_voices', updated);
  };

  const savePreset = (preset: Preset) => {
    const updated = [preset, ...presets];
    setPresets(updated);
    saveData('presets', updated);
  };

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    saveData('presets', updated);
  };

  const persistFeedPreviews = (updated: FeedPreviewProject[]) => {
    setFeedPreviews(updated);
    saveData('feed_previews', updated);
  };

  const selectFeedPreviewProject = (id: string) => {
    setActiveFeedPreviewId(id);
    localStorage.setItem('ikhsan_active_feed_preview', id);
  };

  const createFeedPreview = (name?: string) => {
    const project = createFeedPreviewProject((name || 'new.account').trim() || 'new.account');
    const updated = [project, ...feedPreviews];
    persistFeedPreviews(updated);
    selectFeedPreviewProject(project.id);
  };

  const renameFeedPreview = (id: string, name: string) => {
    const nextName = name.trim();
    if (!nextName) return;
    const updated = feedPreviews.map((p) => (p.id === id ? { ...p, name: nextName } : p));
    persistFeedPreviews(updated);
  };

  const deleteFeedPreview = (id: string) => {
    if (feedPreviews.length <= 1) return;
    const updated = feedPreviews.filter((p) => p.id !== id);
    persistFeedPreviews(updated);
    if (activeFeedPreviewId === id) {
      const nextId = updated[0]?.id;
      if (nextId) selectFeedPreviewProject(nextId);
    }
  };

  const updateFeedPreviewState = (id: string, next: FeedPreviewState) => {
    const updated = feedPreviews.map((p) => (p.id === id ? { ...p, state: next } : p));
    persistFeedPreviews(updated);
  };

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-[2.5rem] border border-slate-800 bg-slate-900/50 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-blue-500/10 border border-blue-500/20">
              <Key size={40} className="text-blue-500" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Activation Required</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            {isStandalone
              ? "Stand-alone mode detected. Please enter your Gemini API key to activate the Production Lab."
              : "Studio mode detected. This lab requires a paid API key from your Google Cloud project."}
          </p>

          {isStandalone ? (
            <div className="space-y-4 mb-8">
              <input
                type="password"
                placeholder="Paste API Key here..."
                className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-mono"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
              />
              <p className="text-[10px] text-slate-500 italic">Key is saved locally in your browser and persists across sessions. Never sent to our servers.</p>
            </div>
          ) : (
            <div className="mb-8">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs flex items-center justify-center gap-2">
                <Globe size={14} /> Review billing documentation
              </a>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleOpenKey}
              disabled={isStandalone && manualKey.trim().length < 20}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
            >
              {isStandalone ? "Activate Lab" : "Select Paid API Key"}
            </button>

            {isStandalone && import.meta.env.VITE_GEMINI_API_KEY && (
              <button
                onClick={() => setHasKey(true)}
                className="w-full py-3 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 rounded-2xl text-xs font-semibold transition-all"
              >
                Cancel & Use Default (.env)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderTool = () => {
    switch (activeTool) {
      case AppTool.BUILDER:
        return <Builder onSave={saveReference} onBack={() => setActiveTool(AppTool.LANDING)} />;
      case AppTool.STUDIO:
        return <Studio onSavePost={saveGeneratedPost} onBack={() => setActiveTool(AppTool.LANDING)} />;
      case AppTool.LIBRARY:
        return (
          <Library
            references={references}
            brands={brands}
            generatedPosts={generatedPosts}
            generatedCarousels={generatedCarousels}
            characters={characters}
            characterPoses={characterPoses}
            onDelete={deleteReference}
            onDeleteBrand={deleteBrand}
            onDeletePost={deleteGeneratedPost}
            onDeleteCarousel={deleteGeneratedCarousel}
            onDeleteCharacter={deleteCharacter}
            onDeleteCharacterPose={deleteCharacterPose}
            onUpdateReference={updateReference}
            onUpdateBrand={updateBrand}
            onUpdatePost={updateGeneratedPost}
            onUpdateCharacter={updateCharacter}
            audioVoices={audioVoices}
            onDeleteAudioVoice={deleteAudioVoice}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.GENERATOR:
        return (
          <Generator
            references={references}
            brands={brands}
            characters={characters}
            presets={presets}
            onSavePost={saveGeneratedPost}
            onSavePreset={savePreset}
            onDeletePreset={deletePreset}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.FEED_PREVIEW:
        return (
          <FeedPreview
            generatedPosts={generatedPosts}
            projects={feedPreviews.length ? feedPreviews : [createFeedPreviewProject('qlipper.ai')]}
            activeProjectId={activeFeedPreviewId || (feedPreviews[0]?.id || '')}
            onSelectProject={selectFeedPreviewProject}
            onCreateProject={createFeedPreview}
            onDeleteProject={deleteFeedPreview}
            onRenameProject={renameFeedPreview}
            onUpdateProjectState={updateFeedPreviewState}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.CAROUSEL_GENERATOR:
        return (
          <CarouselGenerator
            references={references}
            brands={brands}
            characters={characters}
            presets={presets}
            onSave={saveGeneratedCarousel}
            onSavePreset={savePreset}
            onDeletePreset={deletePreset}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.BRAND_STUDIO:
        return (
          <BrandStudio
            brands={brands}
            references={references}
            generatedPosts={generatedPosts}
            onSavePost={saveGeneratedPost}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.BRAND_LAB:
        return <BrandLab onSave={saveBrand} onBack={() => setActiveTool(AppTool.LANDING)} />;
      case AppTool.CHARACTER_LAB:
        return <CharacterLab onSave={saveCharacter} onBack={() => setActiveTool(AppTool.LANDING)} brands={brands} characters={characters} />;
      case AppTool.CHARACTER_STUDIO:
        return <CharacterStudio characters={characters} onSave={saveCharacterPose} onBack={() => setActiveTool(AppTool.LANDING)} />;
      case AppTool.AUDIO_LAB:
        return <AudioLab onSave={saveAudioVoice} onBack={() => setActiveTool(AppTool.LANDING)} savedVoices={audioVoices} onDelete={deleteAudioVoice} />;
      case AppTool.SETTINGS:
        return (
          <Settings
            currentKey={localStorage.getItem('IKHSAN_LAB_KEY') || manualKey || ''}
            onUpdateKey={(key) => {
              localStorage.setItem('IKHSAN_LAB_KEY', key);
              setManualKey(key);
              setHasKey(true);
            }}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.DOCS:
        return <Documentation onBack={() => setActiveTool(AppTool.LANDING)} />;
      default:
        return (
          <div className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in zoom-in duration-700">
            <header className="mb-20 text-center relative">
              <div className="flex justify-center mb-8">
                <div className="p-1 rounded-[2.5rem] bg-gradient-to-b from-green-500/20 to-transparent border border-green-500/10 shadow-2xl">
                  <img src={LOGO_SRC} className="w-24 h-24 object-contain animate-pulse-slow" alt="Weed Labs" />
                </div>
              </div>
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-green-500/5 border border-green-500/10 mb-6 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-[0.3em]">Advanced AI Production Suite</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter italic">
                WEED <span className="text-green-500">LABS</span>
              </h1>
              <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
                The ultimate cyber-botanical production suite. <span className="text-slate-900 dark:text-slate-200">Extract DNA, cultivate content, and maintain perfect consistency.</span>
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <ToolCard icon={<LayoutTemplate className="text-pink-400" />} title="Studio" desc="Programmable templates. Pixel-perfect output." onClick={() => setActiveTool(AppTool.STUDIO)} accent="pink" />
              <ToolCard icon={<Briefcase className="text-orange-400" />} title="Brand Studio" desc="Campaign Hub. Asset → Post at scale." onClick={() => setActiveTool(AppTool.BRAND_STUDIO)} accent="orange" />
              <ToolCard icon={<Wrench className="text-blue-400" />} title="Design Builder" desc="Extract Structural DNA." onClick={() => setActiveTool(AppTool.BUILDER)} accent="blue" />
              <ToolCard icon={<Palette className="text-pink-400" />} title="Brand Identity" desc="Save Color DNA." onClick={() => setActiveTool(AppTool.BRAND_LAB)} accent="pink" />
              <ToolCard icon={<Users className="text-green-400" />} title="Character Lab" desc="Extract Character DNA." onClick={() => setActiveTool(AppTool.CHARACTER_LAB)} accent="green" />
              <ToolCard icon={<Star className="text-cyan-400" />} title="My Files" desc="Manage Results." onClick={() => setActiveTool(AppTool.LIBRARY)} accent="cyan" />
              <ToolCard icon={<Rocket className="text-indigo-400" />} title="Post Generator" desc="Deploy & Remix." onClick={() => setActiveTool(AppTool.GENERATOR)} accent="indigo" />
              <ToolCard icon={<Grid3X3 className="text-pink-400" />} title="Feed Preview" desc="Mock your Instagram grid." onClick={() => setActiveTool(AppTool.FEED_PREVIEW)} accent="pink" />
              <ToolCard icon={<Layers className="text-blue-400" />} title="Carousel Generator" desc="Multiple Slides." onClick={() => setActiveTool(AppTool.CAROUSEL_GENERATOR)} accent="blue" />
              <ToolCard icon={<Wand2 className="text-purple-400" />} title="Character Studio" desc="Generate Poses." onClick={() => setActiveTool(AppTool.CHARACTER_STUDIO)} accent="purple" />
              <ToolCard icon={<Volume2 className="text-pink-400" />} title="Audio Lab" desc="Synthesize Voice." onClick={() => setActiveTool(AppTool.AUDIO_LAB)} accent="pink" />
            </div>
          </div>
        );
    }
  };

  const menuItems = [
    { tool: AppTool.STUDIO, icon: <LayoutTemplate size={20} />, label: "Studio", color: "pink" },
    { tool: AppTool.BRAND_STUDIO, icon: <Briefcase size={20} />, label: "Brand Studio", color: "orange" },
    { tool: AppTool.BUILDER, icon: <Wrench size={20} />, label: "Builder", color: "blue" },
    { tool: AppTool.BRAND_LAB, icon: <Palette size={20} />, label: "Brand Lab", color: "pink" },
    { tool: AppTool.CHARACTER_LAB, icon: <Users size={20} />, label: "Char Lab", color: "green" },
    { tool: AppTool.LIBRARY, icon: <Star size={20} />, label: "My Files", color: "cyan" },
    { tool: AppTool.GENERATOR, icon: <Rocket size={20} />, label: "Generator", color: "indigo" },
    { tool: AppTool.FEED_PREVIEW, icon: <Grid3X3 size={20} />, label: "Feed", color: "pink" },
    { tool: AppTool.CAROUSEL_GENERATOR, icon: <Layers size={20} />, label: "Carousels", color: "blue" },
    { tool: AppTool.CHARACTER_STUDIO, icon: <Wand2 size={20} />, label: "Char Studio", color: "purple" },
    { tool: AppTool.AUDIO_LAB, icon: <Volume2 size={20} />, label: "Audio", color: "pink" },
  ];

  return (
    <div className={`min-h-screen relative ${theme === 'dark' ? 'bg-[#020617] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} flex overflow-hidden transition-colors duration-500`}>

      {/* Liquid Background Elements (Light Mode Only) */}
      {theme === 'light' && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-400/10 blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-400/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
        </div>
      )}

      {/* Sidebar Navigation (Conditional) */}
      {activeTool !== AppTool.LANDING && (
        <aside
          className={`h-screen border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617] backdrop-blur-xl z-[100] transition-all duration-500 flex flex-col items-center py-6 shrink-0 relative ${isSidebarHovered ? 'w-64' : 'w-20'}`}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div onClick={() => setActiveTool(AppTool.LANDING)} className="mb-10 cursor-pointer group px-4 w-full flex items-center justify-center">
            <div className={`transition-all duration-500 flex items-center ${isSidebarHovered ? 'space-x-4 w-full' : 'justify-center'}`}>
              <img src={LOGO_SRC} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
              {isSidebarHovered && <span className="font-black text-xl tracking-tighter italic animate-in fade-in slide-in-from-left duration-300">WEED <span className="text-green-500">LABS</span></span>}
            </div>
          </div>

          <nav className="flex-1 space-y-2 w-full px-4 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item.tool}
                onClick={() => setActiveTool(item.tool)}
                className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 ${activeTool === item.tool
                  ? `bg-white dark:bg-slate-800 text-green-600 dark:text-white shadow-xl shadow-green-900/5 dark:shadow-none border border-green-100 dark:border-slate-700`
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-200'
                  } ${isSidebarHovered ? 'space-x-4' : 'justify-center'}`}
              >
                <div className={`transition-transform duration-300 ${activeTool === item.tool ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: activeTool === item.tool ? `text-${item.color}-500 dark:text-${item.color}-400` : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                  })}
                </div>
                {isSidebarHovered && (
                  <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-300">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto px-4 w-full space-y-2">
            <button
              onClick={toggleTheme}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${isSidebarHovered ? 'space-x-4' : 'justify-center'}`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-yellow-400 group-hover:text-yellow-300" />
              ) : (
                <Moon size={20} className="text-slate-400 group-hover:text-slate-600" />
              )}
              {isSidebarHovered && (
                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-300">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTool(AppTool.DOCS)}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${isSidebarHovered ? 'space-x-4' : 'justify-center'}`}
              title="Documentation"
            >
              <BookOpen size={20} className="text-slate-400 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-orange-400" />
              {isSidebarHovered && (
                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-300">
                  Docs
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTool(AppTool.SETTINGS)}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${isSidebarHovered ? 'space-x-4' : 'justify-center'}`}
              title="Settings"
            >
              <SettingsIcon size={20} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400" />
              {isSidebarHovered && (
                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-300">
                  Settings
                </span>
              )}
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-screen">
        {activeTool === AppTool.LANDING && (
          <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 px-8 h-20 flex items-center justify-between shrink-0">
            <div onClick={() => setActiveTool(AppTool.LANDING)} className="flex items-center space-x-4 cursor-pointer">
              <img src={LOGO_SRC} className="w-10 h-10 object-contain" />
              <span className="font-black text-2xl tracking-tighter italic text-slate-900 dark:text-white">WEED <span className="text-green-500">LABS</span></span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveTool(AppTool.DOCS)}
                className="p-3 rounded-2xl bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-all border border-slate-200 dark:border-slate-700/50 flex items-center space-x-2"
                title="Documentation & Guides"
              >
                <BookOpen size={20} />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Docs</span>
              </button>

              <button
                onClick={toggleTheme}
                className="p-3 rounded-2xl bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700/50"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun size={20} className="text-yellow-400" />
                ) : (
                  <Moon size={20} className="text-slate-600" />
                )}
              </button>

              <button
                onClick={() => setActiveTool(AppTool.SETTINGS)}
                className="p-3 rounded-2xl bg-slate-100/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700/50 flex items-center space-x-3"
              >
                <SettingsIcon size={20} />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Settings</span>
              </button>
            </div>
          </nav>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderTool()}
        </div>
      </main>

      <AssistantHub />

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 10px rgba(34,197,94,0.4)); }
          50% { opacity: 0.8; transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(34,197,94,0.2)); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

// Helper for safety with Tailwind compiler
const getAccentClasses = (accent: string) => {
  const map: Record<string, { light: string, dark: string, icon: string, border: string }> = {
    blue: { light: 'hover:shadow-blue-500/20', dark: 'dark:hover:border-blue-500/50', icon: 'text-blue-500', border: 'border-blue-500/10' },
    pink: { light: 'hover:shadow-pink-500/20', dark: 'dark:hover:border-pink-500/50', icon: 'text-pink-500', border: 'border-pink-500/10' },
    green: { light: 'hover:shadow-green-500/20', dark: 'dark:hover:border-green-500/50', icon: 'text-green-500', border: 'border-green-500/10' },
    cyan: { light: 'hover:shadow-cyan-500/20', dark: 'dark:hover:border-cyan-500/50', icon: 'text-cyan-500', border: 'border-cyan-500/10' },
    indigo: { light: 'hover:shadow-indigo-500/20', dark: 'dark:hover:border-indigo-500/50', icon: 'text-indigo-500', border: 'border-indigo-500/10' },
    purple: { light: 'hover:shadow-purple-500/20', dark: 'dark:hover:border-purple-500/50', icon: 'text-purple-500', border: 'border-purple-500/10' },
    orange: { light: 'hover:shadow-orange-500/20', dark: 'dark:hover:border-orange-500/50', icon: 'text-orange-500', border: 'border-orange-500/10' },
  };
  return map[accent] || map.blue;
};

const ToolCard = ({ icon, title, desc, onClick, accent }: any) => {
  const styles = getAccentClasses(accent);

  return (
    <div onClick={onClick} className={`
      relative overflow-hidden group p-8 rounded-[2rem] cursor-pointer transition-all duration-500
      border
      /* Light Mode: Liquid Glass */
      bg-white/60 backdrop-blur-2xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
      hover:bg-white/80 hover:scale-[1.02] ${styles.light} hover:shadow-2xl
      /* Dark Mode: Cyber-Botanical */
      dark:bg-slate-900/40 dark:border-slate-800 dark:shadow-none
      ${styles.dark} dark:hover:bg-slate-900/60
    `}>
      {/* Light Mode Ambient Glow */}
      <div className={`absolute -right-20 -top-20 w-60 h-60 bg-gradient-to-br from-${accent}-500/10 to-transparent blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none dark:hidden`} />

      <div className={`mb-6 p-4 rounded-2xl w-fit transition-all duration-500
        bg-slate-50 dark:bg-slate-800/50 group-hover:scale-110 group-hover:bg-white dark:group-hover:bg-slate-800 shadow-sm dark:shadow-none`}>
        {React.cloneElement(icon, { className: `w-8 h-8 ${styles.icon} transition-colors` })}
      </div>

      <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white tracking-tight">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8">{desc}</p>

      <div className={`flex items-center text-xs font-black tracking-[0.2em] uppercase ${styles.icon} group-hover:translate-x-2 transition-transform duration-300`}>
        ENTER CHAMBER <ChevronRight size={14} className="ml-1" />
      </div>
    </div>
  );
};

export default App;
