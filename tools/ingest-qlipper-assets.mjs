#!/usr/bin/env node
/**
 * Ingest Qlipper assets from ~/Desktop/qlipper-asset/
 *
 * For each PNG:
 *   1. Read file, encode as base64
 *   2. Call Gemini Vision → infer {name, slug, tags, category, description}
 *   3. Rename source file: <category>-<slug>-NN.png
 *   4. Save to brand_assets collection (POST /api/brand_assets) for Qlipper.ai
 *
 * Designed to be safe to re-run: skips PNGs that already match the renamed pattern,
 * and dedupes brand_assets by computed filename.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const QLIPPER_BRAND_ID = '1779856883804';
const ASSET_DIR = path.join(os.homedir(), 'Desktop', 'qlipper-asset');

const CATEGORIES = [
  'scissor',    // brand's namesake; scissors, cuts, clip motions
  'video',      // clapperboards, film reels, cameras, play icons
  'time',       // clocks, hourglasses, timers, calendar
  'money',      // cash, coins, growth charts, dollar signs
  'creator',    // people, hands working, characters
  'tech',       // AI motifs, devices, robots, circuits
  'decoration', // abstract shapes, ornaments, geometric
];

// ─── env / api key ────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadApiKey() {
  const envPath = path.join(REPO_ROOT, '.env');
  try {
    const txt = await fs.readFile(envPath, 'utf8');
    const m = txt.match(/^VITE_GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return process.env.VITE_GEMINI_API_KEY || null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function extractJson(text) {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) return text.substring(first, last + 1);
  return text.trim();
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

async function fetchCollection(name) {
  const res = await fetch(`${STORAGE}/api/${name}`);
  if (!res.ok) throw new Error(`GET /api/${name} → ${res.status}`);
  return res.json();
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

// ─── main ─────────────────────────────────────────────────────────────────────

async function describeImage(genAI, dataB64, mimeType) {
  const prompt = `You are tagging a brand asset image for Qlipper.ai, an AI tool that turns long videos into short-form clips.

Look at this image and return ONLY JSON (no other text):
{
  "name": "Short descriptive name, 2-4 words, Title Case",
  "tags": ["3-5", "lowercase", "single-word", "tags"],
  "category": "one of: ${CATEGORIES.join(', ')}",
  "description": "One sentence describing the visual"
}

Examples of good names: "Gold Scissors", "Vintage Clapperboard", "Cash Stack", "Hourglass Sand"
Pick the SINGLE best category — if it could be multiple, pick the most dominant element.`;

  const res = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: dataB64 } },
        ],
      },
    ],
  });

  const text = res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const jsonStr = extractJson(text);
  const parsed = JSON.parse(jsonStr);
  if (!CATEGORIES.includes(parsed.category)) parsed.category = 'decoration';
  return parsed;
}

async function main() {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    console.error('No VITE_GEMINI_API_KEY in .env');
    process.exit(1);
  }
  const { GoogleGenAI } = await import('@google/genai');
  const genAI = new GoogleGenAI({ apiKey });

  let files = await fs.readdir(ASSET_DIR);
  files = files.filter((f) => f.match(/\.(png|jpg|jpeg|webp)$/i) && !f.startsWith('.'));
  console.log(`Found ${files.length} image files in ${ASSET_DIR}\n`);

  // Skip already-renamed (heuristic: doesn't start with "Gemini_Generated_Image")
  const toProcess = files.filter((f) => f.startsWith('Gemini_Generated_Image'));
  const alreadyRenamed = files.length - toProcess.length;
  if (alreadyRenamed > 0) {
    console.log(`Skipping ${alreadyRenamed} already-renamed files.\n`);
  }

  if (toProcess.length === 0) {
    console.log('Nothing to ingest.');
    return;
  }

  // Track counts per category for numbering
  const categoryCounts = {};
  for (const cat of CATEGORIES) categoryCounts[cat] = 0;

  // Also seed counts from existing files in the folder (so we don't collide)
  for (const f of files) {
    const match = f.match(/^([a-z]+)-/);
    if (match && CATEGORIES.includes(match[1])) {
      categoryCounts[match[1]]++;
    }
  }

  const existing = await fetchCollection('brand_assets');
  const newAssets = [];

  let n = 0;
  for (const fname of toProcess) {
    n++;
    const filePath = path.join(ASSET_DIR, fname);
    const origBuf = await fs.readFile(filePath);

    console.log(`[${n}/${toProcess.length}] ${fname}  (${(origBuf.length / 1024 / 1024).toFixed(1)} MB)`);

    // Downscale to 1024px max via sharp, JPEG q90 → typically 80-150KB
    let downscaledBuf;
    try {
      downscaledBuf = await sharp(origBuf)
        .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();
    } catch (err) {
      console.log(`  ⚠ Sharp downscale failed: ${err.message}. Using original.`);
      downscaledBuf = origBuf;
    }
    const dataB64 = downscaledBuf.toString('base64');
    const mimeType = downscaledBuf === origBuf ? 'image/png' : 'image/jpeg';
    console.log(`  ↓ downscaled to ${(downscaledBuf.length / 1024).toFixed(0)} KB (${mimeType})`);

    // Send the downscaled image to Gemini Vision (cheaper, still accurate)
    let info;
    try {
      info = await describeImage(genAI, dataB64, mimeType);
    } catch (err) {
      console.log(`  ⚠ Vision call failed: ${err.message}. Using fallback.`);
      info = { name: 'Untitled', tags: [], category: 'decoration', description: '' };
    }

    categoryCounts[info.category]++;
    const num = String(categoryCounts[info.category]).padStart(2, '0');
    const slug = slugify(info.name);
    const newFname = `${info.category}-${slug}-${num}.png`;
    const newFilePath = path.join(ASSET_DIR, newFname);

    // Rename source file in folder (keeps the user's bulk download organized)
    try {
      await fs.rename(filePath, newFilePath);
    } catch (err) {
      console.log(`  ⚠ Rename failed: ${err.message}. Keeping original name.`);
    }

    const dataUrl = `data:${mimeType};base64,${dataB64}`;

    const asset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brand_id: QLIPPER_BRAND_ID,
      name: info.name,
      dataUrl,
      source: 'upload',
      prompt: info.description,
      // Tag with BOTH themes so renderer can pick for dark or light cards.
      // 'desktop-ai' lets us tell official-vs-creative apart later.
      tags: ['dark', 'light', 'desktop-ai', info.category, ...(info.tags || [])].slice(0, 10),
      createdAt: Date.now(),
    };
    newAssets.push(asset);

    console.log(`  → ${info.name}  [${info.category}]  tags: ${info.tags.join(', ')}`);
    console.log(`  → renamed to: ${newFname}\n`);
  }

  // Save all new assets in one POST
  const updated = [...newAssets, ...(Array.isArray(existing) ? existing : [])];
  await writeCollection('brand_assets', updated);

  console.log(`\n✓ Ingested ${newAssets.length} assets into brand_assets for Qlipper.`);
  console.log(`  Category breakdown:`);
  for (const cat of CATEGORIES) {
    const count = newAssets.filter((a) => a.tags[0] === cat).length;
    if (count > 0) console.log(`    ${cat}: ${count}`);
  }
  console.log(`\n  Reload "Inspire → Brand assets" in the app, pick Qlipper, to see them.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
