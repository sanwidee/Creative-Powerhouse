
import React, { useState, useRef, useEffect } from 'react';
import { Users, Upload, Loader2, Sparkles, Save, ArrowLeft, XCircle, CheckCircle2, AlertCircle, Palette as PaletteIcon, Eye, History } from 'lucide-react';
import { analyzeCharacter, generateCharacterTurnaround, getTurnaroundPromptData, evolveCharacterWithBrand } from '../services/geminiService';
import { CharacterReference, CharacterDNA, BrandReference, PromptData } from '../types';
import PromptPreviewModal from './PromptPreviewModal';

interface CharacterLabProps {
    onSave: (ref: CharacterReference) => void;
    onBack: () => void;
    brands?: BrandReference[];
    characters?: CharacterReference[];
}

const CharacterLab: React.FC<CharacterLabProps> = ({ onSave, onBack, brands = [], characters = [] }) => {
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [dna, setDna] = useState<CharacterDNA | null>(null);
    const [turnaroundImage, setTurnaroundImage] = useState<string>('');
    const [characterName, setCharacterName] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<CharacterDNA['assigned_art_style']>('original');
    const [promptPreview, setPromptPreview] = useState<PromptData | null>(null);
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'generating' | 'evolving' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Evolve Mode State
    const [evolveMode, setEvolveMode] = useState(false);
    const [evolveBrandId, setEvolveBrandId] = useState<string>('');

    // Load character DNA if selected
    useEffect(() => {
        if (selectedCharacterId) {
            const char = characters.find(c => c.id === selectedCharacterId);
            if (char) {
                setDna(char.dna);
                setCharacterName(`${char.name} (Remix)`);
                setUploadedImages(char.sourceImages || []);
                setTurnaroundImage(char.dna.reference_images?.[0] || '');
                // Don't auto-set status to success, users still need to click "Remix"
            }
        } else {
            setDna(null);
            setCharacterName('');
            setUploadedImages([]);
            setTurnaroundImage('');
            setStatus('idle');
        }
    }, [selectedCharacterId, characters]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const readers: Promise<string>[] = [];
        for (let i = 0; i < Math.min(files.length, 10); i++) {
            const file = files[i];
            readers.push(new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            }));
        }

        Promise.all(readers).then(results => {
            setUploadedImages(prev => [...prev, ...results].slice(0, 10));
            setSelectedCharacterId(''); // Reset selection if new files are uploaded
        });
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleAnalyze = async (forcedStyle?: CharacterDNA['assigned_art_style']) => {
        const targetStyle = forcedStyle || selectedStyle;

        if (!selectedCharacterId && uploadedImages.length < 1) {
            alert('Please upload reference images or select an existing character.');
            return;
        }

        setIsAnalyzing(true);
        setStatus(selectedCharacterId ? 'generating' : 'analyzing');

        try {
            // Step 1: Extract DNA (only if not already extracted from upload)
            let baseDna = dna;
            if (!baseDna || !selectedCharacterId) {
                if (uploadedImages.length > 0) {
                    const result = await analyzeCharacter(uploadedImages);
                    baseDna = result.dna;
                    setDna(baseDna);
                    setCharacterName(baseDna.character_name);
                } else {
                    throw new Error("No data available to process.");
                }
            }

            // Step 2: Generate turnaround sheet with selected style
            setStatus('generating');
            const dnaWithStyle = {
                ...baseDna,
                assigned_art_style: targetStyle,
                identity_lock: true
            };

            let turnaroundImage: string;
            let finalDna: CharacterDNA;

            // Check if brand is selected - use evolve with brand instead
            const selectedBrand = evolveBrandId ? brands.find(b => b.id === evolveBrandId) : null;
            if (selectedBrand) {
                setStatus('evolving');
                const result = await evolveCharacterWithBrand(dnaWithStyle, selectedBrand.dna, '16:9');
                turnaroundImage = result.image;
                finalDna = {
                    ...result.evolvedDNA,
                    reference_images: [result.image, ...uploadedImages]
                };
                setCharacterName(`${baseDna.character_name} (${selectedBrand.name} Edition)`);
            } else {
                const turnaround = await generateCharacterTurnaround(dnaWithStyle, '16:9');
                turnaroundImage = turnaround.image;
                finalDna = {
                    ...dnaWithStyle,
                    reference_images: [turnaround.image, ...uploadedImages]
                };
            }

            setTurnaroundImage(turnaroundImage);
            setDna(finalDna);
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Character analysis failed.');
            setStatus('error');
        } finally {
            setIsAnalyzing(false);
        }
    };


    const handlePreviewTurnaroundPrompt = () => {
        if (!dna) return;
        const dnaWithStyle = {
            ...dna,
            assigned_art_style: selectedStyle,
            identity_lock: true
        };
        const data = getTurnaroundPromptData(dnaWithStyle, '16:9');
        setPromptPreview(data);
    };

    const handleSave = () => {
        if (!dna || !characterName.trim()) {
            alert('Please analyze character and provide a name before saving.');
            return;
        }

        const ref: CharacterReference = {
            id: Date.now().toString(),
            name: characterName,
            sourceImages: uploadedImages,
            dna: {
                ...dna,
                character_name: characterName,
                assigned_art_style: selectedStyle,
                identity_lock: true
            },
            createdAt: Date.now()
        };

        onSave(ref);
        onBack();
    };

    const updateDnaField = (field: keyof CharacterDNA, value: any) => {
        if (!dna) return;
        setDna({ ...dna, [field]: value });
    };

    const handleEvolveWithBrand = async () => {
        if (!dna || !evolveBrandId) {
            alert('Please select a character and a brand to evolve with.');
            return;
        }

        const selectedBrand = brands.find(b => b.id === evolveBrandId);
        if (!selectedBrand) return;

        setIsAnalyzing(true);
        setStatus('evolving');

        try {
            const result = await evolveCharacterWithBrand(dna, selectedBrand.dna, '16:9');
            setDna(result.evolvedDNA);
            setTurnaroundImage(result.image);
            setCharacterName(`${dna.character_name} (${selectedBrand.name} Edition)`);
            setStatus('success');
            setEvolveMode(false);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Brand evolution failed.');
            setStatus('error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const artStyles: { id: CharacterDNA['assigned_art_style'], label: string, icon: string }[] = [
        { id: 'original', label: 'Original Style', icon: '🖼️' },
        { id: 'plushy', label: 'Plushy Toy', icon: '🧸' },
        { id: 'chibi', label: 'Chibi / SD', icon: '👶' },
        { id: 'claymorphism', label: 'Claymorphism 3D', icon: '🎨' },
        { id: 'animated', label: '3D Animated', icon: '🎬' },
        { id: 'pixel_art', label: 'Pixel Art', icon: '👾' },
        { id: 'futuristic_robot', label: 'Futuristic Robot', icon: '🤖' },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 p-6 transition-colors duration-500">
            <div className="max-w-5xl mx-auto">
                <button onClick={onBack} className="mb-6 flex items-center space-x-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-semibold">Back to Lab</span>
                </button>

                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                            <Users size={28} className="text-green-500 dark:text-green-400" />
                        </div>
                        <h1 className="text-4xl font-bold italic tracking-tighter text-slate-900 dark:text-white">Character Lab <span className="text-green-500 text-lg not-italic align-top ml-2">V2</span></h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Identity Lock & Style Remixing enabled</p>
                </div>

                {/* Style Selector & Upload Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* 1. Base Selection */}
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 shadow-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-slate-900 dark:text-white">
                                <History size={20} className="text-green-500 dark:text-green-400" />
                                <span>1. Select Base Character</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 uppercase tracking-wider font-bold">Choose an existing DNA or upload new references</p>

                            <div className="space-y-4">
                                <select
                                    value={selectedCharacterId}
                                    onChange={(e) => setSelectedCharacterId(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500/50 text-sm font-semibold mb-4 text-slate-900 dark:text-white"
                                >
                                    <option value="">-- Start New Extraction --</option>
                                    {characters.map(char => (
                                        <option key={char.id} value={char.id}>{char.name}</option>
                                    ))}
                                </select>

                                {!selectedCharacterId && (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />

                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadedImages.length >= 10}
                                            className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-green-500/50 hover:bg-green-500/5 text-slate-400 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 rounded-xl font-bold transition-all flex flex-col items-center justify-center space-y-2 bg-slate-50 dark:bg-transparent"
                                        >
                                            <Upload size={24} />
                                            <span>{uploadedImages.length >= 10 ? 'Maximum 10 images' : `Select Images (${uploadedImages.length}/10)`}</span>
                                        </button>

                                        {/* Image Grid */}
                                        {uploadedImages.length > 0 && (
                                            <div className="mt-6 grid grid-cols-3 md:grid-cols-5 gap-3">
                                                {uploadedImages.map((img, idx) => (
                                                    <div key={idx} className="relative group aspect-square">
                                                        <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover rounded-lg border border-slate-700" />
                                                        <button
                                                            onClick={() => removeImage(idx)}
                                                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-lg"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {selectedCharacterId && (
                                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center space-x-4">
                                        <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                                            <img src={uploadedImages[0]} alt="Base" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-green-600 dark:text-green-400">DNA Loaded</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{uploadedImages.length} references connected</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedCharacterId('')}
                                            className="ml-auto text-slate-500 hover:text-white"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Art Style Selection */}
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 shadow-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-slate-900 dark:text-white">
                                <Sparkles size={20} className="text-green-500 dark:text-green-400" />
                                <span>2. Target Art Style</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 uppercase tracking-wider font-bold">Identity will be locked to original</p>

                            <div className="grid grid-cols-1 gap-2">
                                {artStyles.map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => {
                                            setSelectedStyle(style.id);
                                            // If already has DNA and we are in remix mode, maybe we don't auto-analyze unless requested
                                            // To keep UI responsive
                                        }}
                                        className={`flex items-center space-x-3 p-3 rounded-xl border transition-all text-left ${selectedStyle === style.id
                                            ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-white'
                                            : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
                                            }`}
                                    >
                                        <span className="text-2xl">{style.icon}</span>
                                        <span className="font-semibold">{style.label}</span>
                                        {selectedStyle === style.id && <CheckCircle2 size={16} className="ml-auto text-green-400" />}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start space-x-2">
                                <AlertCircle size={16} className="text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-blue-300 leading-relaxed font-semibold uppercase tracking-tighter">Identity Lock is ACTIVE. Features will remain consistent during style transformation.</p>
                            </div>
                        </div>

                        {/* BRAND DNA SELECTION - Show when existing character selected */}
                        {selectedCharacterId && brands.length > 0 && (
                            <div className="p-6 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-indigo-500/5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h2 className="text-xl font-bold mb-4 flex items-center space-x-2 text-slate-900 dark:text-white">
                                    <PaletteIcon size={20} className="text-pink-500" />
                                    <span>3. Brand Colors <span className="text-xs font-normal text-slate-500">(Optional)</span></span>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 uppercase tracking-wider font-bold">Apply brand palette to character</p>

                                <select
                                    value={evolveBrandId}
                                    onChange={(e) => setEvolveBrandId(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-pink-500/30 rounded-xl outline-none focus:ring-2 focus:ring-pink-500/50 text-sm text-slate-900 dark:text-white mb-4"
                                >
                                    <option value="">No brand (use original colors)</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                                </select>

                                {evolveBrandId && (
                                    <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 animate-in fade-in">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex space-x-1">
                                                {brands.find(b => b.id === evolveBrandId)?.dna.primary_colors.slice(0, 5).map((color, idx) => (
                                                    <div key={idx} className="w-6 h-6 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: color }} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-pink-600 dark:text-pink-400 font-bold">
                                                {brands.find(b => b.id === evolveBrandId)?.dna.brand_vibe}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* Analyze Button */}
                {(uploadedImages.length >= 1 || selectedCharacterId) && status !== 'success' && (
                    <button
                        onClick={() => handleAnalyze()}
                        disabled={isAnalyzing}
                        className={`w-full py-6 ${evolveBrandId ? 'bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500' : 'bg-green-600 hover:bg-green-500'} disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl font-black text-xl transition-all shadow-xl shadow-green-500/10 flex items-center justify-center space-x-3 mb-8`}
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                <span>
                                    {status === 'analyzing' && 'EXTRACTING DNA SIGNATURE...'}
                                    {status === 'generating' && 'GENERATING IDENTITY LOCK TURNAROUND...'}
                                    {status === 'evolving' && 'APPLYING BRAND COLORS...'}
                                    {status !== 'analyzing' && status !== 'generating' && status !== 'evolving' && 'PROCESSING...'}
                                </span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={24} />
                                <span>
                                    {selectedCharacterId
                                        ? (evolveBrandId
                                            ? `EVOLVE WITH ${brands.find(b => b.id === evolveBrandId)?.name?.toUpperCase() || 'BRAND'} COLORS`
                                            : 'EVOLVE DNA & APPLY NEW STYLE')
                                        : 'EXTRACT DNA & GENERATE TURNAROUND'
                                    }
                                </span>
                            </>
                        )}
                    </button>

                )}

                {/* DNA Results */}
                {dna && status === 'success' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-8 rounded-3xl border border-green-500/20 bg-green-500/5 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle2 size={28} className="text-green-500 dark:text-green-400" />
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">DNA Sequence Loaded</h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center">
                                            <span className="bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-[10px] mr-2">IDENTITY LOCKED</span>
                                            Active Style: <span className="text-slate-900 dark:text-white ml-2">{artStyles.find(s => s.id === selectedStyle)?.label}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handlePreviewTurnaroundPrompt}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center space-x-2 text-nowrap"
                                    >
                                        <Eye size={14} />
                                        <span>View Prompt</span>
                                    </button>
                                    <button
                                        onClick={() => handleAnalyze()}
                                        disabled={isAnalyzing}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center space-x-2 text-nowrap"
                                    >
                                        <Sparkles size={14} />
                                        <span>Regenerate Turnaround</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Side: Turnaround */}
                                <div className="space-y-4">
                                    {turnaroundImage && (
                                        <div className="p-2 rounded-2xl bg-white/5 border border-white/10">
                                            <img src={turnaroundImage} alt="Character Turnaround" className="w-full rounded-xl shadow-2xl" />
                                            <div className="p-4">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Visual Anchor Point</h3>
                                                <p className="text-xs text-slate-500 italic">This 2x4 turnaround sheet serves as the master reference for all future poses.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* EVOLVE WITH BRAND DNA */}
                                    {brands.length > 0 && (
                                        <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-500/5 to-indigo-500/5 border border-pink-500/20">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center space-x-2">
                                                    <PaletteIcon size={16} className="text-pink-500" />
                                                    <span className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest">Evolve with Brand DNA</span>
                                                </div>
                                                <button
                                                    onClick={() => setEvolveMode(!evolveMode)}
                                                    className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${evolveMode ? 'bg-pink-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                                                >
                                                    {evolveMode ? 'ACTIVE' : 'ENABLE'}
                                                </button>
                                            </div>

                                            {evolveMode ? (
                                                <div className="space-y-4 animate-in fade-in">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Transform this character's colors and style to match a brand's visual identity while preserving their structural features.
                                                    </p>
                                                    <select
                                                        value={evolveBrandId}
                                                        onChange={(e) => setEvolveBrandId(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-pink-500/30 rounded-xl outline-none focus:ring-2 focus:ring-pink-500/50 text-sm text-slate-900 dark:text-white"
                                                    >
                                                        <option value="">Select a Brand...</option>
                                                        {brands.map(brand => (
                                                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                                                        ))}
                                                    </select>

                                                    {evolveBrandId && (
                                                        <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="flex space-x-1">
                                                                    {brands.find(b => b.id === evolveBrandId)?.dna.primary_colors.slice(0, 4).map((color, idx) => (
                                                                        <div key={idx} className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs text-pink-600 dark:text-pink-400 font-bold">
                                                                    {brands.find(b => b.id === evolveBrandId)?.dna.brand_vibe}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={handleEvolveWithBrand}
                                                        disabled={!evolveBrandId || isAnalyzing}
                                                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-pink-500/20"
                                                    >
                                                        {status === 'evolving' ? (
                                                            <>
                                                                <Loader2 size={18} className="animate-spin" />
                                                                <span>EVOLVING CHARACTER...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles size={18} />
                                                                <span>EVOLVE WITH BRAND</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-500">
                                                    Enable to create a brand-aligned version of this character with the brand's colors and aesthetic.
                                                </p>
                                            )}

                                            {/* Simple Association (Legacy) */}
                                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Link (Metadata Only)</label>
                                                <select
                                                    value={dna.linked_brand_id || ''}
                                                    onChange={(e) => updateDnaField('linked_brand_id', e.target.value || undefined)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-xs text-slate-900 dark:text-white"
                                                >
                                                    <option value="">No brand link</option>
                                                    {brands.map(brand => (
                                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Side: DNA Details */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Signature Identity Name</label>
                                            <input
                                                type="text"
                                                value={characterName}
                                                onChange={(e) => setCharacterName(e.target.value)}
                                                className="w-full px-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500/50 text-lg font-bold text-slate-900 dark:text-white"
                                                placeholder="Enter character name..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Body & Anatomy Specs</label>
                                            <textarea
                                                value={dna.physical_features}
                                                onChange={(e) => updateDnaField('physical_features', e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500/50 min-h-[100px] text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Visual & Facial Details</label>
                                            <textarea
                                                value={dna.visual_details}
                                                onChange={(e) => updateDnaField('visual_details', e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500/50 min-h-[100px] text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                                                <span>Color Palette Syntax</span>
                                                <button
                                                    onClick={() => updateDnaField('color_palette', [...dna.color_palette, '#000000'])}
                                                    className="text-green-600 dark:text-green-400 hover:text-green-500 normal-case tracking-normal"
                                                >
                                                    + Add Color
                                                </button>
                                            </label>
                                            <div className="flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                                                {dna.color_palette.map((color, idx) => (
                                                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                                        <div className="w-5 h-5 rounded border border-white/10 shrink-0" style={{ backgroundColor: color }} />
                                                        <input
                                                            type="text"
                                                            value={color}
                                                            onChange={(e) => {
                                                                const newPalette = [...dna.color_palette];
                                                                newPalette[idx] = e.target.value;
                                                                updateDnaField('color_palette', newPalette);
                                                            }}
                                                            className="w-16 bg-transparent outline-none text-[10px] font-mono"
                                                        />
                                                        <button
                                                            onClick={() => updateDnaField('color_palette', dna.color_palette.filter((_, i) => i !== idx))}
                                                            className="text-slate-500 hover:text-red-400"
                                                        >
                                                            <XCircle size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-4 flex space-x-4">
                                        <button
                                            onClick={handleSave}
                                            className="flex-1 py-5 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-green-500/10 flex items-center justify-center space-x-2"
                                        >
                                            <Save size={24} />
                                            <span>COMMIT TO VAULT</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {promptPreview && (
                    <PromptPreviewModal
                        data={promptPreview}
                        onClose={() => setPromptPreview(null)}
                        title="Character Turnaround Prompt"
                    />
                )}
            </div>
        </div>
    );
};

export default CharacterLab;
