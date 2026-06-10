
import React, { useState, useEffect } from 'react';
import { Wrench, Star, Rocket, Terminal, Github, Moon, Sun, Zap, Palette, ChevronRight, Key, Globe, Settings as SettingsIcon, Users, Wand2, Leaf, Layers, Volume2, BookOpen, Briefcase, Grid3X3, LayoutTemplate, Lightbulb, Sparkles, CalendarDays, X, Library as LibraryIcon, PanelLeftClose, PanelLeftOpen, Image as ImageIcon } from 'lucide-react';
import { AppTool, DesignReference, BrandReference, GeneratedPost, CharacterReference, GeneratedCharacterPose, AudioReference, Preset, FeedPreviewProject, FeedPreviewState, BrandAsset, ContentPlan } from './types';
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
import BrandAssetManager from './components/BrandAssetManager';
import PlanQueue from './components/PlanQueue';


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
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);
  const [contentPlans, setContentPlans] = useState<ContentPlan[]>([]);
  const [activeFeedPreviewId, setActiveFeedPreviewId] = useState<string>(() => {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem('ikhsan_active_feed_preview') || '';
  });
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    const saved = localStorage.getItem('ikhsan_sidebar_open');
    return saved === null ? true : saved === 'true';
  });
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem('ikhsan_sidebar_open', String(next)); } catch {}
      return next;
    });
  };
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
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
        const remoteBrandAssets = await fetchCollection('brand_assets');
        const remoteContentPlans = await fetchCollection('content_plans');

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
        setCharacterPoses(remoteCharPoses);
        setAudioVoices(remoteVoices);
        setPresets(remotePresets);
        setBrandAssets(remoteBrandAssets);
        setContentPlans(remoteContentPlans);
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

  const updateContentPlan = (plan: ContentPlan) => {
    const updated = contentPlans.map((p) => (p.id === plan.id ? plan : p));
    setContentPlans(updated);
    saveData('content_plans', updated);
  };

  const saveBrandAsset = (asset: BrandAsset) => {
    const updated = [asset, ...brandAssets];
    setBrandAssets(updated);
    saveData('brand_assets', updated);
  };

  const saveBrandAssetsBulk = (assets: BrandAsset[]) => {
    const updated = [...assets, ...brandAssets];
    setBrandAssets(updated);
    saveData('brand_assets', updated);
  };

  const updateBrandAsset = (asset: BrandAsset) => {
    const updated = brandAssets.map((a) => (a.id === asset.id ? asset : a));
    setBrandAssets(updated);
    saveData('brand_assets', updated);
  };

  const deleteBrandAsset = (id: string) => {
    const updated = brandAssets.filter((a) => a.id !== id);
    setBrandAssets(updated);
    saveData('brand_assets', updated);
  };

  const saveGeneratedPost = (post: GeneratedPost) => {
    setGeneratedPosts((prev) => {
      const updated = [post, ...prev];
      saveData('posts', updated);
      return updated;
    });
  };

  const saveGeneratedPostsBulk = (posts: GeneratedPost[]) => {
    if (posts.length === 0) return;
    setGeneratedPosts((prev) => {
      const updated = [...posts, ...prev];
      saveData('posts', updated);
      return updated;
    });
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
      case AppTool.BRAND_ASSETS:
        return (
          <BrandAssetManager
            brands={brands}
            assets={brandAssets}
            onSaveBulk={saveBrandAssetsBulk}
            onUpdate={updateBrandAsset}
            onDelete={deleteBrandAsset}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.PLAN_QUEUE:
        return (
          <PlanQueue
            plans={contentPlans}
            brands={brands}
            brandAssets={brandAssets}
            generatedPosts={generatedPosts}
            onUpdatePlan={updateContentPlan}
            onSavePost={saveGeneratedPost}
            onSavePostsBulk={saveGeneratedPostsBulk}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
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
      case AppTool.DOCS:
        // Settings/Docs are now overlay sheets — fall through to landing.
        return renderLanding();
      default:
        return renderLanding();
    }
  };

  const renderLanding = () => {
    const counts = {
      templates: references.length,
      brands: brands.length,
      characters: characters.length,
      posts: generatedPosts.length,
      carousels: generatedCarousels.length,
    };

    return (
      <div className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in zoom-in duration-700">
        <header className="mb-12 text-center relative">
          <div className="flex justify-center mb-6">
            <div className="p-1 rounded-[2rem] bg-gradient-to-b from-pink-500/20 to-transparent border border-pink-500/10 shadow-2xl">
              <img src={LOGO_SRC} className="w-20 h-20 object-contain animate-pulse-slow" alt="Creative Powerhouse" />
            </div>
          </div>
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-pink-500/5 border border-pink-500/10 mb-5 backdrop-blur-sm">
            <Sparkles size={11} className="text-pink-500" />
            <span className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.3em]">AI Content Powerhouse</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter">
            Creative <span className="text-pink-500">Powerhouse</span>
          </h1>
          <p className="max-w-xl mx-auto text-slate-500 dark:text-slate-400 text-base font-medium leading-relaxed">
            Inspiration in. Posts out. Three steps.
          </p>
          {(counts.templates + counts.brands + counts.characters + counts.posts) > 0 && (
            <div className="mt-6 inline-flex items-center gap-5 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <span>{counts.templates} templates</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{counts.brands} brands</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{counts.characters} characters</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{counts.posts} posts</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>{counts.carousels} carousels</span>
            </div>
          )}
        </header>

        <div className="flex flex-col lg:flex-row items-stretch gap-6 lg:gap-3">
          <div className="flex-1 min-w-0">
            <SpaceCard
              step="01"
              accent="violet"
              icon={<Lightbulb size={28} />}
              title="Inspire"
              blurb="Save what catches your eye. Turn screenshots into reusable templates, brands, and characters."
              actions={[
                { label: 'Save as template', sub: `${counts.templates} saved`, onClick: () => setActiveTool(AppTool.BUILDER) },
                { label: 'Save as brand', sub: `${counts.brands} saved`, onClick: () => setActiveTool(AppTool.BRAND_LAB) },
                { label: 'Manage brand assets', sub: `${brandAssets.length} assets`, onClick: () => setActiveTool(AppTool.BRAND_ASSETS) },
                { label: 'Save as character', sub: `${counts.characters} saved`, onClick: () => setActiveTool(AppTool.CHARACTER_LAB) },
              ]}
            />
          </div>

          <FlowArrow from="violet" to="pink" />

          <div className="flex-1 min-w-0">
            <SpaceCard
              step="02"
              accent="pink"
              icon={<Sparkles size={28} />}
              title="Create"
              blurb="Make posts that look like you. Programmable templates for repeatable output, generative when you need imagery."
              actions={[
                { label: 'Make a post — template', sub: 'Pixel-perfect, instant', onClick: () => setActiveTool(AppTool.STUDIO) },
                { label: 'Make a post — generative', sub: 'AI imagery', onClick: () => setActiveTool(AppTool.GENERATOR) },
                { label: 'Make a carousel', sub: 'Multi-slide stories', onClick: () => setActiveTool(AppTool.CAROUSEL_GENERATOR) },
                { label: 'Make from asset', sub: 'Brand-driven remix', onClick: () => setActiveTool(AppTool.BRAND_STUDIO) },
                { label: 'Pose a character', sub: 'Use saved characters', onClick: () => setActiveTool(AppTool.CHARACTER_STUDIO) },
                { label: 'Voice', sub: 'Synthesize or clone', onClick: () => setActiveTool(AppTool.AUDIO_LAB) },
              ]}
            />
          </div>

          <FlowArrow from="pink" to="cyan" />

          <div className="flex-1 min-w-0">
            <SpaceCard
              step="03"
              accent="cyan"
              icon={<CalendarDays size={28} />}
              title="Plan"
              blurb="See everything you made. Drop posts onto a feed and schedule them. Publishing comes next."
              actions={[
                { label: 'Queue', sub: `${contentPlans.reduce((n, p) => n + p.ideas.length, 0)} scheduled · ${contentPlans.length} plans`, onClick: () => setActiveTool(AppTool.PLAN_QUEUE) },
                { label: 'Library', sub: `${counts.posts} posts · ${counts.carousels} carousels`, onClick: () => setActiveTool(AppTool.LIBRARY) },
                { label: 'Instagram grid', sub: 'Draft your feed', onClick: () => setActiveTool(AppTool.FEED_PREVIEW) },
              ]}
            />
          </div>
        </div>
      </div>
    );
  };

  const menuGroups: { id: string; label: string; icon: React.ReactNode; color: string; items: { tool: AppTool; icon: React.ReactNode; label: string }[] }[] = [
    {
      id: 'inspire',
      label: 'Inspire',
      icon: <Lightbulb size={20} />,
      color: 'violet',
      items: [
        { tool: AppTool.BUILDER, icon: <LayoutTemplate size={16} />, label: 'Templates' },
        { tool: AppTool.BRAND_LAB, icon: <Palette size={16} />, label: 'Brands' },
        { tool: AppTool.BRAND_ASSETS, icon: <ImageIcon size={16} />, label: 'Brand assets' },
        { tool: AppTool.CHARACTER_LAB, icon: <Users size={16} />, label: 'Characters' },
      ],
    },
    {
      id: 'create',
      label: 'Create',
      icon: <Sparkles size={20} />,
      color: 'pink',
      items: [
        { tool: AppTool.STUDIO, icon: <LayoutTemplate size={16} />, label: 'Post — template' },
        { tool: AppTool.GENERATOR, icon: <Rocket size={16} />, label: 'Post — generative' },
        { tool: AppTool.CAROUSEL_GENERATOR, icon: <Layers size={16} />, label: 'Carousel' },
        { tool: AppTool.BRAND_STUDIO, icon: <Briefcase size={16} />, label: 'From asset' },
        { tool: AppTool.CHARACTER_STUDIO, icon: <Wand2 size={16} />, label: 'Pose character' },
        { tool: AppTool.AUDIO_LAB, icon: <Volume2 size={16} />, label: 'Voice' },
      ],
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: <CalendarDays size={20} />,
      color: 'cyan',
      items: [
        { tool: AppTool.PLAN_QUEUE, icon: <CalendarDays size={16} />, label: 'Queue' },
        { tool: AppTool.LIBRARY, icon: <LibraryIcon size={16} />, label: 'Library' },
        { tool: AppTool.FEED_PREVIEW, icon: <Grid3X3 size={16} />, label: 'Instagram grid' },
      ],
    },
  ];

  const findGroupForTool = (tool: AppTool): string | null => {
    for (const g of menuGroups) {
      if (g.items.some((i) => i.tool === tool)) return g.id;
    }
    return null;
  };
  const activeGroupId = findGroupForTool(activeTool);

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
          className={`h-screen border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617] backdrop-blur-xl z-[100] transition-all duration-300 flex flex-col items-center py-6 shrink-0 relative ${isSidebarOpen ? 'w-64' : 'w-20'}`}
        >
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-8 z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose size={12} /> : <PanelLeftOpen size={12} />}
          </button>
          <div onClick={() => setActiveTool(AppTool.LANDING)} className="mb-8 cursor-pointer group px-4 w-full flex items-center justify-center">
            <div className={`transition-all duration-500 flex items-center ${isSidebarOpen ? 'space-x-3 w-full' : 'justify-center'}`}>
              <img src={LOGO_SRC} className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
              {isSidebarOpen && <span className="font-black text-base tracking-tighter animate-in fade-in slide-in-from-left duration-300 text-slate-900 dark:text-white">Creative <span className="text-pink-500">Powerhouse</span></span>}
            </div>
          </div>

          <nav className="flex-1 w-full px-3 overflow-y-auto no-scrollbar">
            {menuGroups.map((group) => {
              const isActiveGroup = activeGroupId === group.id;
              return (
                <div key={group.id} className="mb-5">
                  {isSidebarOpen ? (
                    <div className={`px-2 mb-1.5 flex items-center gap-2`}>
                      <div className={`text-${group.color}-500`}>{group.icon}</div>
                      <span className={`text-[10px] font-black tracking-[0.25em] uppercase text-${group.color}-500`}>
                        {group.label}
                      </span>
                    </div>
                  ) : (
                    <div className={`mx-auto mb-1.5 w-10 h-10 rounded-2xl flex items-center justify-center ${isActiveGroup ? `bg-${group.color}-500/10 text-${group.color}-500` : 'text-slate-400 dark:text-slate-600'}`}>
                      {group.icon}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTool === item.tool;
                      if (!isSidebarOpen) return null;
                      return (
                        <button
                          key={item.tool}
                          onClick={() => setActiveTool(item.tool)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-xs font-semibold ${
                            isActive
                              ? `bg-${group.color}-500/10 text-${group.color}-600 dark:text-${group.color}-400`
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-auto px-4 w-full space-y-2">
            <button
              onClick={toggleTheme}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${isSidebarOpen ? 'space-x-4' : 'justify-center'}`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-yellow-400 group-hover:text-yellow-300" />
              ) : (
                <Moon size={20} className="text-slate-400 group-hover:text-slate-600" />
              )}
              {isSidebarOpen && (
                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-300">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsDocsOpen(true)}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${isSidebarOpen ? 'space-x-4' : 'justify-center'}`}
              title="Documentation"
            >
              <BookOpen size={20} className="text-slate-400 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-orange-400" />
              {isSidebarOpen && (
                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left duration-300">
                  Docs
                </span>
              )}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${isSidebarOpen ? 'space-x-4' : 'justify-center'}`}
              title="Settings"
            >
              <SettingsIcon size={20} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400" />
              {isSidebarOpen && (
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
            <div onClick={() => setActiveTool(AppTool.LANDING)} className="flex items-center space-x-3 cursor-pointer">
              <img src={LOGO_SRC} className="w-10 h-10 object-contain" />
              <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">Creative <span className="text-pink-500">Powerhouse</span></span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsDocsOpen(true)}
                className="p-3 rounded-2xl bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-all border border-slate-200 dark:border-slate-700/50"
                title="Documentation & Guides"
              >
                <BookOpen size={20} />
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
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-2xl bg-slate-100/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700/50"
                title="Settings"
              >
                <SettingsIcon size={20} />
              </button>
            </div>
          </nav>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderTool()}
        </div>
      </main>

      {/* Settings overlay sheet */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-end animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative h-full w-full max-w-2xl bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-5 right-5 z-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="Close"
            >
              <X size={18} />
            </button>
            <Settings
              currentKey={localStorage.getItem('IKHSAN_LAB_KEY') || manualKey || ''}
              onUpdateKey={(key) => {
                localStorage.setItem('IKHSAN_LAB_KEY', key);
                setManualKey(key);
                setHasKey(true);
              }}
              onBack={() => setIsSettingsOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Documentation overlay sheet */}
      {isDocsOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-end animate-in fade-in duration-200" onClick={() => setIsDocsOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative h-full w-full max-w-4xl bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsDocsOpen(false)}
              className="absolute top-5 right-5 z-10 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="Close"
            >
              <X size={18} />
            </button>
            <Documentation onBack={() => setIsDocsOpen(false)} />
          </div>
        </div>
      )}

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
    violet: { light: 'hover:shadow-violet-500/20', dark: 'dark:hover:border-violet-500/50', icon: 'text-violet-500', border: 'border-violet-500/10' },
  };
  return map[accent] || map.blue;
};

interface SpaceAction {
  label: string;
  sub: string;
  onClick: () => void;
}

const SpaceCard: React.FC<{
  step?: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
  blurb: string;
  actions: SpaceAction[];
}> = ({ step, accent, icon, title, blurb, actions }) => {
  const styles = getAccentClasses(accent);
  return (
    <div className={`
      relative overflow-hidden group p-7 rounded-[2rem] transition-all duration-500 flex flex-col h-full
      border
      bg-white/70 backdrop-blur-2xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
      hover:shadow-2xl ${styles.light}
      dark:bg-slate-900/40 dark:border-slate-800 dark:shadow-none
      ${styles.dark} dark:hover:bg-slate-900/60
    `}>
      <div className={`absolute -right-24 -top-24 w-64 h-64 bg-gradient-to-br from-${accent}-500/15 to-transparent blur-[80px] opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

      <div className="flex items-center justify-between mb-4 relative">
        <div className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 ${styles.icon}`}>
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {step && <span className={`text-[10px] font-mono ${styles.icon} opacity-60`}>{step}</span>}
          <span className={`text-[10px] font-black tracking-[0.3em] uppercase ${styles.icon}`}>{title}</span>
        </div>
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-5 min-h-[60px]">{blurb}</p>

      <div className="space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all group/btn flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{action.label}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-500">{action.sub}</div>
            </div>
            <ChevronRight size={16} className={`${styles.icon} opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all`} />
          </button>
        ))}
      </div>
    </div>
  );
};

const FlowArrow: React.FC<{ from: string; to: string }> = ({ from, to }) => {
  return (
    <div className="flex lg:flex-col items-center justify-center px-1 lg:px-0 lg:py-0 self-stretch" aria-hidden="true">
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <ChevronRight size={18} className={`text-${to}-500 lg:rotate-0 rotate-90 hidden lg:block`} />
        <ChevronRight size={18} className={`text-${to}-500 rotate-90 lg:hidden`} />
      </div>
    </div>
  );
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
