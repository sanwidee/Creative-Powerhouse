import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Inbox,
  Wand2,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  Download,
} from 'lucide-react';
import type {
  BrandAsset,
  BrandReference,
  ContentPlan,
  GeneratedPost,
  PostIdea,
  PostIdeaFormat,
  PostSlide,
  BodySlideStyle,
  ChatMessage,
} from '../types';
import { QlipperHeroManifest } from '../templates/QlipperHero';
import { RENDER_DIMENSIONS } from '../templates/types';

interface PlanQueueProps {
  plans: ContentPlan[];
  brands: BrandReference[];
  brandAssets: BrandAsset[];
  generatedPosts: GeneratedPost[];
  onUpdatePlan: (plan: ContentPlan) => void;
  onSavePost: (post: GeneratedPost) => void;
  onSavePostsBulk: (posts: GeneratedPost[]) => void;
  onBack: () => void;
}

const formatColor: Record<PostIdeaFormat, string> = {
  hook: 'pink',
  stat: 'cyan',
  listicle: 'violet',
  quote: 'amber',
  cta: 'emerald',
  carousel: 'blue',
};

const formatLabel: Record<PostIdeaFormat, string> = {
  hook: 'Hook',
  stat: 'Stat',
  listicle: 'Listicle',
  quote: 'Quote',
  cta: 'CTA',
  carousel: 'Carousel',
};

const formatTime = (ts?: number): string => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDayLabel = (ts?: number): { day: string; date: string; key: string } => {
  if (!ts) return { day: '—', date: '', key: 'unscheduled' };
  const d = new Date(ts);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'Asia/Jakarta' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' });
  const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return { day, date, key };
};

// ─── Asset matching ───────────────────────────────────────────────────────────

const KEYWORD_RULES: { keywords: string[]; iconTags: string[] }[] = [
  { keywords: ['podcast'], iconTags: ['headphones', 'video-player'] },
  { keywords: ['gaming', 'game', 'gamer'], iconTags: ['video-player', 'lightning-bolt'] },
  { keywords: ['scrub', 'cuplik', 'potong', 'edit', 'clip', 'klip'], iconTags: ['scissors'] },
  { keywords: ['waktu', 'jam', 'menit', 'hour', 'time'], iconTags: ['hourglass'] },
  { keywords: ['budget', 'biaya', 'uang', 'duit', 'cost', 'mahal', 'harga', 'invest'], iconTags: ['coin-stack', 'diamond'] },
  { keywords: ['video', 'short', 'reel', 'fyp', 'shorts'], iconTags: ['clapper-board', 'film-reel', 'play-button'] },
  { keywords: ['viral', 'algoritma', 'reach'], iconTags: ['fire-ring', 'rocket', 'lightning-bolt'] },
  { keywords: ['burnout', 'capek', 'stres', 'lelah', 'tired'], iconTags: ['headphones', 'fire-ring'] },
  { keywords: ['roi', 'value', 'cerdas', 'smart', 'investasi'], iconTags: ['trophy', 'crown', 'diamond'] },
  { keywords: ['ai', 'cerdas', 'pintar', 'tech'], iconTags: ['cpu-chip', 'sparkle'] },
  { keywords: ['coba', 'mulai', 'start', 'try', 'launch'], iconTags: ['rocket', 'lightning-bolt'] },
  { keywords: ['audien', 'audience', 'penonton', 'follow'], iconTags: ['megaphone', 'globe'] },
  { keywords: ['skip', 'lewat', 'kelewat'], iconTags: ['export-arrow', 'arrow-up'] },
];

function scoreAsset(text: string, asset: BrandAsset): number {
  let score = 0;
  // Each tag that appears in the text adds to the score
  for (const tag of asset.tags) {
    // Skip structural tags
    if (['dark', 'light', 'desktop-ai', 'dark-fire', 'royal-gold', 'upload', 'gemini-gen'].includes(tag)) continue;
    if (tag.length < 3) continue;
    if (text.includes(tag.toLowerCase())) score += 5;
  }
  // Keyword rules boost specific icon matches
  for (const rule of KEYWORD_RULES) {
    if (!rule.keywords.some((kw) => text.includes(kw))) continue;
    for (const iconTag of rule.iconTags) {
      if (asset.tags.includes(iconTag)) score += 8;
    }
  }
  return score;
}

function pickAsset(idea: PostIdea, brandAssets: BrandAsset[], brandId: string | null): BrandAsset | null {
  // Used by single-shot re-renders (no diversity tracking). Allocator below handles batches.
  const candidates = brandAssets.filter(
    (a) => (!brandId || a.brand_id === brandId) && a.tags.includes(idea.theme)
  );
  if (candidates.length === 0) return null;

  const text = `${idea.topic} ${idea.headline} ${idea.caption_draft}`.toLowerCase();
  const scored = candidates.map((a) => ({ asset: a, score: scoreAsset(text, a) }));
  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.asset || candidates[0];
}

/**
 * Allocate assets across many slides with hard diversity constraints:
 *   - Each asset can be used AT MOST 2 times.
 *   - At most 5 assets may reach 2 uses; the rest must stay at 0 or 1.
 * Picks each slide's best-scoring candidate that respects the constraints.
 */
