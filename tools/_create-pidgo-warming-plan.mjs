#!/usr/bin/env node
/**
 * Generate a "warming" content plan for Pidgoapp using the 17 already-curated
 * posters as the visual layer + AI-generated captions in Pidgo voice.
 *
 * Output: a content_plan with N ideas, each idea = 1 single-image post.
 * Cadence: 1 post per day at 10:00 WIB (low rhythm for warming up).
 *
 * No new image generation — caption generation only via Gemini, using the
 * brand's voice_profile (signature phrases, banned phrases, target audience).
 *
 * Required env:
 *   PIDGO_BRAND_ID
 *   POWERHOUSE_STORAGE_URL (default http://76.13.197.90:3040)
 *   VITE_GEMINI_API_KEY  (read from .env)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const PIDGO_BRAND_ID = process.env.PIDGO_BRAND_ID;
if (!PIDGO_BRAND_ID) { console.error('PIDGO_BRAND_ID env var required'); process.exit(1); }

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

async function loadGeminiKey() {
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  const txt = await fs.readFile(path.join(REPO_ROOT, '.env'), 'utf8');
  const m = txt.match(/^VITE_GEMINI_API_KEY\s*=\s*(.+)$/m);
  if (!m) throw new Error('VITE_GEMINI_API_KEY not in .env');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

async function fetchCollection(name) {
  const r = await fetch(`${STORAGE}/api/${name}`);
  if (!r.ok) throw new Error(`GET /api/${name} → ${r.status}`);
  return r.json();
}

async function writeCollection(name, data) {
  const r = await fetch(`${STORAGE}/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`POST /api/${name} → ${r.status}: ${await r.text()}`);
  return r.json();
}

function extractJson(text) {
  let s = (text || '').trim();
  // Strip markdown fences if Gemini wraps the JSON
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1 && b > a) return s.substring(a, b + 1);
  return s;
}

async function generateCaption(genAI, brand, asset) {
  const topicTags = (asset.tags || []).filter((t) => t.startsWith('topic-')).map((t) => t.replace('topic-', ''));
  const featureTags = (asset.tags || []).filter((t) => t.startsWith('feature-'));

  const PIDGO_IG_EXAMPLES = [
    'Bingung mulai darimana? Balas pertanyaan Pidgo, Web langsung dibikin',
    'Hai! 👋 Pidgo di sini.',
    'AI rewrite per elemen.',
    'Form kiri. Preview kanan. Real-time editing.',
    'Monday morning. yang lain briefing, LP lo udah jadi.',
    'Unlimited LP. Mau bikin berapa aja.',
    'Announcement! Pidgo udah live.',
  ];
  const PIDGO_BIO = [
    'Teman AI bikin landing page. 3 menit.',
    'Multiple AI Supported',
    'Meta Pixel · TikTok · Google Tag included',
  ];

  const prompt = `Generate ONE Instagram caption (Bahasa Indonesia) for this Pidgoapp post.

POSTER NAME: "${asset.name}"
TOPICS: ${topicTags.join(', ') || 'general'}
FEATURES: ${featureTags.join(', ') || 'general'}

═══════════ PIDGO VOICE (matched to actual @pidgoapp Instagram) ═══════════

BIO ANCHORS:
${PIDGO_BIO.map((l) => `- "${l}"`).join('\n')}

VERBATIM EXAMPLES from existing @pidgoapp posts (replicate exact cadence):
${PIDGO_IG_EXAMPLES.map((l) => `- "${l}"`).join('\n')}

RULES (CRITICAL):
- LENGTH: 50-150 CHARACTERS total. 1-3 short sentences max.
- RHYTHM: Period-heavy. Each phrase own sentence. "Form kiri. Preview kanan." NOT "Form kiri, preview kanan,..."
- ADDRESS: "lo" (consistent).
- HOOK: 1 statement. Punchy. Then 1-2 supporting beats.
- MASCOT: Reference Pidgo explicitly when natural ("Pidgo bantu", "Pidgo udah live", "Balas pertanyaan Pidgo").
- EMOJI: 1 contextual max (👋 ☕ 📋 🎯 ✨ 🚀 💸 ⏱️) or none. NOT decorative spam.
- NO em-dash (—).
- NO corporate fog ("empower", "leverage", "utilize", "unlock").
- NO long paragraph break — keep 1 paragraph.
- Soft CTA only or none. NO "buruan", "jangan sampai".

HASHTAGS: exactly 4 tags
- 1 branded: #PidgoAI
- 1 community Indonesia: #LandingPageIndonesia | #DigitalMarketingID | #SaaSIndonesia | #SidehustleID
- 1-2 topic-specific (based on TOPICS above)

Output JSON:
{
  "caption": "single-line short caption following all rules",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "topic_summary": "5-10 word topic"
}`;

  const res = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.9,
      maxOutputTokens: 4000, // gemini-2.5-flash uses internal reasoning tokens; need plenty of budget
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          topic_summary: { type: 'string' },
        },
        required: ['caption', 'hashtags', 'topic_summary'],
      },
    },
  });

  const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(extractJson(text));
}

async function main() {
  console.log(`Storage: ${STORAGE}, Pidgo brand: ${PIDGO_BRAND_ID}`);

  const brands = await fetchCollection('brands');
  const pidgoBrand = brands.find((b) => b.id === PIDGO_BRAND_ID);
  if (!pidgoBrand) throw new Error('Pidgo brand not found in brands collection');

  const allAssets = await fetchCollection('brand_assets');
  // Use real Pidgo assets (tagged 'pidgo-real'), skip story (9:16) and individual carousel slides
  const pidgoAssets = allAssets.filter((a) =>
    a.brand_id === PIDGO_BRAND_ID
    && a.tags?.includes('pidgo-real')
    && !a.tags.includes('aspect-9-16')        // skip Story (9:16) — different format
    && !a.tags.includes('carousel-slide')     // skip carousel slides — designed as multi-slide unit
  );
  console.log(`Found ${pidgoAssets.length} real Pidgo single-image posters\n`);

  // Topic-alternated sequence so feed feels balanced
  // Pidgo topics: speed (3menit), anti-subscription, pricing (harga), pixel (Meta Pixel feature), feature-* (ai-revision/all-in-one/chat-creation), pain-point hook
  const buckets = {
    speed: [], antisub: [], pricing: [], pixel: [], feature: [], hook: [], other: [],
  };
  for (const a of pidgoAssets) {
    const t = a.tags || [];
    if (t.includes('topic-speed')) buckets.speed.push(a);
    else if (t.includes('topic-anti-subscription')) buckets.antisub.push(a);
    else if (t.includes('topic-pricing')) buckets.pricing.push(a);
    else if (t.includes('topic-feature-pixel')) buckets.pixel.push(a);
    else if (t.includes('topic-feature')) buckets.feature.push(a);
    else if (t.includes('hook-style') || t.includes('pain-point')) buckets.hook.push(a);
    else buckets.other.push(a);
  }
  // Rhythm: speed → antisub → pixel → feature → pricing → hook → repeat
  const order = ['speed', 'antisub', 'pixel', 'feature', 'pricing', 'hook'];
  const sequence = [];
  let safety = 0;
  while (sequence.length < pidgoAssets.length && safety < 100) {
    let advanced = false;
    for (const k of order) {
      if (buckets[k].length > 0) {
        sequence.push(buckets[k].shift());
        advanced = true;
        if (sequence.length >= pidgoAssets.length) break;
      }
    }
    if (!advanced) break;
    safety++;
  }
  for (const k of Object.keys(buckets)) sequence.push(...buckets[k]);

  // Generate captions
  const { GoogleGenAI } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey: await loadGeminiKey() });

  const generatedIdeas = [];
  // Schedule: 1 post per day at 10:00 WIB (03:00 UTC), starting tomorrow
  const TOMORROW_10_WIB_UTC = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(3, 0, 0, 0); // 10:00 WIB = 03:00 UTC
    return d.getTime();
  })();
  const DAY_MS = 86400 * 1000;

  // We'll also create a GeneratedPost per asset (so /public/post/<id>.png serves the asset)
  const allPosts = await fetchCollection('posts');
  const newPosts = [];

  for (let i = 0; i < sequence.length; i++) {
    const asset = sequence[i];
    console.log(`[${i + 1}/${sequence.length}] generating caption for "${asset.name}"...`);
    let caption, hashtags, topic;
    try {
      const out = await generateCaption(genAI, pidgoBrand, asset);
      caption = (out.caption || '').replace(/—/g, '.').trim();
      hashtags = Array.isArray(out.hashtags) ? out.hashtags : [];
      topic = out.topic_summary || asset.name;
    } catch (err) {
      console.log(`  ⚠ caption failed: ${err.message}. Using fallback.`);
      caption = `${asset.name}.\n\n${pidgoBrand.voice_profile?.tagline || ''}`;
      hashtags = ['#PidgoAI', '#LandingPageIndonesia'];
      topic = asset.name;
    }

    // Create a GeneratedPost wrapping the asset (so cron's image endpoint serves it)
    const postId = `post_pidgo_warm_${Date.now()}_${i}`;
    newPosts.push({
      id: postId,
      name: `Pidgo · ${asset.name}`,
      imageSource: asset.dataUrl,
      history: [],
      blueprintId: 'pidgo:curated-poster',
      aspectRatio: '1:1',
      createdAt: Date.now(),
    });

    const scheduledAt = TOMORROW_10_WIB_UTC + i * DAY_MS;
    generatedIdeas.push({
      id: `idea_pidgo_warm_${Date.now()}_${i}`,
      topic,
      headline: asset.name,
      format: 'cta',
      theme: 'dark',
      caption_draft: caption,
      hashtags,
      scheduled_at: scheduledAt,
      scheduled_at_iso: new Date(scheduledAt).toISOString(),
      target_platforms: ['instagram'],
      status: 'scheduled',
      slides: [{
        slide_index: 0,
        slide_type: 'cover',
        theme: 'dark',
        rendered_post_id: postId,
      }],
      rendered_post_id: postId,
    });
  }

  // Save posts (bulk)
  await writeCollection('posts', [...newPosts, ...allPosts]);
  console.log(`\nSaved ${newPosts.length} new GeneratedPost wrappers for Pidgo assets.`);

  // Save content_plan
  const plans = await fetchCollection('content_plans');
  const startDate = new Date(generatedIdeas[0].scheduled_at);
  const endDate = new Date(generatedIdeas[generatedIdeas.length - 1].scheduled_at);
  const idFmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' });

  const newPlan = {
    id: `plan_pidgo_warm_${Date.now()}`,
    name: `Pidgoapp · warming ${idFmt(startDate)} – ${idFmt(endDate)} · ${generatedIdeas.length} posts`,
    brief: `Warming up @pidgoapp with ${generatedIdeas.length} curated posters, 1/day at 10am WIB. Topic-alternated, Bahasa captions generated per asset using Pidgo voice.`,
    brand_id: PIDGO_BRAND_ID,
    schedule: {
      posts_per_day: 1,
      days: generatedIdeas.length,
      start_utc: TOMORROW_10_WIB_UTC,
      timezone: 'Asia/Jakarta',
      slots_wib: ['10:00'],
    },
    ideas: generatedIdeas,
    createdAt: Date.now(),
  };

  await writeCollection('content_plans', [newPlan, ...plans]);
  console.log(`\n✓ Saved plan ${newPlan.id}`);
  console.log(`  Name: ${newPlan.name}`);
  console.log(`  First: ${generatedIdeas[0].scheduled_at_iso}  ${generatedIdeas[0].headline}`);
  console.log(`  Last:  ${generatedIdeas[generatedIdeas.length-1].scheduled_at_iso}  ${generatedIdeas[generatedIdeas.length-1].headline}`);
  console.log(`\n  Status: scheduled — but won't publish until a social_accounts entry exists for Pidgo brand.`);
}

main().catch((e) => {
  console.error('Fatal:', e.message || e);
  process.exit(1);
});
