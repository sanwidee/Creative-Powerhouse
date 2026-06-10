
import React, { useState, useRef } from 'react';
import { Wand2, Upload, Loader2, Sparkles, Save, ArrowLeft, Image as ImageIcon, Type as TypeIcon, Eye } from 'lucide-react';
import { generateCharacterPose, getPosePromptData } from '../services/geminiService';
import { CharacterReference, GeneratedCharacterPose, AspectRatio, PromptData } from '../types';
import PromptPreviewModal from './PromptPreviewModal';

interface CharacterStudioProps {
    characters: CharacterReference[];
    onSave: (pose: GeneratedCharacterPose) => void;
    onBack: () => void;
}

const CharacterStudio: React.FC<CharacterStudioProps> = ({ characters, onSave, onBack }) => {
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [inputMode, setInputMode] = useState<'image' | 'text'>('text');
    const [poseReference, setPoseReference] = useState<string>('');
    const [posePrompt, setPosePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string>('');
    const [poseName, setPoseName] = useState('');
    const [promptPreview, setPromptPreview] = useState<PromptData | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setPoseReference(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!selectedCharacter) {
            alert('Please select a character first.');
            return;
        }

        if (inputMode === 'image' && !poseReference) {
            alert('Please upload a pose reference image.');
            return;
        }

        if (inputMode === 'text' && !posePrompt.trim()) {
            alert('Please enter a pose description.');
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateCharacterPose(
                selectedCharacter.dna,
                inputMode === 'image' ? poseReference : undefined,
                inputMode === 'text' ? posePrompt : undefined,
                aspectRatio
            );
            setGeneratedImage(result.image);
            setPoseName(`${selectedCharacter.name} - ${inputMode === 'text' ? posePrompt.slice(0, 30) : 'Custom Pose'}`);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Pose generation failed.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePreviewPrompt = () => {
        if (!selectedCharacter) return;
        const data = getPosePromptData(
            selectedCharacter.dna,
            inputMode === 'image' ? poseReference : undefined,
            inputMode === 'text' ? posePrompt : undefined,
            aspectRatio
        );
        setPromptPreview(data);
    };

    const handleSave = () => {
        if (!generatedImage || !selectedCharacterId) {
            alert('Please generate a pose first.');
            return;
        }

        const pose: GeneratedCharacterPose = {
            id: Date.now().toString(),
            name: poseName,
            characterId: selectedCharacterId,
            poseReference: inputMode === 'image' ? poseReference : undefined,
            posePrompt: inputMode === 'text' ? posePrompt : undefined,
            generatedImage,
            createdAt: Date.now()
        };

        onSave(pose);
        onBack();
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 p-6 transition-colors duration-500">
            <div className="max-w-5xl mx-auto">
                <button onClick={onBack} className="mb-6 flex items-center space-x-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-semibold">Back to Lab</span>
                </button>

                <div className="mb-8">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <Wand2 size={28} className="text-purple-400" />
                        </div>
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Pose a character</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Generate poses for a saved character.</p>
                </div>

                {/* Character Selection */}
                <div className="mb-8 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Select Character DNA</h2>
                    {characters.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-sm">No characters available. Create one in Character Lab first.</p>
                    ) : (
                        <select
                            value={selectedCharacterId}
                            onChange={(e) => setSelectedCharacterId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-900 dark:text-white"
                        >
                            <option value="">-- Select a character --</option>
                            {characters.map(char => (
                                <option key={char.id} value={char.id}>{char.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Character Preview */}
                    {selectedCharacter && (
                        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold mb-2 text-slate-900 dark:text-white">{selectedCharacter.name}</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 mb-1">Physical Features:</p>
                                    <p className="text-xs text-slate-700 dark:text-slate-300">{selectedCharacter.dna.physical_features.slice(0, 100)}...</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 dark:text-slate-400 mb-1">Style:</p>
                                    <div className="flex items-center space-x-2">
                                        <p className="text-xs text-slate-700 dark:text-slate-300">{selectedCharacter.dna.style_notes}</p>
                                        {selectedCharacter.dna.assigned_art_style && selectedCharacter.dna.assigned_art_style !== 'original' && (
                                            <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                {selectedCharacter.dna.assigned_art_style.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedCharacter.dna.reference_images.length > 0 && (
                                <div className="mt-4 flex gap-2 overflow-x-auto">
                                    {selectedCharacter.dna.reference_images.slice(0, 3).map((img, idx) => (
                                        <img key={idx} src={img} alt={`Ref ${idx}`} className="h-24 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Pose Input */}
                {selectedCharacter && (
                    <>
                        <div className="mb-8 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
                            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Define Pose</h2>

                            {/* Input Mode Toggle */}
                            <div className="flex space-x-4 mb-6">
                                <button
                                    onClick={() => setInputMode('text')}
                                    className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 ${inputMode === 'text' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <TypeIcon size={18} />
                                    <span>Text Prompt</span>
                                </button>
                                <button
                                    onClick={() => setInputMode('image')}
                                    className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 ${inputMode === 'image' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <ImageIcon size={18} />
                                    <span>Reference Image</span>
                                </button>
                            </div>

                            {/* Text Prompt Input */}
                            {inputMode === 'text' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Pose Description</label>
                                    <textarea
                                        value={posePrompt}
                                        onChange={(e) => setPosePrompt(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px] text-slate-900 dark:text-white"
                                        placeholder="e.g., jumping with arms raised, sitting cross-legged, running forward..."
                                    />
                                </div>
                            )}

                            {/* Image Reference Input */}
                            {inputMode === 'image' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Upload Pose Reference</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
                                    >
                                        <Upload size={20} />
                                        <span>{poseReference ? 'Change Reference Image' : 'Upload Reference Image'}</span>
                                    </button>
                                    {poseReference && (
                                        <div className="mt-4">
                                            <img src={poseReference} alt="Pose reference" className="w-full max-h-64 object-contain rounded-lg border border-slate-700" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Aspect Ratio */}
                            <div className="mt-6">
                                <label className="block text-sm font-semibold mb-2">Aspect Ratio</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {(['1:1', '9:16', '16:9', '4:3', '3:4'] as AspectRatio[]).map(ratio => (
                                        <button
                                            key={ratio}
                                            onClick={() => setAspectRatio(ratio)}
                                            className={`py-2 rounded-lg font-semibold transition-all ${aspectRatio === ratio ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <button
                                onClick={handlePreviewPrompt}
                                disabled={isGenerating || (inputMode === 'image' ? !poseReference : !posePrompt.trim())}
                                className="py-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                            >
                                <Eye size={20} />
                                <span>View Prompt</span>
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={20} />
                                        <span>Generate Pose</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}

                {/* Generated Result */}
                {generatedImage && (
                    <div className="p-6 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                        <h2 className="text-xl font-bold mb-4 text-purple-600 dark:text-purple-400">Generated Pose</h2>
                        <div className="mb-4">
                            <img src={generatedImage} alt="Generated pose" className="w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-2">Pose Name</label>
                            <input
                                type="text"
                                value={poseName}
                                onChange={(e) => setPoseName(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-900 dark:text-white"
                                placeholder="Enter pose name..."
                            />
                        </div>

                        <button
                            onClick={handleSave}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
                        >
                            <Save size={20} />
                            <span>Save Character Pose</span>
                        </button>
                    </div>
                )}
            </div>

            {promptPreview && (
                <PromptPreviewModal
                    data={promptPreview}
                    onClose={() => setPromptPreview(null)}
                    title="Character Pose Prompt"
                />
            )}
        </div>
    );
};

export default CharacterStudio;
