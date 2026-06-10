#!/usr/bin/env node
/**
 * Re-prompt Gemini per idea in Pidgo warming plan to produce STRUCTURED slide copy:
 *   { headline (2-5 word hook), subhead (8-15 word supporting), cta_text (2-3 word) }
 *
 * Writes these into slides[0].headline / subhead / cta_text so PlanQueue's
 * drawCover() composites them as overlay on the mascot.
 *
 * Keeps existing caption_draft + hashtags as-is (IG body).
 *
 * Required env:
 *   PIDGO_BRAND_ID
 *   POWERHOUSE_STORAGE_URL
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'https://powerhouse.weedlabs.online';
const PIDGO_BRAND_ID = process.env.PIDGO_BRAND_ID;
if (!PIDGO_BRAND_ID) { console.error('PIDGO_BRAND_ID required'); process.exit(1); }

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

async function generateSlideCopy(genAI, asset, caption) {
  const topicTags = (asset.tags || []).filter((t) => t.startsWith('topic-')).map((t) => t.replace('topic-', ''));
  const poseTag = (asset.tags || []).find((t) => t.startsWith('pose-'))?.replace('pose-', '') || '';

  const prompt = `Generate STRUCTURED slide copy for ONE Pidgoapp Instagram post.
This copy will be drawn AS TEXT OVERLAY on a poster image, NOT used as IG caption.
The IG caption already exists separately.

POSTER NAME: "${asset.name}"
MASCOT POSE: ${poseTag}
TOPICS: ${topicTags.join(', ') || 'general'}
EXISTING IG CAPTION (for context, do not copy verbatim): "${caption}"

═══════════ PIDGO BRAND ═══════════
- Product: AI yang bantu bikin landing page dalam 3 menit
- Tagline: "Bikin LP 3 menit. Pixel langsung masuk."
- Address user: "lo"
- Vibe: friendly, mascot-led (penguin), Indonesian SaaS

═══════════ OUTPUT STRUCTURE ═══════════

headline (REQUIRED): 2-5 word punchy hook. Sentence case OK, no period.
  Examples: "Form kiri, preview kanan", "3 menit. Selesai.", "Lo balas, Pidgo bikin", "Stop coding manual"
  ❌ Avoid: full sentences, period-heavy, generic phrases like "Coba sekarang"

subhead (REQUIRED): 8-15 word supporting line. ONE sentence with period optional.
  Examples: "AI rewrite per elemen, multiple AI supported", "Drag, drop, deploy. Pixel Meta TikTok Google langsung kepasang"
  ❌ Avoid: paragraph, dual-clause >15 words

cta_text (REQUIRED): 2-3 word action. Will render as pill button.
  Use one of: "Coba Pidgo sekarang" | "Bikin sekarang" | "Mulai gratis" | "Lihat demo" | "Coba 3 menit"
  Pick the one that fits the slide topic.

RULES (CRITICAL):
- NO em-dash (—)
- NO corporate fog ("empower", "leverage", "utilize")
- NO emoji in headline/subhead/cta_text (overlay text, not chat)
- Headline must be readable at glance — Indonesian primary language
- Tone matches the mascot pose (e.g. "thinking" pose → educational hook; "celebrating" → milestone; "money-coins" → pricing/value)

Output JSON only:
{
  "headline": "...",
  "subhead": "...",
  "cta_text": "..."
}`;

  const res = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.9,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          subhead: { type: 'string' },
          cta_text: { type: 'string' },
        },
        required: ['headline', 'subhead', 'cta_text'],
      },
    },
  });

  const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(text.trim());
}

async function main() {
  console.log(`Storage: ${STORAGE}, brand: ${PIDGO_BRAND_ID}`);

  const plans = await fetchCollection('content_plans');
  const plan = plans.find((p) => p.brand_id === PIDGO_BRAND_ID && /^plan_pidgo_warm_/.test(p.id));
  if (!plan) { console.error('Plan not found'); process.exit(1); }
  console.log(`Plan: ${plan.id} | ${plan.ideas.length} ideas\n`);

  const allAssets = await fetchCollection('brand_assets');
  const posts = await fetchCollection('posts');

  // Map idea → asset via the wrapper post
  const assetByIdea = {};
  for (const idea of plan.ideas) {
    const post = posts.find((p) => p.id === idea.rendered_post_id);
    if (!post) continue;
    const asset = allAssets.find((a) => a.brand_id === PIDGO_BRAND_ID && a.dataUrl === post.imageSource);
    if (asset) assetByIdea[idea.id] = asset;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey: await loadGeminiKey() });

  let ok = 0, fail = 0;
  for (let i = 0; i < plan.ideas.length; i++) {
    const idea = plan.ideas[i];
    const asset = assetByIdea[idea.id];
    if (!asset) { console.log(`[${i+1}] ${idea.headline} — no asset link, skip`); fail++; continue; }
    process.stdout.write(`[${i+1}/${plan.ideas.length}] ${asset.name}... `);
    try {
      const copy = await generateSlideCopy(genAI, asset, idea.caption_draft || '');
      // Clean em-dashes if Gemini sneaks one in
      const clean = (s) => (s || '').replace(/—/g, '.').trim();
      const headline = clean(copy.headline);
      const subhead = clean(copy.subhead);
      const cta_text = clean(copy.cta_text);

      // Populate slide[0] (cover) with overlay text. Idea keeps its other fields.
      const slide0 = idea.slides?.[0] || { slide_index: 0, slide_type: 'cover', theme: 'dark' };
      slide0.headline = headline;
      slide0.subhead = subhead;
      slide0.cta_text = cta_text;
      // Alternate dark/light by index for feed rhythm
      slide0.theme = i % 2 === 0 ? 'dark' : 'light';
      idea.slides = [slide0];

      // Also surface on idea itself for queue card preview
      idea.headline = headline;
      idea.subhead = subhead;
      idea.cta_text = cta_text;
      idea.theme = slide0.theme;

      console.log(`✓ "${headline}" / "${subhead.slice(0, 30)}..." / [${cta_text}]`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }
  }

  // Save plan
  const updatedPlans = plans.map((p) => (p.id === plan.id ? plan : p));
  await writeCollection('content_plans', updatedPlans);
  console.log(`\n✓ Slide copy regenerated ${ok}/${plan.ideas.length}. Failed: ${fail}`);
}

main().catch((e) => { console.error('Fatal:', e.message || e); process.exit(1); });
