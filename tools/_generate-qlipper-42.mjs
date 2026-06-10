#!/usr/bin/env node
/**
 * Generate 42 Qlipper.ai carousel ideas (3/day × 14 days) and save to content_plans.
 * Each idea is a 2-slide carousel: cover + body (explainer | bullets | stat).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const BRAND_ID = '1779856883804';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

async function loadApiKey() {
  const envPath = path.join(REPO_ROOT, '.env');
  try {
    const txt = await fs.readFile(envPath, 'utf8');
    const m = txt.match(/^VITE_GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return process.env.VITE_GEMINI_API_KEY || null;
}

function extractJsonArray(text) {
  const first = text.indexOf('[');
  const last = text.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) return text.substring(first, last + 1);
  return text.trim();
}

const PROMPT = `Generate 42 social media CAROUSEL post ideas for Qlipper.ai (AI tool that auto-clips long videos into short-form for Indonesian creators).

CADENCE: 3 posts per day × 14 days starting tomorrow. Time slots: 09:00 WIB (morning), 13:00 WIB (lunch), 19:00 WIB (evening).

LANGUAGE — STRICT: ALL Bahasa Indonesia, casual conversational, NOT formal/baku. English ONLY for: product name (Qlipper.ai), unavoidable tech terms (AI, FYP, short-form, Reels, YouTube Shorts), or rare code-switch for impact (max 1-2 per caption).

VOICE: Smart friend talking. Confident, playful, direct. Never corporate. Use "gak", "kan", "kamu", "udah", "sih", "deh", natural Indonesian internet speech.

THEME ROTATION: Alternate dark and light themes. Idea #1 (Day 1, 09:00) MUST be dark. Each idea uses ONE theme for both its slides.

FORMAT: Every idea is a 2-SLIDE CAROUSEL:
  Slide 1 = COVER (punchy headline + subhead + CTA, asset centered)
  Slide 2 = BODY in ONE of three styles:
    - explainer: large body text explaining the WHY/HOW (2-3 sentences, substantive)
    - bullets: 3 short bullet points
    - stat: huge number + supporting label + 1-sentence context

DISTRIBUTE BODY STYLES EVENLY: 14 explainer + 14 bullets + 14 stat across the 42 ideas (mix them up).

HEADLINE RULES (CRITICAL — previous attempts were too long):
- MAX 30 characters. Ideally 15-25. Like a billboard.
- 2-7 words max. NO long sentences.
- Examples of good: "50 klip sehari, gak masalah.", "Qlipper v2.0", "Bye-bye editing manual.", "Konten viral, 5 menit doang."
- BAD examples (do NOT do this): "Ngedit cuplikan berjam-jam itu buang-buang hidup, kan?" (way too long)

HASHTAG RULES:
- 4-6 tags per post, Bahasa-led
- Use REAL community tags Indonesians actually search: #QlipperAI, #KreatorKontenIndonesia, #EditorIndonesia, #FYPIndonesia, #ReelsIndonesia, #YouTubeShortsID, #KlipPodcast, #KlipGaming, #ShortFormIndonesia, #KomunitasKreatorID, #TikTokIndonesia
- BANNED: #Automasi, #WaktuBerharga, #DreamBig, #ContentCreator, #SmartWork, #BalanceIsKey

TOPICS — vary across the 42:
editing burnout, time savings, money/budget savings, viral algorithm, podcast clipping pain, gaming clip pain, podcaster workflow, beginner-friendly AI, brand audience growth, FYP-ready content, automation power, ROI of short-form, content repurposing, audience attention spans, future of content, AI fear/hesitation, simplicity wins, mass production, energy/burnout prevention, creator multitasking, niche-specific use cases, testimonial-style, before-after, comparison with manual editing, monetization, viral hooks, cuplikan otomatis, edukator use case.

OUTPUT: A JSON ARRAY of 42 items. Each item has this exact shape:

{
  "topic": "5-10 word topic description",
  "headline": "≤30 char cover headline",
  "format": "hook" | "stat" | "cta" | "listicle" | "quote" | "carousel",
  "theme": "dark" | "light",
  "caption_draft": "Full IG caption, 3-4 short Bahasa paragraphs, humanized — no em-dashes, no AI-tells like 'delve/leverage/utilize'",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
  "slides": [
    {
      "slide_index": 0,
      "slide_type": "cover",
      "theme": "<same theme>",
      "headline": "<same as top headline, ≤30 chars>",
      "subhead": "1-2 line subhead, 60-120 chars, Bahasa, adds context",
      "cta_text": "Coba Qlipper sekarang"
    },
    {
      "slide_index": 1,
      "slide_type": "body",
      "theme": "<same>",
      "body_style": "explainer" | "bullets" | "stat",
      "body_label": "1-2 word UPPERCASE label, e.g. INSIGHT, FAKTA, CARANYA, 3 LANGKAH",
      "body_heading": "2-6 word punchy heading",
      "body_text": "Required for explainer + stat: 2-3 sentence Bahasa text. For bullets, can be empty or single sentence.",
      "body_bullets": ["only for bullets style: 3 bullets, each ≤8 Bahasa words"],
      "body_stat": "only for stat style: the big number e.g. '80%' or '5 jam' or '10x'",
      "body_stat_label": "only for stat style: 4-8 word context for the stat",
      "cta_text": "Coba Qlipper sekarang"
    }
  ]
}

Return ONLY the JSON array. No prefix, no markdown fence, no explanation.`;

async function main() {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error('No VITE_GEMINI_API_KEY in .env');
    process.exit(1);
  }

  const { GoogleGenAI } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey });

  console.log('Calling Gemini for 42 carousel ideas... (~30-60s)\n');
  const start = Date.now();

  const res = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
    config: { temperature: 0.85, maxOutputTokens: 32000 },
  });

  const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log(`Got response in ${((Date.now() - start) / 1000).toFixed(1)}s (${text.length} chars)`);

  const jsonStr = extractJsonArray(text);
  let ideas;
  try {
    ideas = JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to parse JSON. Raw output saved to /tmp/qlipper-42-raw.txt');
    await fs.writeFile('/tmp/qlipper-42-raw.txt', text);
    process.exit(1);
  }

  if (!Array.isArray(ideas) || ideas.length === 0) {
    console.error('Expected non-empty array, got:', typeof ideas);
    process.exit(1);
  }

  console.log(`Parsed ${ideas.length} ideas.\n`);

  // Schedule: 3 posts/day × 14 days starting tomorrow.
  // Slots in Jakarta (WIB = UTC+7): 09:00, 13:00, 19:00 → UTC 02:00, 06:00, 12:00.
  const TOMORROW_UTC = Date.parse('2026-05-28T02:00:00Z');
  const SLOT_OFFSETS_MS = [0, 4 * 3600 * 1000, 10 * 3600 * 1000];
  const DAY_MS = 86400 * 1000;

  // Distribute ideas: cap at 42 ideas → 3/day × 14 days
  const capped = ideas.slice(0, 42);
  const scheduled = capped.map((idea, i) => {
    const dayIdx = Math.floor(i / 3);
    const slotIdx = i % 3;
    const ts = TOMORROW_UTC + dayIdx * DAY_MS + SLOT_OFFSETS_MS[slotIdx];
    return {
      ...idea,
      id: `idea_${Date.now()}_${i}`,
      scheduled_at: ts,
      scheduled_at_iso: new Date(ts).toISOString(),
      target_platforms: ['instagram', 'tiktok'],
      status: 'approved',
    };
  });

  // Quality check: headline lengths
  const tooLong = scheduled.filter((i) => i.headline.length > 35);
  if (tooLong.length > 0) {
    console.log(`⚠ ${tooLong.length} headlines over 35 chars (target ≤30):`);
    for (const i of tooLong.slice(0, 5)) console.log(`  ${i.headline.length}: "${i.headline}"`);
  }

  // Body style distribution
  const styleCount = { explainer: 0, bullets: 0, stat: 0 };
  for (const idea of scheduled) {
    const body = (idea.slides || []).find((s) => s.slide_type === 'body');
    if (body?.body_style && styleCount[body.body_style] !== undefined) styleCount[body.body_style]++;
  }
  console.log('\nBody style distribution:', styleCount);
  console.log(`Theme: ${scheduled.filter((i) => i.theme === 'dark').length} dark / ${scheduled.filter((i) => i.theme === 'light').length} light`);

  const plan = {
    id: `plan_${Date.now()}`,
    name: 'Qlipper.ai · 14-day carousel run · 42 posts',
    brief: '14 days × 3 posts/day, 2-slide carousels (cover + body), Bahasa Indonesia, mix dark/light themes, mix explainer/bullets/stat body styles.',
    brand_id: BRAND_ID,
    schedule: {
      posts_per_day: 3,
      days: 14,
      start_utc: TOMORROW_UTC,
      timezone: 'Asia/Jakarta',
      slots_wib: ['09:00', '13:00', '19:00'],
    },
    ideas: scheduled,
    createdAt: Date.now(),
  };

  const existing = await fetch(`${STORAGE}/api/content_plans`).then((r) => r.json()).catch(() => []);
  const updated = [plan, ...(Array.isArray(existing) ? existing : [])];

  const saveRes = await fetch(`${STORAGE}/api/content_plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });
  if (!saveRes.ok) {
    console.error('Save failed:', saveRes.status, await saveRes.text());
    process.exit(1);
  }

  console.log(`\n✓ Saved plan: ${plan.id}`);
  console.log(`  Name: ${plan.name}`);
  console.log(`  Ideas: ${scheduled.length} (×2 slides = ${scheduled.length * 2} renders)`);
  console.log(`  First scheduled: ${new Date(scheduled[0].scheduled_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB`);
  console.log(`  Last scheduled:  ${new Date(scheduled[scheduled.length - 1].scheduled_at).toLocaleString('en-US', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' })} WIB`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
