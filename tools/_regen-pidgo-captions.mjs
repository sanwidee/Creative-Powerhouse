#!/usr/bin/env node
/**
 * Regenerate captions for the existing Pidgo warming plan, matching the actual
 * voice observed on @pidgoapp Instagram (very short, period-heavy, "lo" address,
 * mascot-anchored, ~50-150 chars).
 *
 * Updates the plan in place — does NOT touch posts collection or rendered assets.
 *
 * Required env:
 *   PIDGO_BRAND_ID
 *   POWERHOUSE_STORAGE_URL
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
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1 && b > a) return s.substring(a, b + 1);
  return s;
}

const PIDGO_IG_VOICE_EXAMPLES = [
  'Bingung mulai darimana? Balas pertanyaan Pidgo, Web langsung dibikin',
  'Hai! 👋 Pidgo di sini.',
  'AI rewrite per elemen.',
  'Form kiri. Preview kanan. Real-time editing.',
  'Monday morning. yang lain briefing, LP lo udah jadi.',
  'Unlimited LP. Mau bikin berapa aja.',
  'Announcement! Pidgo udah live.',
];

const PIDGO_BIO_LINES = [
  'Teman AI bikin landing page. 3 menit.',
  'Multiple AI Supported',
  'Meta Pixel · TikTok · Google Tag included',
];

async function generateCaption(genAI, asset) {
  const topicTags = (asset.tags || []).filter((t) => t.startsWith('topic-')).map((t) => t.replace('topic-', ''));
  const featureTags = (asset.tags || []).filter((t) => t.startsWith('feature-'));

  const prompt = `Generate ONE Instagram caption (Bahasa Indonesia) for this Pidgoapp post.

POSTER NAME: "${asset.name}"
TOPICS: ${topicTags.join(', ') || 'general'}
FEATURES: ${featureTags.join(', ') || 'general'}

═══════════ PIDGO VOICE (matched to actual @pidgoapp Instagram) ═══════════

BIO ANCHORS:
${PIDGO_BIO_LINES.map((l) => `- "${l}"`).join('\n')}

VERBATIM EXAMPLES from existing @pidgoapp posts (replicate this exact cadence):
${PIDGO_IG_VOICE_EXAMPLES.map((l) => `- "${l}"`).join('\n')}

RULES (CRITICAL — previous batch was 4x too long):
- LENGTH: 50-150 CHARACTERS total. 1-3 short sentences max.
- RHYTHM: Period-heavy. Each phrase = own sentence. "Form kiri. Preview kanan." NOT "Form kiri, preview kanan,...".
- ADDRESS: "lo" (consistent across the caption).
- HOOK: 1 statement. Punchy. Then 1-2 supporting beats.
- MASCOT: Reference Pidgo explicitly when natural ("Pidgo bantu", "Pidgo udah live", "Balas pertanyaan Pidgo").
- EMOJI: 1 contextual emoji max (👋 ☕ 📋 🎯 ✨ 🚀 💸 ⏱️) or none. NOT decorative spam.
- NO em-dash (—).
- NO corporate fog ("empower", "leverage", "utilize", "unlock").
- NO long paragraph break (\\n\\n) — keep 1 paragraph.
- Soft CTA only or none. NO "buruan", "jangan sampai ketinggalan", hype hook.

HASHTAGS: exactly 4 tags
- 1 branded: #PidgoAI
- 1 community Indonesia: #LandingPageIndonesia | #DigitalMarketingID | #SaaSIndonesia | #SidehustleID
- 1-2 topic-specific (based on TOPICS field above)
- BANNED: any English-only generic (#ContentCreator #SmartTools)

Output JSON only:
{
  "caption": "single-line short caption following all rules above",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "topic_summary": "5-10 word topic"
}`;

  const res = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.9,
      maxOutputTokens: 4000, // gemini-2.5-flash burns lots on internal reasoning even for short JSON output
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
  const finishReason = res.candidates?.[0]?.finishReason;
  try {
    return JSON.parse(extractJson(text));
  } catch (err) {
    // Surface what Gemini actually produced for debugging
    const preview = text.slice(0, 400).replace(/\n/g, '\\n');
    throw new Error(`parse-failed (finish=${finishReason || '?'}, len=${text.length}): ${preview}`);
  }
}

async function main() {
  console.log(`Storage: ${STORAGE}, Pidgo brand: ${PIDGO_BRAND_ID}`);

  const plans = await fetchCollection('content_plans');
  const pidgoPlan = plans.find((p) => p.brand_id === PIDGO_BRAND_ID && p.id?.startsWith('plan_pidgo_warm_'));
  if (!pidgoPlan) {
    console.error('Pidgo warming plan not found');
    process.exit(1);
  }
  console.log(`Found plan ${pidgoPlan.id} with ${pidgoPlan.ideas.length} ideas\n`);

  // Map idea.rendered_post_id → asset (so we can look up asset name + tags per idea)
  const posts = await fetchCollection('posts');
  const allAssets = await fetchCollection('brand_assets');
  const assetByPostId = {};
  for (const idea of pidgoPlan.ideas) {
    const pid = idea.rendered_post_id;
    if (!pid) continue;
    const post = posts.find((p) => p.id === pid);
    if (!post) continue;
    // posts.imageSource === asset.dataUrl (we built it that way)
    const asset = allAssets.find((a) => a.brand_id === PIDGO_BRAND_ID && a.dataUrl === post.imageSource);
    if (asset) assetByPostId[pid] = asset;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey: await loadGeminiKey() });

  const failures = [];
  for (let i = 0; i < pidgoPlan.ideas.length; i++) {
    const idea = pidgoPlan.ideas[i];
    const asset = assetByPostId[idea.rendered_post_id];
    if (!asset) {
      console.log(`[${i + 1}/${pidgoPlan.ideas.length}] no asset link for ${idea.headline} — skipping`);
      continue;
    }
    process.stdout.write(`[${i + 1}/${pidgoPlan.ideas.length}] ${asset.name}... `);
    try {
      const out = await generateCaption(genAI, asset);
      const newCaption = (out.caption || '').replace(/—/g, '.').trim();
      const newHashtags = Array.isArray(out.hashtags) ? out.hashtags : [];
      idea.caption_draft = newCaption;
      idea.hashtags = newHashtags;
      idea.topic = out.topic_summary || idea.topic;
      console.log(`✓ ${newCaption.length}c`);
    } catch (err) {
      failures.push({ name: asset.name, msg: err.message });
      console.log(`✗ ${err.message}`);
    }
  }

  // Save updated plan back
  const updatedPlans = plans.map((p) => (p.id === pidgoPlan.id ? pidgoPlan : p));
  await writeCollection('content_plans', updatedPlans);
  console.log(`\n✓ Regenerated ${pidgoPlan.ideas.length - failures.length}/${pidgoPlan.ideas.length} captions`);
  if (failures.length) {
    console.log(`  ⚠ failed: ${failures.map((f) => f.name).join(', ')}`);
  }
}

main().catch((e) => {
  console.error('Fatal:', e.message || e);
  process.exit(1);
});
