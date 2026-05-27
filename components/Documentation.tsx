import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Layers, Rocket, Star, Users, Wand2, Palette, Wrench, Volume2, Globe, Heart } from 'lucide-react';

interface DocumentationProps {
    onBack: () => void;
}

const Documentation: React.FC<DocumentationProps> = ({ onBack }) => {
    const [lang, setLang] = useState<'en' | 'id'>('id'); // Default to Indonesian
    const [activeSection, setActiveSection] = useState('intro');

    const content = {
        en: {
            nav: {
                intro: 'Introduction',
                builder: 'Design Builder',
                brand: 'Brand Identity',
                character: 'Character Lab',
                library: 'My Files',
                generator: 'Post Generator',
                carousel: 'Carousel Generator',
                studio: 'Character Studio',
                audio: 'Audio Lab'
            },
            sections: {
                intro: {
                    title: 'Welcome to Weed Labs',
                    subtitle: 'The Advanced AI Production Suite',
                    desc: `Weed Labs is your all-in-one AI production studio designed to revolutionize how you create digital content. 
          Unlike generic AI tools, Weed Labs focuses on "DNA Extraction" — preserving the unique soul of your brand, design, and characters 
          to ensure every generated asset feels authentically yours.`,
                    features: [
                        { title: 'DNA Extraction', desc: 'Capture the core essence of your brand and designs.' },
                        { title: 'Consistency', desc: 'Maintain visual style across thousands of generations.' },
                        { title: 'Workflow', desc: 'Seamlessly connected tools for a complete production pipeline.' }
                    ]
                },
                builder: {
                    title: 'Design Builder',
                    subtitle: 'Extract Structural DNA',
                    desc: 'The Design Builder is where you teach the AI how to structure your content. Instead of using generic templates, you upload images of designs you love, and the AI extracts their "Structural DNA".',
                    howTo: [
                        'Upload a reference image (e.g., a high-converting Instagram post).',
                        'The AI analyzes the layout, typography, and composition.',
                        'It saves a "Blueprint" that can be reused infinitely with different content.'
                    ],
                    tips: 'Use this for recurring content formats like quotes, testimonials, or product showcases.'
                },
                brand: {
                    title: 'Brand Identity Lab',
                    subtitle: 'Save Color DNA',
                    desc: 'Your brand is more than just a hex code. Resulting contents must "feel" like your brand. The Brand Lab analyzes your logo or moodboard to extract your Color Grammar and Brand Vibe.',
                    howTo: [
                        'Upload your logo or a brand moodboard.',
                        'The AI extracts primary colors, usage logic, and aesthetic vibes.',
                        'Save this DNA to apply your branding automatically to any generated post.'
                    ],
                    tips: 'Ensure your Brand DNA includes both light and dark mode rules for maximum versatility.'
                },
                character: {
                    title: 'Character Lab',
                    subtitle: 'Extract Character DNA',
                    desc: 'Create consistent characters that don\'t morph into different people. The Character Lab locks the identity of your mascots or influencers.',
                    howTo: [
                        'Upload 1-3 reference images of your character.',
                        'Describe their physical features (e.g., "blue robotic cat with glowing eyes").',
                        'Save the "Character DNA" to use in the Character Studio or Post Generator.'
                    ],
                    tips: 'The more specific your visual description, the more consistent the results.'
                },
                library: {
                    title: 'My Files (The Vault)',
                    subtitle: 'Centralized Asset Registry',
                    desc: 'This is the brain of Weed Labs. All your extracted DNAs (Design, Brand, Character) and generated assets are stored here secure and organized.',
                    howTo: [
                        'View and manage all your saved Blueprints and Brand Profiles.',
                        'Review generated posts, carousels, and character poses.',
                        'Delete old assets or update existing DNA profiles.'
                    ],
                    tips: 'Use the filter tabs to quickly find specific asset types like "Blueprints" or "Audio Voices".'
                },
                generator: {
                    title: 'Post Generator',
                    subtitle: 'Deploy & Remix',
                    desc: 'The synthesis chamber where everything comes together. Combine your Design Blueprints with Brand DNA to generate production-ready social media posts.',
                    howTo: [
                        'Select a Design Blueprint (Structure).',
                        'Select a Brand Profile (Style).',
                        'Input your content topic or copy.',
                        'Click "ignite" to generate a perfectly branded post.'
                    ],
                    tips: 'Use the "Precision Mode" to manually tweak specific elements before generation.'
                },
                carousel: {
                    title: 'Carousel Generator',
                    subtitle: 'Multi-Slide Storytelling',
                    desc: 'Create engaging LinkedIn or Instagram carousels in seconds. This tool plans the narrative flow and generates consistent visuals for every slide.',
                    howTo: [
                        'Choose a Blueprint optimized for carousels.',
                        'Enter your topic (e.g., "5 Tips for AI Marketing").',
                        'The AI plans the slide outlines and generates cohesive images for each step.'
                    ],
                    tips: 'Great for educational content or step-by-step guides.'
                },
                studio: {
                    title: 'Character Studio',
                    subtitle: 'Generate Poses',
                    desc: 'Need your mascot pointing at a chart? Or sitting at a desk? The Character Studio takes your Character DNA and puts them in any scenario you can imagine.',
                    howTo: [
                        'Select a saved Character.',
                        'Describe the pose or action (e.g., "holding a coffee cup").',
                        'Generate perfectly consistent character art in new situations.'
                    ],
                    tips: 'Use these generated poses as assets in your design tools or future posts.'
                },
                audio: {
                    title: 'Audio Lab',
                    subtitle: 'Synthesize Voice',
                    desc: 'Give your brand a voice. The Audio Lab generates realistic voiceovers for your content using advanced speech synthesis.',
                    howTo: [
                        'Select a voice profile (Gender, Accent, Tone).',
                        'Input the text script.',
                        'Generate high-quality audio files for videos or podcasts.'
                    ],
                    tips: 'Match the voice tone to your Brand Vibe for a consistent auditory identity.'
                }
            }
        },
        id: {
            nav: {
                intro: 'Pengantar',
                builder: 'Design Builder',
                brand: 'Brand Identity',
                character: 'Character Lab',
                library: 'My Files',
                generator: 'Post Generator',
                carousel: 'Carousel Generator',
                studio: 'Character Studio',
                audio: 'Audio Lab'
            },
            sections: {
                intro: {
                    title: 'Selamat Datang di Weed Labs',
                    subtitle: 'Suite Produksi AI Tercanggih',
                    desc: `Weed Labs adalah studio produksi AI lengkap yang dirancang untuk merevolusi cara Anda membuat konten digital. 
          Tidak seperti alat AI biasa, Weed Labs berfokus pada "Ekstraksi DNA" — menjaga jiwa unik dari brand, desain, dan karakter Anda 
          untuk memastikan setiap aset yang dihasilkan terasa autentik milik Anda.`,
                    features: [
                        { title: 'Ekstraksi DNA', desc: 'Tangkap esensi inti dari brand dan desain Anda.' },
                        { title: 'Konsistensi', desc: 'Pertahankan gaya visual di ribuan generasi konten.' },
                        { title: 'Alur Kerja', desc: 'Alat yang saling terhubung untuk pipeline produksi yang lengkap.' }
                    ]
                },
                builder: {
                    title: 'Design Builder',
                    subtitle: 'Ekstrak DNA Struktural',
                    desc: 'Design Builder adalah tempat Anda mengajar AI cara menyusun konten. Alih-alih menggunakan template umum, Anda mengunggah gambar desain yang Anda sukai, dan AI akan mengekstrak "DNA Struktural"-nya.',
                    howTo: [
                        'Unggah gambar referensi (misalnya, postingan Instagram yang viral).',
                        'AI menganalisis tata letak, tipografi, dan komposisi.',
                        'Ia menyimpan "Blueprint" yang dapat digunakan kembali tanpa batas dengan konten berbeda.'
                    ],
                    tips: 'Gunakan ini untuk format konten berulang seperti kutipan, testimonial, atau etalase produk.'
                },
                brand: {
                    title: 'Brand Identity Lab',
                    subtitle: 'Simpan DNA Warna',
                    desc: 'Brand Anda lebih dari sekadar kode hex. Konten yang dihasilkan harus "terasa" seperti brand Anda. Brand Lab menganalisis logo atau moodboard untuk mengekstrak Tata Bahasa Warna dan Aura Brand Anda.',
                    howTo: [
                        'Unggah logo atau moodboard brand Anda.',
                        'AI mengekstrak warna utama, logika penggunaan, dan aura estetika.',
                        'Simpan DNA ini untuk menerapkan branding Anda secara otomatis ke setiap postingan.'
                    ],
                    tips: 'Pastikan DNA Brand Anda mencakup aturan mode terang dan gelap untuk fleksibilitas maksimal.'
                },
                character: {
                    title: 'Character Lab',
                    subtitle: 'Ekstrak DNA Karakter',
                    desc: 'Buat karakter konsisten yang tidak berubah menjadi orang lain. Character Lab mengunci identitas maskot atau influencer Anda.',
                    howTo: [
                        'Unggah 1-3 gambar referensi karakter Anda.',
                        'Deskripsikan fitur fisiknya (contoh: "kucing robot biru dengan mata bersinar").',
                        'Simpan "DNA Karakter" untuk digunakan di Character Studio atau Post Generator.'
                    ],
                    tips: 'Semakin spesifik deskripsi visual Anda, semakin konsisten hasilnya.'
                },
                library: {
                    title: 'My Files (The Vault)',
                    subtitle: 'Registri Aset Terpusat',
                    desc: 'Ini adalah otak dari Weed Labs. Semua DNA yang diekstrak (Desain, Brand, Karakter) dan aset yang dihasilkan disimpan di sini dengan aman dan terorganisir.',
                    howTo: [
                        'Lihat dan kelola Blueprint dan Profil Brand yang disimpan.',
                        'Tinjau postingan, carousel, dan pose karakter yang dihasilkan.',
                        'Hapus aset lama atau perbarui profil DNA yang ada.'
                    ],
                    tips: 'Gunakan tab filter untuk menemukan tipe aset tertentu seperti "Blueprints" atau "Audio Voices" dengan cepat.'
                },
                generator: {
                    title: 'Post Generator',
                    subtitle: 'Deploy & Remix',
                    desc: 'Ruang sintesis di mana semuanya bersatu. Gabungkan Blueprint Desain dengan DNA Brand untuk menghasilkan postingan media sosial siap tayang.',
                    howTo: [
                        'Pilih Blueprint Desain (Struktur).',
                        'Pilih Profil Brand (Gaya).',
                        'Masukkan topik konten atau teks copy.',
                        'Klik "ignite" untuk menghasilkan postingan yang sangat sesuai brand.'
                    ],
                    tips: 'Gunakan "Precision Mode" untuk menyesuaikan elemen tertentu secara manual sebelum pembuatan.'
                },
                carousel: {
                    title: 'Carousel Generator',
                    subtitle: 'Bercerita Multi-Slide',
                    desc: 'Buat carousel LinkedIn atau Instagram yang menarik dalam hitungan detik. Alat ini merencanakan alur narasi dan menghasilkan visual yang kohesif untuk setiap slide.',
                    howTo: [
                        'Pilih Blueprint yang dioptimalkan untuk carousel.',
                        'Masukkan topik Anda (contoh: "5 Tips Pemasaran AI").',
                        'AI merencanakan kerangka slide dan menghasilkan gambar yang kohesif untuk setiap langkah.'
                    ],
                    tips: 'Sangat bagus untuk konten edukasi atau panduan langkah demi langkah.'
                },
                studio: {
                    title: 'Character Studio',
                    subtitle: 'Hasilkan Pose',
                    desc: 'Butuh maskot Anda menunjuk ke grafik? Atau duduk di meja? Character Studio mengambil DNA Karakter Anda dan menempatkannya dalam skenario apa pun yang dapat Anda bayangkan.',
                    howTo: [
                        'Pilih Karakter yang disimpan.',
                        'Deskripsikan pose atau tindakan (contoh: "memegang cangkir kopi").',
                        'Hasilkan seni karakter yang sangat konsisten dalam situasi baru.'
                    ],
                    tips: 'Gunakan pose yang dihasilkan ini sebagai aset dalam alat desain atau postingan masa depan Anda.'
                },
                audio: {
                    title: 'Audio Lab',
                    subtitle: 'Sintesis Suara',
                    desc: 'Berikan suara pada brand Anda. Audio Lab menghasilkan sulih suara realistis untuk konten Anda menggunakan sintesis ucapan canggih.',
                    howTo: [
                        'Pilih profil suara (Jenis Kelamin, Aksen, Nada).',
                        'Masukkan naskah teks.',
                        'Hasilkan file audio berkualitas tinggi untuk video atau podcast.'
                    ],
                    tips: 'Sesuaikan nada suara dengan Aura Brand Anda untuk identitas auditori yang konsisten.'
                }
            }
        }
    };

    const currentContent = content[lang];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center space-x-5">
                    <button onClick={onBack} className="p-4 rounded-2xl bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95 flex items-center justify-center border border-slate-200 dark:border-slate-700/50">
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-3 mb-1">
                            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <BookOpen size={20} className="text-orange-500" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter italic uppercase text-slate-900 dark:text-white">DOCS <span className="text-orange-500">& GUIDES</span></h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{lang === 'en' ? 'Master the power of Weed Labs.' : 'Kuasai kekuatan Weed Labs.'}</p>
                    </div>
                </div>

                <button
                    onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
                    className="flex items-center space-x-3 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all font-bold text-sm text-slate-900 dark:text-white shadow-sm"
                >
                    <Globe size={16} className={lang === 'en' ? 'text-blue-500' : 'text-red-500'} />
                    <span>{lang === 'en' ? 'English' : 'Bahasa Indonesia'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-3 space-y-2">
                    {Object.entries(currentContent.nav).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveSection(key)}
                            className={`w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${activeSection === key
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span>{label}</span>
                            {activeSection === key && <Heart size={14} className="fill-current" />}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9 space-y-12 pb-24">
                    {/* Render Active Section */}
                    <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                        {/* Dynamic Section Rendering */}
                        {Object.entries(currentContent.sections).map(([key, section]) => {
                            if (key !== activeSection) return null;
                            return (
                                <div key={key} className="space-y-8">
                                    <div className="space-y-4">
                                        <span className="inline-block px-3 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-bold uppercase tracking-widest border border-orange-500/20">
                                            {section.subtitle}
                                        </span>
                                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                                            {section.title}
                                        </h1>
                                        <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                                            {section.desc}
                                        </p>
                                    </div>

                                    {/* Feature Highlights (for Intro) */}
                                    {section.features && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                                            {section.features.map((feat: any, idx: number) => (
                                                <div key={idx} className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 transition-colors">
                                                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 text-orange-600 dark:text-orange-400 font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h4>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Step-by-Step for Tools */}
                                    {section.howTo && (
                                        <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                                <Rocket size={20} className="text-orange-500" />
                                                {lang === 'en' ? 'How to use' : 'Cara Menggunakan'}
                                            </h3>
                                            <div className="space-y-6">
                                                {section.howTo.map((step: string, idx: number) => (
                                                    <div key={idx} className="flex gap-4">
                                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-sm font-bold text-slate-500">
                                                            {idx + 1}
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Pro Tips */}
                                    {section.tips && (
                                        <div className="p-6 rounded-[2rem] bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/10 flex items-start gap-4">
                                            <div className="p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                                <Star size={20} className="text-blue-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-1 text-sm uppercase tracking-wider">Pro Tip</h4>
                                                <p className="text-slate-600 dark:text-slate-300 italic">"{section.tips}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Documentation;
