
import React, { useState, useEffect } from 'react';
import { Wrench, Star, Rocket, Terminal, Github, Moon, Zap, Palette, ChevronRight, Key, Globe, Settings as SettingsIcon, Users, Wand2, Leaf, Layers } from 'lucide-react';
import { AppTool, DesignReference, BrandReference, GeneratedPost, CharacterReference, GeneratedCharacterPose } from './types';
import Builder from './components/Builder';
import Library from './components/Library';
import Generator from './components/Generator';
import BrandLab from './components/BrandLab';
import CharacterLab from './components/CharacterLab';
import CharacterStudio from './components/CharacterStudio';
import CarouselGenerator from './components/CarouselGenerator';
import Settings from './components/Settings';
import AssistantHub from './components/AssistantHub';

// Branding Assets
const LOGO_SRC = "./logo.png";

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<AppTool>(AppTool.LANDING);
  const [references, setReferences] = useState<DesignReference[]>([]);
  const [brands, setBrands] = useState<BrandReference[]>([]);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [characters, setCharacters] = useState<CharacterReference[]>([]);
  const [characterPoses, setCharacterPoses] = useState<GeneratedCharacterPose[]>([]);
  const [generatedCarousels, setGeneratedCarousels] = useState<any[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [manualKey, setManualKey] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
        setIsStandalone(false);
      } else {
        setIsStandalone(true);
        const envKey = import.meta.env.VITE_GEMINI_API_KEY;
        const savedKey = sessionStorage.getItem('IKHSAN_LAB_KEY');
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

          localStorage.removeItem('ikhsan_design_refs');
          localStorage.removeItem('ikhsan_brand_refs');
          localStorage.removeItem('ikhsan_generated_posts');
          console.log("Migration complete.");
        } else {
          setReferences(remoteRefs);
          setBrands(remoteBrands);
          setGeneratedPosts(remotePosts);
          setGeneratedCarousels(remoteCarousels);
        }

        setCharacters(remoteChars);
        setCharacterPoses(remoteCharPoses);
      } catch (err) {
        console.error("Critical failure in loadData:", err);
      }
    };
    loadData();
  }, []);

  const handleOpenKey = async () => {
    if (isStandalone) {
      if (manualKey.trim().length > 20) {
        sessionStorage.setItem('IKHSAN_LAB_KEY', manualKey.trim());
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
              <p className="text-[10px] text-slate-500 italic">Key is stored in sessionStorage and never sent to our servers.</p>
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
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.GENERATOR:
        return (
          <Generator
            references={references}
            brands={brands}
            characters={characters}
            onSavePost={saveGeneratedPost}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.CAROUSEL_GENERATOR:
        return (
          <CarouselGenerator
            references={references}
            brands={brands}
            characters={characters}
            onSave={saveGeneratedCarousel}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
      case AppTool.BRAND_LAB:
        return <BrandLab onSave={saveBrand} onBack={() => setActiveTool(AppTool.LANDING)} />;
      case AppTool.CHARACTER_LAB:
        return <CharacterLab onSave={saveCharacter} onBack={() => setActiveTool(AppTool.LANDING)} brands={brands} characters={characters} />;
      case AppTool.CHARACTER_STUDIO:
        return <CharacterStudio characters={characters} onSave={saveCharacterPose} onBack={() => setActiveTool(AppTool.LANDING)} />;
      case AppTool.SETTINGS:
        return (
          <Settings
            currentKey={sessionStorage.getItem('IKHSAN_LAB_KEY') || manualKey || ''}
            onUpdateKey={(key) => {
              sessionStorage.setItem('IKHSAN_LAB_KEY', key);
              setManualKey(key);
              setHasKey(true);
            }}
            onBack={() => setActiveTool(AppTool.LANDING)}
          />
        );
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
              <p className="max-w-2xl mx-auto text-slate-500 text-lg font-medium leading-relaxed">
                The ultimate creative command center for cannabis branding. <span className="text-slate-200">Extract DNA, generate content, and maintain perfect consistency.</span>
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <ToolCard icon={<Wrench className="text-blue-400" />} title="Design Builder" desc="Extract Structural DNA." onClick={() => setActiveTool(AppTool.BUILDER)} accent="blue" />
              <ToolCard icon={<Palette className="text-pink-400" />} title="Brand Identity" desc="Save Color DNA." onClick={() => setActiveTool(AppTool.BRAND_LAB)} accent="pink" />
              <ToolCard icon={<Users className="text-green-400" />} title="Character Lab" desc="Extract Character DNA." onClick={() => setActiveTool(AppTool.CHARACTER_LAB)} accent="green" />
              <ToolCard icon={<Star className="text-cyan-400" />} title="My Files" desc="Manage Results." onClick={() => setActiveTool(AppTool.LIBRARY)} accent="cyan" />
              <ToolCard icon={<Rocket className="text-indigo-400" />} title="Post Generator" desc="Deploy & Remix." onClick={() => setActiveTool(AppTool.GENERATOR)} accent="indigo" />
              <ToolCard icon={<Layers className="text-blue-400" />} title="Carousel Generator" desc="Multiple Slides." onClick={() => setActiveTool(AppTool.CAROUSEL_GENERATOR)} accent="blue" />
              <ToolCard icon={<Wand2 className="text-purple-400" />} title="Character Studio" desc="Generate Poses." onClick={() => setActiveTool(AppTool.CHARACTER_STUDIO)} accent="purple" />
            </div>
          </div>
        );
    }
  };

  const menuItems = [
    { tool: AppTool.BUILDER, icon: <Wrench size={20} />, label: "Builder", color: "blue" },
    { tool: AppTool.BRAND_LAB, icon: <Palette size={20} />, label: "Brand Lab", color: "pink" },
    { tool: AppTool.CHARACTER_LAB, icon: <Users size={20} />, label: "Char Lab", color: "green" },
    { tool: AppTool.LIBRARY, icon: <Star size={20} />, label: "My Files", color: "cyan" },
    { tool: AppTool.GENERATOR, icon: <Rocket size={20} />, label: "Generator", color: "indigo" },
    { tool: AppTool.CAROUSEL_GENERATOR, icon: <Layers size={20} />, label: "Carousels", color: "blue" },
    { tool: AppTool.CHARACTER_STUDIO, icon: <Wand2 size={20} />, label: "Studio", color: "purple" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex overflow-hidden">
      {/* Sidebar Navigation (Conditional) */}
      {activeTool !== AppTool.LANDING && (
        <aside
          className={`h-screen border-r border-slate-800 bg-[#020617] z-[100] transition-all duration-500 flex flex-col items-center py-6 shrink-0 ${isSidebarHovered ? 'w-64' : 'w-20'}`}
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
                  ? `bg-slate-800 text-white shadow-xl border border-slate-700`
                  : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-200'
                  } ${isSidebarHovered ? 'space-x-4' : 'justify-center'}`}
              >
                <div className={`transition-transform duration-300 ${activeTool === item.tool ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: activeTool === item.tool ? `text-${item.color}-400` : 'text-slate-600 group-hover:text-slate-400'
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

          <div className="mt-auto px-4 w-full">
            <button
              onClick={() => setActiveTool(AppTool.SETTINGS)}
              className={`w-full group flex items-center transition-all duration-300 rounded-2xl p-4 text-slate-500 hover:bg-slate-900/50 hover:text-slate-200 ${isSidebarHovered ? 'space-x-4' : 'justify-center'}`}
              title="Settings"
            >
              <SettingsIcon size={20} className="text-slate-600 group-hover:text-slate-400" />
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
          <nav className="border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 px-8 h-20 flex items-center justify-between shrink-0">
            <div onClick={() => setActiveTool(AppTool.LANDING)} className="flex items-center space-x-4 cursor-pointer">
              <img src={LOGO_SRC} className="w-10 h-10 object-contain" />
              <span className="font-black text-2xl tracking-tighter italic">WEED <span className="text-green-500">LABS</span></span>
            </div>

            <button
              onClick={() => setActiveTool(AppTool.SETTINGS)}
              className="p-3 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700/50 flex items-center space-x-3"
            >
              <SettingsIcon size={20} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Settings</span>
            </button>
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

const ToolCard = ({ icon, title, desc, onClick, accent }: any) => (
  <div onClick={onClick} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-slate-700 transition-all group">
    <div className="mb-4 p-3 rounded-xl bg-slate-800/50 w-fit group-hover:scale-110 transition-transform">{icon}</div>
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    <p className="text-slate-400 text-sm mb-4">{desc}</p>
    <div className="flex items-center text-xs font-bold text-blue-500">ENTER CHAMBER <ChevronRight size={14} /></div>
  </div>
);

export default App;
