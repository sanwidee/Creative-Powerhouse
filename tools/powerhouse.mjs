#!/usr/bin/env node
/**
 * powerhouse.mjs — CLI for Creative Powerhouse
 *
 * Drives the same data store and AI APIs that the web UI uses, so Claude (or you)
 * can ask for content via chat / shell and have it land in the app.
 *
 * Storage API:  http://localhost:3001/api/<collection>
 * AI:           Gemini via @google/genai (API key from .env VITE_GEMINI_API_KEY
 *               or localStorage IKHSAN_LAB_KEY isn't accessible from Node)
 *
 * Usage:
 *   node tools/powerhouse.mjs help
 *   node tools/powerhouse.mjs list <collection>
 *   node tools/powerhouse.mjs get-brand <id-or-name>
 *   node tools/powerhouse.mjs plan-ideas --brief "..." --count N [--brand <id>]
 *   node tools/powerhouse.mjs gen-asset --brand <id> --name "..." --brief "..." [--dry-run]
 *
 * Collections you can list:
 *   references, brands, brand_assets, posts, carousels, characters,
 *   character_poses, audio_voices, presets, feed_previews, usage_logs
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';

// ─── env / api key ────────────────────────────────────────────────────────────

async function loadApiKey() {
  const envPath = path.join(ROOT, '.env');
  try {
    const txt = await fs.readFile(envPath, 'utf8');
    const match = txt.match(/^VITE_GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || null;
}

// ─── arg parser ───────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args.flags[key] = next;
        i += 2;
      } else {
        args.flags[key] = true;
        i += 1;
      }
    } else {
      args._.push(a);
      i += 1;
    }
  }
  return args;
}

// ─── storage helpers ──────────────────────────────────────────────────────────

async function fetchCollection(name) {
  const res = await fetch(`${STORAGE}/api/${name}`);
  if (!res.ok) throw new Error(`GET /api/${name} → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function writeCollection(name, data) {
  const res = await fetch(`${STORAGE}/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST /api/${name} → ${res.status}`);
  return res.json();
}

// ─── gemini helpers (lazy import to keep CLI light) ───────────────────────────

async function getGenAI() {
  const key = await loadApiKey();
  if (!key) {
    throw new Error(
      'No Gemini API key found. Add VITE_GEMINI_API_KEY to .env or export GEMINI_API_KEY.'
    );
  }
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey: key });
}

function extractJson(text) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return text.substring(first, last + 1);
  }
  return text.trim();
}

function extractJsonArray(text) {
  const first = text.indexOf('[');
  const last = text.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) {
    return text.substring(first, last + 1);
  }
  return text.trim();
}

// ─── humanizer prompt fragment (applied to all generated copy) ────────────────
const HUMANIZER_RULES = `
WRITING RULES (strict):
- No em-dashes (—) or en-dashes (–) in any output. Use periods or commas.
- Never use these AI-tells: "delve", "leverage", "utilize", "unlock", "harness", "robust", "seamless", "in today's fast-paced world", "in the realm of", "navigate the landscape of".
- Use contractions: "you're", "it's", "don't".
- Vary sentence length — mix short punches with longer thoughts.
- Sound like a real human writing to one specific person, not a corporate broadcast.
- No "Pro tip:", "TL;DR:", or buzzword openings.
- Specific over generic. Concrete examples over abstractions.
`;

// ─── commands ─────────────────────────────────────────────────────────────────

async function cmdList(args) {
  const coll = args._[1];
  if (!coll) {
    console.error('Usage: list <collection>');
    process.exit(1);
  }
  const data = await fetchCollection(coll);
  if (args.flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log(`\n${coll} (${data.length}):\n`);
  for (const item of data) {
    const id = item.id || '(no-id)';
    const name = item.name || item.title || '';
    const extra = item.brand_id ? ` brand=${item.brand_id}` : '';
    console.log(`  • ${id}  ${name}${extra}`);
  }
  console.log('');
}

async function cmdGetBrand(args) {
  const query = args._[1];
  if (!query) {
    console.error('Usage: get-brand <id-or-name-substring>');
    process.exit(1);
  }
  const brands = await fetchCollection('brands');
  const match = brands.find(
    (b) => b.id === query || (b.name && b.name.toLowerCase().includes(query.toLowerCase()))
  );
  if (!match) {
    console.error(`No brand matching "${query}"`);
    process.exit(1);
  }
  const assets = (await fetchCollection('brand_assets')).filter((a) => a.brand_id === match.id);
  const summary = {
    id: match.id,
    name: match.name,
    dna: match.dna,
    guidelines: match.guidelines || null,
    assets: assets.map((a) => ({ id: a.id, name: a.name, tags: a.tags, source: a.source })),
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function cmdPlanIdeas(args) {
  const brief = args.flags.brief;
  const count = parseInt(args.flags.count || '10', 10);
  const brandId = args.flags.brand;

  if (!brief) {
    console.error('Usage: plan-ideas --brief "..." [--count N] [--brand <id>]');
    process.exit(1);
  }

  let brandContext = '';
  if (brandId) {
    const brands = await fetchCollection('brands');
    const brand = brands.find((b) => b.id === brandId || b.name === brandId);
    if (brand) {
      brandContext = `\n\nBrand context:\n- Name: ${brand.name}\n- Vibe: ${brand.dna?.brand_vibe || 'n/a'}\n- Voice notes: ${brand.dna?.typography_notes || 'n/a'}\n- Forbidden: ${(brand.dna?.forbidden_styles || []).join(', ') || 'none'}\n- Guidelines: ${brand.guidelines || 'none'}`;
    }
  }

  const ai = await getGenAI();
  const prompt = `Plan ${count} social-media post ideas for the following brief.

Brief: ${brief}${brandContext}

${HUMANIZER_RULES}

Output ONLY a JSON array. Each item:
{
  "topic": "what this post is about (5-10 words)",
  "headline": "the punchy line that goes on the post (under 80 chars)",
  "format": "quote" | "stat" | "listicle" | "hook" | "carousel" | "cta",
  "caption_draft": "the IG/TT caption — 2-4 short paragraphs, humanized, no emoji unless natural",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}

Make ideas distinct from each other — different angles, formats, voices.`;

  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonText = extractJsonArray(text);
  let ideas;
  try {
    ideas = JSON.parse(jsonText);
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON.');
    console.error('Raw output:\n', text);
    process.exit(1);
  }

  if (args.flags.save) {
    const plans = await fetchCollection('content_plans');
    const plan = {
      id: `plan_${Date.now()}`,
      name: brief.slice(0, 60),
      brief,
      brand_id: brandId || null,
      ideas,
      createdAt: Date.now(),
    };
    await writeCollection('content_plans', [plan, ...plans]);
    console.log(`Saved plan ${plan.id} with ${ideas.length} ideas.`);
  }

  console.log(JSON.stringify(ideas, null, 2));
}

async function cmdGenAsset(args) {
  const brandId = args.flags.brand;
  const brief = args.flags.brief;
  const name = args.flags.name || 'Generated asset';
  const isDryRun = !!args.flags['dry-run'];

  if (!brandId || !brief) {
    console.error('Usage: gen-asset --brand <id> --name "..." --brief "..." [--dry-run]');
    process.exit(1);
  }

  const brands = await fetchCollection('brands');
  const brand = brands.find((b) => b.id === brandId || b.name === brandId);
  if (!brand) {
    console.error(`Brand not found: ${brandId}`);
    process.exit(1);
  }

  // Gather context so the new asset doesn't duplicate existing ones
  const existingAssets = (await fetchCollection('brand_assets')).filter((a) => a.brand_id === brand.id);
  const existingDescriptions = existingAssets.map((a) => `- ${a.name} [${a.tags.join(', ')}]`).join('\n') || '(none)';

  const fullPrompt = `Generate a single graphic asset for the brand "${brand.name}".

Brand DNA:
- Vibe: ${brand.dna?.brand_vibe || 'n/a'}
- Primary colors: ${(brand.dna?.primary_colors || []).join(', ') || 'n/a'}
- Forbidden styles: ${(brand.dna?.forbidden_styles || []).join(', ') || 'none'}
- Guidelines: ${brand.guidelines || 'none'}

Existing assets for this brand (avoid duplicating these visually):
${existingDescriptions}

What to generate:
${brief}

Output a single PNG image, transparent background, centered, no text in the image, no logo overlays.`;

  console.log(`Generating asset for brand "${brand.name}"…`);
  if (isDryRun) {
    console.log('\n--- Dry run: prompt only ---\n');
    console.log(fullPrompt);
    return;
  }

  const ai = await getGenAI();
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    config: { responseModalities: ['IMAGE'] },
  });

  const parts = res.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) {
    console.error('Gemini returned no image. Response parts:');
    console.error(JSON.stringify(parts, null, 2));
    process.exit(1);
  }

  const dataUrl = `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;

  const asset = {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brand_id: brand.id,
    name,
    dataUrl,
    source: 'gemini-gen',
    prompt: brief,
    tags: [],
    createdAt: Date.now(),
  };

  const all = await fetchCollection('brand_assets');
  await writeCollection('brand_assets', [asset, ...all]);

  console.log(`Saved asset ${asset.id} → brand "${brand.name}" (${name}).`);
  console.log(`Refresh Inspire → Brand assets in the app to see it.`);
}

function cmdHelp() {
  console.log(`
Creative Powerhouse — CLI

Usage:
  node tools/powerhouse.mjs <command> [args]

Commands:
  list <collection>                                List items in a collection
                                                   (brands, brand_assets, references,
                                                    posts, carousels, characters, ...)
                                                   Add --json for full output.

  get-brand <id-or-name>                           Print a brand + its assets as JSON.

  plan-ideas --brief "..." [--count N]             Generate N post ideas via Gemini.
             [--brand <id>] [--save]               Pass --save to persist as a
                                                   content_plan collection entry.

  gen-asset --brand <id> --name "..."              Generate a brand asset image and
            --brief "..." [--dry-run]              save it to the brand_assets collection.

  help                                             Show this message.

Env:
  POWERHOUSE_STORAGE_URL    Default: http://localhost:3001
  VITE_GEMINI_API_KEY       Read from .env at repo root.

Tips:
  - Make sure the dev servers are running (npm run dev) before using this.
  - The web app will pick up changes you write here on its next collection refresh
    (reload the page or revisit the relevant screen).
`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0] || 'help';

try {
  switch (cmd) {
    case 'list': await cmdList(args); break;
    case 'get-brand': await cmdGetBrand(args); break;
    case 'plan-ideas': await cmdPlanIdeas(args); break;
    case 'gen-asset': await cmdGenAsset(args); break;
    case 'help':
    case '--help':
    case '-h':
      cmdHelp(); break;
    default:
      console.error(`Unknown command: ${cmd}`);
      cmdHelp();
      process.exit(1);
  }
} catch (err) {
  console.error('Error:', err.message || err);
  process.exit(1);
}