function allocateAssets(
  ideas: PostIdea[],
  brandAssets: BrandAsset[],
  brandId: string | null,
  options: { maxPerAsset?: number; maxDoubled?: number } = {}
): Map<string, BrandAsset | null> {
  const maxPerAsset = options.maxPerAsset ?? 2;
  const maxDoubled = options.maxDoubled ?? 5;

  const result = new Map<string, BrandAsset | null>();
  const usage = new Map<string, number>();
  let doubledCount = 0;

  // Build the slide queue
  const queue: { key: string; slide: PostSlide; idea: PostIdea }[] = [];
  for (const idea of ideas) {
    const slides: PostSlide[] =
      idea.slides && idea.slides.length > 0
        ? idea.slides
        : [
            {
              slide_index: 0,
              slide_type: 'cover',
              theme: idea.theme,
              headline: idea.headline,
            },
          ];
    for (const slide of slides) {
      queue.push({ key: `${idea.id}_${slide.slide_index}`, slide, idea });
    }
  }

  for (const { key, slide, idea } of queue) {
    const theme = slide.theme || idea.theme;
    const candidates = brandAssets.filter(
      (a) => (!brandId || a.brand_id === brandId) && a.tags.includes(theme)
    );
    if (candidates.length === 0) {
      result.set(key, null);
      continue;
    }

    const text = [
      slide.asset_keyword,
      slide.headline,
      slide.body_heading,
      slide.body_text,
      slide.body_label,
      idea.topic,
      idea.headline,
      idea.caption_draft,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const scored = candidates.map((a) => {
      const semantic = scoreAsset(text, a);
      const used = usage.get(a.id) || 0;
      // Strong penalty for already-used assets; even stronger for at-limit ones.
      const usagePenalty = used === 0 ? 0 : used === 1 ? 4 : 9999;
      // Tiny random tiebreaker
      const jitter = Math.random() * 0.5;
      return { asset: a, score: semantic - usagePenalty + jitter };
    });
    scored.sort((a, b) => b.score - a.score);

    // Pick the first candidate that respects hard constraints
    let picked: BrandAsset | null = null;
    for (const { asset } of scored) {
      const used = usage.get(asset.id) || 0;
      if (used >= maxPerAsset) continue;
      if (used === maxPerAsset - 1 && doubledCount >= maxDoubled) continue;
      picked = asset;
      const next = used + 1;
      usage.set(asset.id, next);
      if (next === maxPerAsset) doubledCount++;
      break;
    }

    // Last-resort fallback (shouldn't trigger if pool >> slides)
    if (!picked) {
      for (const a of candidates) {
        const used = usage.get(a.id) || 0;
        if (used < maxPerAsset) {
          picked = a;
          const next = used + 1;
          usage.set(a.id, next);
          if (next === maxPerAsset) doubledCount++;
          break;
        }
      }
    }

    result.set(key, picked || null);
  }

  return result;
}

function makeSubhead(idea: PostIdea): string {
  // First sentence of caption, fall back to topic
  const firstSentence = idea.caption_draft.split(/[.!?]\s/)[0];
  if (firstSentence && firstSentence.length < 140) return firstSentence + '.';
  if (idea.topic.length < 140) return idea.topic;
  return idea.headline;
}

// ─── Idea card ────────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: PostIdea;
  index: number;
  renderedImages: string[];
  isRendering: boolean;
  onReRender: (ideaId: string) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, index, renderedImages, isRendering, onReRender }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const isDark = idea.theme === 'dark';
  const color = formatColor[idea.format] || 'slate';
  const hasRender = renderedImages.length > 0;
  const slideCount = idea.slides?.length || (hasRender ? renderedImages.length : 1);
  const showImage = hasRender && renderedImages[activeSlide];

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-900 dark:bg-slate-100 dark:text-slate-900'
      }`}
    >
      {/* Rendered image at top, if available */}
      {showImage ? (
        <div className={`relative aspect-[4/5] ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}>
          <img src={renderedImages[activeSlide]} alt={idea.headline} className="w-full h-full object-contain" />
          {renderedImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
              {renderedImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  aria-label={`Show slide ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition ${
                    i === activeSlide ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
          {renderedImages.length > 1 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold tracking-wider">
              {activeSlide + 1} / {renderedImages.length}
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              onClick={() => onReRender(idea.id)}
              disabled={isRendering}
              className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 disabled:opacity-40"
              title="Re-render this carousel"
            >
              {isRendering ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />}
              Re-render
            </button>
            <a
              href={renderedImages[activeSlide]}
              download={`qlipper-${index + 1}-slide-${activeSlide + 1}.png`}
              className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
              title="Download current slide"
            >
              <Download size={11} />
            </a>
          </div>
        </div>
      ) : isRendering ? (
        <div className={`aspect-[4/5] flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-200'}`}>
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className={isDark ? 'text-pink-400 animate-spin' : 'text-pink-500 animate-spin'} />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rendering</span>
          </div>
        </div>
      ) : null}

      {/* Top strip: time + theme + format */}
      <div
        className={`px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest ${
          isDark ? 'bg-slate-950/50 border-b border-slate-800' : 'bg-slate-50 border-b border-slate-200 dark:bg-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <Clock size={11} />
            {formatTime(idea.scheduled_at)} WIB
          </span>
          <span className="opacity-30">·</span>
          <span className={`flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {isDark ? <Moon size={11} /> : <Sun size={11} />}
            {idea.theme}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-md text-${color}-500 bg-${color}-500/10`}>
          {formatLabel[idea.format]}
        </span>
      </div>

      {/* Headline */}
      <div className="p-4">
        <div className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1 flex items-center gap-2`}>
          <span>#{index + 1}</span>
          <span>·</span>
          <span>{idea.status}</span>
          {idea.status === 'rendered' && <CheckCircle2 size={11} className="text-emerald-500" />}
        </div>
        <h3 className={`text-lg font-bold leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {idea.headline}
        </h3>
        <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'} italic`}>{idea.topic}</p>
      </div>

      {/* Expandable caption + hashtags */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`text-[11px] font-bold flex items-center gap-1 ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
          } transition`}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide caption' : 'Show caption'}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className={`text-xs leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {idea.caption_draft}
            </p>
            <div className="flex flex-wrap gap-1">
              {idea.hashtags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-200 dark:text-slate-700'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PlanQueue (main) ─────────────────────────────────────────────────────────

const PlanQueue: React.FC<PlanQueueProps> = ({ plans, brands, brandAssets, generatedPosts, onUpdatePlan, onSavePost, onSavePostsBulk, onBack }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number; currentHeadline?: string } | null>(null);
  const [renderingIdeaId, setRenderingIdeaId] = useState<string | null>(null);
  // Now stores ARRAY of dataUrls per idea (one per slide in carousel)
  const [renderedImages, setRenderedImages] = useState<Record<string, string[]>>({});

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || plans[0],
    [plans, selectedPlanId]
  );

  // Build a lookup so previously-rendered posts show their image after reload.
  const postsById = useMemo(() => {
    const map: Record<string, GeneratedPost> = {};
    for (const p of generatedPosts) map[p.id] = p;
    return map;
  }, [generatedPosts]);

  // Returns an ARRAY of rendered slide images for an idea, in slide order.
  // Prefers just-rendered (in-memory) over persisted posts.
  const getRenderedImages = (idea: PostIdea): string[] => {
    if (renderedImages[idea.id] && renderedImages[idea.id].length > 0) return renderedImages[idea.id];

    // Reconstruct from persisted posts using slide-level rendered_post_id
    if (idea.slides && idea.slides.length > 0) {
      const imgs: string[] = [];
      for (const s of idea.slides) {
        if (s.rendered_post_id && postsById[s.rendered_post_id]) {
          imgs.push(postsById[s.rendered_post_id].imageSource);
        }
      }
      if (imgs.length > 0) return imgs;
    }

    // Legacy single-slide fallback
    if (idea.rendered_post_id && postsById[idea.rendered_post_id]) {
      return [postsById[idea.rendered_post_id].imageSource];
    }
    return [];
  };

  const brand = useMemo(
    () => (selectedPlan?.brand_id ? brands.find((b) => b.id === selectedPlan.brand_id) : null),
    [brands, selectedPlan]
  );

  const ideasByDay = useMemo(() => {
    if (!selectedPlan) return [];
    const groups: { key: string; day: string; date: string; ideas: { idea: PostIdea; index: number }[] }[] = [];
    selectedPlan.ideas.forEach((idea, index) => {
      const { key, day, date } = formatDayLabel(idea.scheduled_at);
      const existing = groups.find((g) => g.key === key);
      if (existing) {
        existing.ideas.push({ idea, index });
      } else {
        groups.push({ key, day, date, ideas: [{ idea, index }] });
      }
    });
    return groups;
  }, [selectedPlan]);

  // Cache of pre-loaded HTMLImageElement instances for asset dataUrls.
  const assetImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const loadImage = async (src: string): Promise<HTMLImageElement | null> => {
    if (!src) return null;
    const cached = assetImageCacheRef.current.get(src);
    if (cached && cached.complete && cached.naturalWidth > 0) return cached;

    const img = new Image();
    img.src = src;
    try {
      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('image load failed'));
        setTimeout(() => reject(new Error('image load timeout')), 8000);
      });
    } catch (e) {
      console.warn('loadImage failed for src starting with', src.slice(0, 60), e);
      return null;
    }
    assetImageCacheRef.current.set(src, img);
    return img;
  };

  // Wrap a string into lines that fit within maxWidth at the given font.
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      const words = paragraph.split(' ');
      let current = '';
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  // ─── Canvas drawing helpers ─────────────────────────────────────────────────

  type Palette = { bg: string; ink: string; subInk: string; accent: string };

  const paletteFor = (theme: 'dark' | 'light'): Palette => {
    const vi = brand?.visual_identity;
    if (theme === 'dark') {
      return {
        bg: vi?.bg_dark || '#000000',
        ink: vi?.ink_dark || '#FFFFFF',
        subInk: vi?.sub_ink_dark || '#9CA3AF',
        accent: vi?.accent_color || '#D4AF37',
      };
    }
    return {
      bg: vi?.bg_light || '#EFE8D7',
      ink: vi?.ink_light || '#1A1410',
      subInk: vi?.sub_ink_light || '#5A4A3D',
      accent: vi?.accent_color || '#B8860B',
    };
  };

  const ensureFonts = async () => {
    try {
      if ((document as any).fonts?.ready) await (document as any).fonts.ready;
      const fontsApi = (document as any).fonts;
      if (fontsApi?.load) {
        await Promise.all([
          fontsApi.load("800 96px 'Inter Tight'"),
          fontsApi.load("700 48px 'Inter Tight'"),
          fontsApi.load("600 36px 'Inter Tight'"),
          fontsApi.load("400 32px 'Inter Tight'"),
        ]);
      }
    } catch {}
  };

  const drawWrappedCentered = (
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    startY: number,
    maxWidth: number,
    fontSize: number,
    weight: number,
    color: string,
    lineHeightMul = 1.1
  ): number => {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `${weight} ${fontSize}px 'Inter Tight', 'Inter', system-ui, sans-serif`;
    const lines = wrapText(ctx, text, maxWidth);
    const lh = fontSize * lineHeightMul;
    let y = startY;
    for (const line of lines) {
      ctx.fillText(line, cx, y);
      y += lh;
    }
    return y;
  };

  const drawWrappedLeft = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    fontSize: number,
    weight: number,
    color: string,
    lineHeightMul = 1.32
  ): number => {
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `${weight} ${fontSize}px 'Inter Tight', 'Inter', system-ui, sans-serif`;
    const lines = wrapText(ctx, text, maxWidth);
    const lh = fontSize * lineHeightMul;
    let y = startY;
    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += lh;
    }
    return y;
  };

  const drawPill = (
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    centerY: number,
    color: string,
    fontSize: number,
    padX: number,
    padY: number
  ) => {
    ctx.save();
    ctx.font = `700 ${fontSize}px 'Inter Tight', 'Inter', system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    const w = tw + padX * 2;
    const h = fontSize + padY * 2;
    const x = cx - w / 2;
    const y = centerY - h / 2;
    const r = h / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, centerY);
    ctx.restore();
  };

  const drawAssetFitted = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cx: number,
    cy: number,
    maxW: number,
    maxH: number
  ) => {
    const ratio = img.naturalWidth / img.naturalHeight;
    let finalW = maxW;
    let finalH = finalW / ratio;
    if (finalH > maxH) {
      finalH = maxH;
      finalW = finalH * ratio;
    }
    ctx.drawImage(img, cx - finalW / 2, cy - finalH / 2, finalW, finalH);
  };

  const drawDashedPlaceholder = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    isDark: boolean,
    label = '(asset not found)'
  ) => {
    ctx.save();
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
    ctx.setLineDash([18, 12]);
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
    ctx.font = `400 24px 'Inter Tight'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.restore();
  };

  // ─── Slide-type renderers ───────────────────────────────────────────────────

  const CTA_DEFAULT = brand?.visual_identity?.cta_text_default || 'Coba Qlipper sekarang';

  /** Cover slide: bold headline top, hero asset center, CTA bottom */
  const drawCover = async (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    slide: PostSlide,
    asset: BrandAsset | null
  ) => {
    const pal = paletteFor(slide.theme);
    const min = Math.min(W, H);
    const padding = min * 0.075;
    const headlineSize = min * 0.085;
    const subheadSize = min * 0.034;
    const ctaSize = min * 0.032;
    const ctaPadX = min * 0.055;
    const ctaPadY = min * 0.022;
    const heroMax = min * 0.62;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    const cursorY = drawWrappedCentered(
      ctx,
      slide.headline || '',
      W / 2,
      padding * 1.25,
      W - padding * 2,
      headlineSize,
      800,
      pal.ink,
      1.04
    );

    let subEndY = cursorY;
    if (slide.subhead) {
      subEndY = drawWrappedCentered(
        ctx,
        slide.subhead,
        W / 2,
        cursorY + subheadSize * 0.6,
        W * 0.9,
        subheadSize,
        400,
        pal.subInk,
        1.32
      );
    }

    // CTA pill at bottom
    const pillY = H - padding - (ctaSize + ctaPadY * 2) / 2;
    drawPill(ctx, slide.cta_text || CTA_DEFAULT, W / 2, pillY, pal.ink, ctaSize, ctaPadX, ctaPadY);

    // Hero asset centered in remaining space
    if (asset?.dataUrl) {
      const img = await loadImage(asset.dataUrl);
      const availTop = subEndY + padding * 0.4;
      const availBottom = pillY - (ctaSize + ctaPadY * 2) / 2 - padding * 0.4;
      const availH = Math.max(40, availBottom - availTop);
      if (img) drawAssetFitted(ctx, img, W / 2, availTop + availH / 2, heroMax, Math.min(heroMax, availH));
      else drawDashedPlaceholder(ctx, W / 2, availTop + availH / 2, heroMax * 0.55, slide.theme === 'dark');
    }
  };

  /** Body Explainer: small label, big heading, multi-line body, small asset accent, CTA */
  const drawBodyExplainer = async (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    slide: PostSlide,
    asset: BrandAsset | null
  ) => {
    const pal = paletteFor(slide.theme);
    const min = Math.min(W, H);
    const padding = min * 0.075;
    const labelSize = min * 0.022;
    const headingSize = min * 0.055;
    const bodySize = min * 0.034;
    const ctaSize = min * 0.032;
    const ctaPadX = min * 0.055;
    const ctaPadY = min * 0.022;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // Small uppercase label
    ctx.save();
    ctx.fillStyle = pal.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${labelSize}px 'Inter Tight'`;
    const label = (slide.body_label || 'INSIGHT').toUpperCase();
    ctx.letterSpacing = '0.2em' as any; // ignored by older canvas; harmless
    ctx.fillText(label, padding, padding);
    ctx.restore();

    // Heading
    let y = padding + labelSize + min * 0.025;
    y = drawWrappedLeft(
      ctx,
      slide.body_heading || slide.headline || '',
      padding,
      y,
      W - padding * 2,
      headingSize,
      700,
      pal.ink,
      1.1
    );

    // Body text
    if (slide.body_text) {
      y += padding * 0.35;
      y = drawWrappedLeft(
        ctx,
        slide.body_text,
        padding,
        y,
        W - padding * 2,
        bodySize,
        400,
        pal.subInk,
        1.42
      );
    }

    // Asset accent bottom-right
    const accentSize = min * 0.28;
    if (asset?.dataUrl) {
      const img = await loadImage(asset.dataUrl);
      if (img) {
        drawAssetFitted(
          ctx,
          img,
          W - padding - accentSize / 2,
          H - padding - (ctaSize + ctaPadY * 2) - padding * 0.5 - accentSize / 2,
          accentSize,
          accentSize
        );
      }
    }

    // CTA
    const pillY = H - padding - (ctaSize + ctaPadY * 2) / 2;
    drawPill(ctx, slide.cta_text || CTA_DEFAULT, W / 2, pillY, pal.ink, ctaSize, ctaPadX, ctaPadY);
  };

  /** Body Bullets: heading + 3 bullets with number badges, asset accent, CTA */
  const drawBodyBullets = async (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    slide: PostSlide,
    asset: BrandAsset | null
  ) => {
    const pal = paletteFor(slide.theme);
    const min = Math.min(W, H);
    const padding = min * 0.075;
    const headingSize = min * 0.052;
    const bulletSize = min * 0.034;
    const numSize = min * 0.038;
    const ctaSize = min * 0.032;
    const ctaPadX = min * 0.055;
    const ctaPadY = min * 0.022;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // Heading
    let y = padding + min * 0.02;
    y = drawWrappedLeft(
      ctx,
      slide.body_heading || slide.headline || '',
      padding,
      y,
      W - padding * 2,
      headingSize,
      700,
      pal.ink,
      1.1
    );
    y += padding * 0.6;

    // Bullets
    const bullets = (slide.body_bullets || []).slice(0, 4);
    const badgeR = numSize * 0.95;
    const gap = bulletSize * 1.1;
    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i];
      // number badge
      ctx.save();
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(padding + badgeR, y + badgeR, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.bg;
      ctx.font = `800 ${numSize * 0.85}px 'Inter Tight'`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), padding + badgeR, y + badgeR);
      ctx.restore();

      // text
      const textX = padding + badgeR * 2 + padding * 0.4;
      const textMaxW = W - textX - padding;
      const lineEnd = drawWrappedLeft(ctx, bullet, textX, y, textMaxW, bulletSize, 500, pal.ink, 1.35);
      y = Math.max(y + badgeR * 2, lineEnd) + gap;
    }

    // Asset accent bottom-right (small)
    const accentSize = min * 0.22;
    if (asset?.dataUrl) {
      const img = await loadImage(asset.dataUrl);
      if (img) {
        drawAssetFitted(
          ctx,
          img,
          W - padding - accentSize / 2,
          H - padding - (ctaSize + ctaPadY * 2) - padding * 0.4 - accentSize / 2,
          accentSize,
          accentSize
        );
      }
    }

    // CTA
    const pillY = H - padding - (ctaSize + ctaPadY * 2) / 2;
    drawPill(ctx, slide.cta_text || CTA_DEFAULT, W / 2, pillY, pal.ink, ctaSize, ctaPadX, ctaPadY);
  };

  /** Body Stat: huge stat number, supporting label, asset accent, CTA */
  const drawBodyStat = async (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    slide: PostSlide,
    asset: BrandAsset | null
  ) => {
    const pal = paletteFor(slide.theme);
    const min = Math.min(W, H);
    const padding = min * 0.075;
    const labelSize = min * 0.024;
    const statSize = min * 0.22;
    const subSize = min * 0.034;
    const ctaSize = min * 0.032;
    const ctaPadX = min * 0.055;
    const ctaPadY = min * 0.022;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // Top label
    ctx.fillStyle = pal.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `700 ${labelSize}px 'Inter Tight'`;
    const label = (slide.body_label || 'STAT').toUpperCase();
    ctx.fillText(label, W / 2, padding * 1.1);

    // Huge stat
    const stat = slide.body_stat || '—';
    ctx.fillStyle = pal.ink;
    ctx.font = `900 ${statSize}px 'Inter Tight'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const statY = H * 0.36;
    ctx.fillText(stat, W / 2, statY);

    // Stat label / heading just below
    if (slide.body_stat_label || slide.body_heading) {
      const text = slide.body_stat_label || slide.body_heading || '';
      drawWrappedCentered(
        ctx,
        text,
        W / 2,
        statY + statSize * 0.6,
        W * 0.85,
        subSize * 1.2,
        700,
        pal.ink,
        1.2
      );
    }

    // Body context text
    if (slide.body_text) {
      drawWrappedCentered(
        ctx,
        slide.body_text,
        W / 2,
        statY + statSize * 0.9 + subSize * 2.4,
        W * 0.8,
        subSize,
        400,
        pal.subInk,
        1.35
      );
    }

    // Asset accent bottom-left
    const accentSize = min * 0.2;
    if (asset?.dataUrl) {
      const img = await loadImage(asset.dataUrl);
      if (img) {
        drawAssetFitted(
          ctx,
          img,
          padding + accentSize / 2,
          H - padding - (ctaSize + ctaPadY * 2) - padding * 0.4 - accentSize / 2,
          accentSize,
          accentSize
        );
      }
    }

    // CTA
    const pillY = H - padding - (ctaSize + ctaPadY * 2) / 2;
    drawPill(ctx, slide.cta_text || CTA_DEFAULT, W / 2, pillY, pal.ink, ctaSize, ctaPadX, ctaPadY);
  };

  /** Body Testimonial: WhatsApp-style chat bubbles. Always uses WA dark palette regardless of theme. */
  const drawBodyTestimonial = async (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    slide: PostSlide,
    _asset: BrandAsset | null
  ) => {
    // WA dark mode palette — overrides idea theme intentionally
    const bg = '#0B141A';
    const bubbleIn = '#1F2C34';
    const bubbleOut = '#005C4B';
    const text = '#E9EDEF';
    const meta = '#8696A0';
    const checks = '#53BDEB';
    const labelColor = '#D4AF37'; // gold accent for label
    const senderColors = ['#06CF9C', '#53BDEB', '#FFB86A', '#FF8C8C', '#C58AFF'];

    const min = Math.min(W, H);
    const padding = min * 0.07;
    const labelSize = min * 0.022;
    const textSize = min * 0.032;
    const senderSize = min * 0.028;
    const timeSize = min * 0.02;
    const ctaSize = min * 0.032;
    const ctaPadX = min * 0.055;
    const ctaPadY = min * 0.022;
    const bubblePad = min * 0.026;
    const bubbleRadius = min * 0.025;
    const bubbleGap = min * 0.022;
    const maxBubbleW = W * 0.78;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Optional uppercase label at top
    let cursorY = padding;
    if (slide.testimonial_label || slide.body_label) {
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `700 ${labelSize}px 'Inter Tight'`;
      ctx.fillText((slide.testimonial_label || slide.body_label || 'ASLI DARI USER').toUpperCase(), padding, cursorY);
      cursorY += labelSize + min * 0.018;
    }

    // Render bubbles
    const messages: ChatMessage[] = slide.testimonial_messages || [];
    if (messages.length === 0) {
      // Fallback notice if user forgot to supply messages
      ctx.fillStyle = meta;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `400 ${textSize}px 'Inter Tight'`;
      ctx.fillText('(no testimonial messages)', W / 2, H / 2);
    } else {
      const ctaSpace = ctaSize + ctaPadY * 2 + padding * 1.3;
      const availableBottom = H - ctaSpace;
      const messageMaxY = availableBottom - padding * 0.2;

      ctx.textBaseline = 'top';
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const isIncoming = msg.from === 'incoming';

        // Measure text inside bubble
        ctx.font = `400 ${textSize}px 'Inter Tight', 'Inter', system-ui, sans-serif`;
        const innerMaxW = maxBubbleW - bubblePad * 2;
        const lines = wrapText(ctx, msg.text, innerMaxW);
        const textLineHeight = textSize * 1.35;

        // Sender name (if present, incoming only)
        let senderHeight = 0;
        const senderColor = senderColors[(msg.sender?.length || 0) % senderColors.length];
        if (msg.sender && isIncoming) {
          senderHeight = senderSize * 1.4;
        }

        // Compute bubble dims
        let widestLine = 0;
        for (const line of lines) widestLine = Math.max(widestLine, ctx.measureText(line).width);
        // Reserve space for timestamp on the trailing line
        ctx.font = `400 ${timeSize}px 'Inter Tight'`;
        const timeW = ctx.measureText(msg.time).width + (msg.checks ? timeSize * 1.6 : 0);
        ctx.font = `400 ${textSize}px 'Inter Tight'`;
        const contentWidth = Math.max(widestLine + bubblePad * 0.4, timeW + bubblePad * 0.4);
        const bubbleW = Math.min(maxBubbleW, contentWidth + bubblePad * 2);
        const bubbleH = senderHeight + lines.length * textLineHeight + timeSize * 1.6;

        // Stop if bubble would overflow into CTA area; show ellipsis bubble
        if (cursorY + bubbleH > messageMaxY) {
          ctx.fillStyle = meta;
          ctx.textAlign = 'center';
          ctx.font = `400 ${textSize * 0.7}px 'Inter Tight'`;
          ctx.fillText(`+${messages.length - i} more…`, W / 2, cursorY + 4);
          break;
        }

        const bubbleX = isIncoming ? padding : W - padding - bubbleW;

        // Draw rounded bubble
        ctx.fillStyle = isIncoming ? bubbleIn : bubbleOut;
        ctx.beginPath();
        ctx.moveTo(bubbleX + bubbleRadius, cursorY);
        ctx.lineTo(bubbleX + bubbleW - bubbleRadius, cursorY);
        ctx.arcTo(bubbleX + bubbleW, cursorY, bubbleX + bubbleW, cursorY + bubbleRadius, bubbleRadius);
        ctx.lineTo(bubbleX + bubbleW, cursorY + bubbleH - bubbleRadius);
        ctx.arcTo(bubbleX + bubbleW, cursorY + bubbleH, bubbleX + bubbleW - bubbleRadius, cursorY + bubbleH, bubbleRadius);
        ctx.lineTo(bubbleX + bubbleRadius, cursorY + bubbleH);
        ctx.arcTo(bubbleX, cursorY + bubbleH, bubbleX, cursorY + bubbleH - bubbleRadius, bubbleRadius);
        ctx.lineTo(bubbleX, cursorY + bubbleRadius);
        ctx.arcTo(bubbleX, cursorY, bubbleX + bubbleRadius, cursorY, bubbleRadius);
        ctx.closePath();
        ctx.fill();

        // Sender name on incoming bubbles
        let lineY = cursorY + bubblePad * 0.75;
        if (msg.sender && isIncoming) {
          ctx.fillStyle = senderColor;
          ctx.textAlign = 'left';
          ctx.font = `700 ${senderSize}px 'Inter Tight'`;
          ctx.fillText(msg.sender, bubbleX + bubblePad, lineY);
          lineY += senderHeight;
        }

        // Message lines
        ctx.fillStyle = text;
        ctx.textAlign = 'left';
        ctx.font = `400 ${textSize}px 'Inter Tight', 'Inter', system-ui, sans-serif`;
        for (const line of lines) {
          ctx.fillText(line, bubbleX + bubblePad, lineY);
          lineY += textLineHeight;
        }

        // Timestamp + (optional) read receipt at bottom-right inside bubble
        const timeY = cursorY + bubbleH - timeSize * 1.2;
        ctx.font = `400 ${timeSize}px 'Inter Tight'`;
        ctx.fillStyle = isIncoming ? meta : '#9DE1CB';
        ctx.textAlign = 'right';
        let timeRight = bubbleX + bubbleW - bubblePad * 0.8;
        if (!isIncoming && msg.checks) {
          ctx.fillStyle = checks;
          // simple ✓✓ glyph
          ctx.font = `700 ${timeSize * 1.1}px 'Inter Tight'`;
          ctx.fillText('✓✓', timeRight, timeY);
          timeRight -= timeSize * 1.6;
          ctx.fillStyle = '#9DE1CB';
          ctx.font = `400 ${timeSize}px 'Inter Tight'`;
        }
        ctx.fillText(msg.time, timeRight, timeY);

        cursorY += bubbleH + bubbleGap;
      }
    }

    // CTA pill at bottom
    const pillY = H - padding - (ctaSize + ctaPadY * 2) / 2;
    drawPill(ctx, slide.cta_text || CTA_DEFAULT, W / 2, pillY, '#E9EDEF', ctaSize, ctaPadX, ctaPadY);
  };

  // ─── Slide + Idea routers ──────────────────────────────────────────────────

  const renderSlide = async (
    slide: PostSlide,
    idea: PostIdea,
    asset: BrandAsset | null
  ): Promise<string | null> => {
    await ensureFonts();
    const dims = RENDER_DIMENSIONS['4:5'];
    const W = dims.width;
    const H = dims.height;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (slide.slide_type === 'cover') {
      await drawCover(ctx, W, H, slide, asset);
    } else if (slide.body_style === 'bullets') {
      await drawBodyBullets(ctx, W, H, slide, asset);
    } else if (slide.body_style === 'stat') {
      await drawBodyStat(ctx, W, H, slide, asset);
    } else if (slide.body_style === 'testimonial') {
      await drawBodyTestimonial(ctx, W, H, slide, asset);
    } else {
      await drawBodyExplainer(ctx, W, H, slide, asset);
    }

    return canvas.toDataURL('image/png');
  };

  /**
   * Render a single idea using a pre-computed allocation map.
   * If allocations is null, uses the legacy single-shot picker (no diversity guarantees).
   */
  const renderIdea = async (
    ideaId: string,
    allocations?: Map<string, BrandAsset | null> | null
  ): Promise<string[]> => {
    const plan = selectedPlan;
    if (!plan) return [];
    const idea = plan.ideas.find((i) => i.id === ideaId);
    if (!idea) return [];

    const slides: PostSlide[] =
      idea.slides && idea.slides.length > 0
        ? idea.slides
        : [
            {
              slide_index: 0,
              slide_type: 'cover',
              theme: idea.theme,
              headline: idea.headline,
              subhead: makeSubhead(idea),
              cta_text: CTA_DEFAULT,
            },
          ];

    const urls: string[] = [];
    for (const slide of slides) {
      const key = `${idea.id}_${slide.slide_index}`;
      const asset =
        allocations?.get(key) ??
        pickAsset(
          slide.asset_keyword
            ? ({ ...idea, headline: `${idea.headline} ${slide.asset_keyword}`, topic: slide.asset_keyword } as PostIdea)
            : idea,
          brandAssets,
          plan.brand_id
        );
      const url = await renderSlide(slide, idea, asset);
      if (url) urls.push(url);
    }
    return urls;
  };

  /** Legacy single-slide API — returns the first slide's dataUrl. */
  const renderOne = async (ideaId: string): Promise<string | null> => {
    const urls = await renderIdea(ideaId);
    return urls[0] || null;
  };

  const handleRenderBatch = async () => {
    if (!selectedPlan) return;
    const toRender = selectedPlan.ideas;
    setRenderProgress({ current: 0, total: toRender.length });
    const newImages: Record<string, string[]> = { ...renderedImages };

    // Allocate assets across ALL slides up front with the diversity constraint:
    // each asset used ≤ 2 times, no more than 5 assets reach 2 uses.
    const allocations = allocateAssets(toRender, brandAssets, selectedPlan.brand_id, {
      maxPerAsset: 2,
      maxDoubled: 5,
    });

    // Debug: log allocation stats
    const usageMap = new Map<string, number>();
    for (const asset of allocations.values()) {
      if (!asset) continue;
      usageMap.set(asset.name, (usageMap.get(asset.name) || 0) + 1);
    }
    const doubled = [...usageMap.entries()].filter(([_, n]) => n >= 2).map(([n]) => n);
    console.log(`Asset allocation: ${usageMap.size} unique assets used, ${doubled.length} used twice: [${doubled.join(', ')}]`);

    const renderedPosts: GeneratedPost[] = [];
    const updatedIdeas: PostIdea[] = [];

    for (let i = 0; i < toRender.length; i++) {
      const idea = toRender[i];
      setRenderProgress({ current: i + 1, total: toRender.length, currentHeadline: idea.headline });

      try {
        const slides: PostSlide[] =
          idea.slides && idea.slides.length > 0
            ? idea.slides
            : [
                {
                  slide_index: 0,
                  slide_type: 'cover',
                  theme: idea.theme,
                  headline: idea.headline,
                  subhead: makeSubhead(idea),
                  cta_text: CTA_DEFAULT,
                },
              ];

        const urls: string[] = [];
        const updatedSlides: PostSlide[] = [];
        for (let s = 0; s < slides.length; s++) {
          const slide = slides[s];
          const asset = allocations.get(`${idea.id}_${slide.slide_index}`) ?? null;
          const url = await renderSlide(slide, idea, asset);
          if (!url) {
            updatedSlides.push(slide);
            continue;
          }
          urls.push(url);
          const post: GeneratedPost = {
            id: `post_${Date.now()}_${i}_${s}`,
            name: `${idea.headline.slice(0, 50)} · slide ${s + 1}`,
            imageSource: url,
            history: [],
            blueprintId: `template:${slide.slide_type === 'cover' ? 'qlipper_hero' : `body_${slide.body_style || 'explainer'}`}`,
            aspectRatio: '4:5',
            createdAt: Date.now(),
          };
          renderedPosts.push(post);
          updatedSlides.push({ ...slide, rendered_post_id: post.id });
        }

        newImages[idea.id] = urls;
        updatedIdeas.push({
          ...idea,
          status: urls.length > 0 ? 'rendered' : 'failed',
          slides: updatedSlides,
          rendered_post_id: updatedSlides[0]?.rendered_post_id || idea.rendered_post_id,
        });
      } catch (e) {
        console.error('Render failed for', idea.id, e);
        updatedIdeas.push({ ...idea, status: 'failed' });
      }
    }

    onSavePostsBulk(renderedPosts);
    setRenderedImages(newImages);
    onUpdatePlan({ ...selectedPlan, ideas: updatedIdeas });
    setRenderProgress(null);
  };

  const handleReRender = async (ideaId: string) => {
    if (!selectedPlan) return;
    setRenderingIdeaId(ideaId);
    try {
      // Re-allocate across the whole plan so the re-render respects diversity.
      // We then only use the slot(s) for THIS idea.
      const allocations = allocateAssets(selectedPlan.ideas, brandAssets, selectedPlan.brand_id, {
        maxPerAsset: 2,
        maxDoubled: 5,
      });
      const urls = await renderIdea(ideaId, allocations);
      if (urls.length === 0) return;

      const idea = selectedPlan.ideas.find((i) => i.id === ideaId);
      if (!idea) return;

      const slides: PostSlide[] =
        idea.slides && idea.slides.length > 0
          ? idea.slides
          : [
              {
                slide_index: 0,
                slide_type: 'cover',
                theme: idea.theme,
                headline: idea.headline,
                subhead: makeSubhead(idea),
                cta_text: CTA_DEFAULT,
              },
            ];

      const newPosts: GeneratedPost[] = [];
      const updatedSlides: PostSlide[] = slides.map((slide, idx) => {
        const url = urls[idx];
        if (!url) return slide;
        const post: GeneratedPost = {
          id: `post_${Date.now()}_re_${idx}`,
          name: `${idea.headline.slice(0, 50)} · slide ${idx + 1}`,
          imageSource: url,
          history: [],
          blueprintId: `template:${slide.slide_type === 'cover' ? 'qlipper_hero' : `body_${slide.body_style || 'explainer'}`}`,
          aspectRatio: '4:5',
          createdAt: Date.now(),
        };
        newPosts.push(post);
        return { ...slide, rendered_post_id: post.id };
      });

      onSavePostsBulk(newPosts);
      setRenderedImages((prev) => ({ ...prev, [ideaId]: urls }));
      const updatedIdeas = selectedPlan.ideas.map((i) =>
        i.id === ideaId
          ? {
              ...i,
              status: 'rendered' as const,
              slides: updatedSlides,
              rendered_post_id: updatedSlides[0]?.rendered_post_id || i.rendered_post_id,
            }
          : i
      );
      onUpdatePlan({ ...selectedPlan, ideas: updatedIdeas });
    } catch (e) {
      console.error('Re-render failed', e);
    } finally {
      setRenderingIdeaId(null);
    }
  };

  if (plans.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold">Plan queue</h1>
        </div>
        <div className="p-10 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <Inbox size={32} className="mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-300 mb-3">No plans yet.</p>
          <p className="text-xs text-slate-500">
            Ask Claude in chat: "give me 14 post ideas for [brand] for the next 2 weeks" — they'll appear here.
          </p>
        </div>
      </div>
    );
  }

  const statusCounts = (() => {
    if (!selectedPlan) return { approved: 0, rendered: 0, published: 0, total: 0 };
    const counts = { approved: 0, rendered: 0, published: 0, total: selectedPlan.ideas.length };
    for (const i of selectedPlan.ideas) {
      if (i.status === 'approved') counts.approved++;
      if (i.status === 'rendered') counts.rendered++;
      if (i.status === 'published') counts.published++;
    }
    return counts;
  })();

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plan queue</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Approve, render, schedule.</p>
          </div>
        </div>
        <button
          onClick={handleRenderBatch}
          disabled={!!renderProgress}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-orange-500 hover:opacity-95 text-white text-sm font-black transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-900/20"
        >
          {renderProgress ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Rendering {renderProgress.current}/{renderProgress.total}…
            </>
          ) : (
            <>
              <Wand2 size={16} />
              Render batch
            </>
          )}
        </button>
      </div>

      {/* Plan picker + stats */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
        <select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          className="flex-1 max-w-xl px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.ideas.length} posts</option>
          ))}
        </select>
        {brand && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs font-bold">
            <Sparkles size={12} className="text-pink-500" />
            <span className="text-slate-600 dark:text-slate-300">{brand.name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{statusCounts.approved} approved</span>
          <span className="px-2 py-1 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400">{statusCounts.rendered} rendered</span>
          <span className="px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">{statusCounts.published} published</span>
        </div>
      </div>

      {/* Render progress */}
      {renderProgress && (
        <div className="mb-6 p-4 rounded-2xl bg-pink-500/10 border border-pink-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">
              Rendering {renderProgress.current} of {renderProgress.total}
            </span>
            <span className="text-[11px] font-mono text-pink-500/70">
              {Math.round((renderProgress.current / renderProgress.total) * 100)}%
            </span>
          </div>
          {renderProgress.currentHeadline && (
            <div className="text-sm text-slate-700 dark:text-slate-200 italic mb-2">
              "{renderProgress.currentHeadline}"
            </div>
          )}
          <div className="h-1.5 rounded-full bg-pink-500/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all duration-300"
              style={{ width: `${(renderProgress.current / renderProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Days grid */}
      <div className="space-y-6">
        {ideasByDay.map((group) => (
          <div key={group.key}>
            <div className="flex items-baseline gap-3 mb-3">
              <Calendar size={16} className="text-cyan-500" />
              <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-300">{group.day}</span>
              <span className="text-xs font-bold text-slate-500">{group.date}</span>
              <span className="text-[10px] font-mono text-slate-400">{group.ideas.length} post{group.ideas.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.ideas.map(({ idea, index }) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  index={index}
                  renderedImages={getRenderedImages(idea)}
                  isRendering={renderingIdeaId === idea.id || (!!renderProgress && renderProgress.currentHeadline === idea.headline)}
                  onReRender={handleReRender}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default PlanQueue;
