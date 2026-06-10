#!/usr/bin/env node
/**
 * Regenerate the 28 Desktop AI brand assets using OpenAI gpt-image-2 with
 * native transparent background support.
 *
 * For each desktop-ai brand asset:
 *   1. Build a Qlipper-aesthetic prompt from name + tags.
 *   2. POST https://api.openai.com/v1/images/generations
 *      model=gpt-image-2, background=transparent, output_format=png, quality=medium.
 *   3. Decode the returned b64_json → replace asset.dataUrl.
 *   4. Save back to brand_assets via storage API in one bulk POST at the end.
 *
 * Cost estimate: ~$0.07 per medium-quality 1024x1024 image × 28 ≈ $2.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const MODEL = 'gpt-image-1';
const SIZE = '1024x1024';
const QUALITY = 'medium';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '3', 10);
const RETRIES = 3;
const ONLY_MISSING = process.env.ONLY_MISSING === '1';      // skip already openai-regen-tagged
const PACE_MS = parseInt(process.env.PACE_MS || '0', 10);   // min delay between starts

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

async function loadKey() {
  const envPath = path.join(REPO_ROOT, '.env');
  const txt = await fs.readFile(envPath, 'utf8');
  const m = txt.match(/^OPENAI_API_KEY\s*=\s*(.+)$/m);
  if (!m) throw new Error('OPENAI_API_KEY not found in .env');
  return m[1].trim().replace(/^["']|["']$/g, '');
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
  if (!res.ok) throw new Error(`POST /api/${name} → ${res.status}: ${await res.text()}`);
  return res.json();
}

function buildPrompt(asset) {
  // Filter structural tags
  const structural = new Set(['dark', 'light', 'desktop-ai', 'dark-fire', 'royal-gold', 'upload', 'gemini-gen', 'bg-removed', 'bg-clean']);
  const tags = (asset.tags || []).filter((t) => !structural.has(t) && t.length > 2);
  const tagStr = tags.join(', ');
  const desc = asset.prompt && asset.prompt.length > 5 ? `Visual: ${asset.prompt}.` : '';

  return [
    `A single ${asset.name} centered in frame, 3D rendered, photorealistic.`,
    `Qlipper brand aesthetic: luxurious polished gold metallic finish, premium feel, subtle highlights and reflections.`,
    desc,
    `Tags: ${tagStr || 'icon'}.`,
    `Subject only, no other elements, no shadow on ground, no text, no logo.`,
    `Centered composition with generous breathing room.`,
  ]
    .filter(Boolean)
    .join(' ');
}

async function generateImage(apiKey, asset, attempt = 0) {
  const prompt = buildPrompt(asset);
  const body = {
    model: MODEL,
    prompt,
    n: 1,
    size: SIZE,
    background: 'transparent',
    output_format: 'png',
    quality: QUALITY,
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    // Retry on rate-limit / transient errors
    if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
      const waitMs = (attempt + 1) * 4000;
      console.log(`    ↻ retry in ${waitMs}ms (status ${res.status})`);
      await new Promise((r) => setTimeout(r, waitMs));
      return generateImage(apiKey, asset, attempt + 1);
    }
    throw new Error(`status ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('no b64_json in response: ' + JSON.stringify(json).slice(0, 200));
  }
  return { b64, prompt };
}

async function runConcurrent(items, fn, limit) {
  const results = new Array(items.length);
  let cursor = 0;
  let lastStartedAt = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      // Optional pacing — wait at least PACE_MS since the previous start
      if (PACE_MS > 0) {
        const now = Date.now();
        const wait = lastStartedAt + PACE_MS - now;
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        lastStartedAt = Date.now();
      }
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const apiKey = await loadKey();
  const assets = await fetchCollection('brand_assets');
  let targets = assets.filter((a) => Array.isArray(a.tags) && a.tags.includes('desktop-ai'));
  if (ONLY_MISSING) {
    targets = targets.filter((a) => !a.tags.includes('openai-regen'));
    console.log(`(ONLY_MISSING mode: skipping ${assets.filter(a => a.tags?.includes('openai-regen')).length} already-regenerated)`);
  }
  console.log(`Regenerating ${targets.length} desktop-ai assets with ${MODEL} (transparent bg, ${QUALITY} quality)\n`);

  if (targets.length === 0) {
    console.log('Nothing to regenerate.');
    return;
  }

  let done = 0;
  const totalStart = Date.now();
  const failures = [];

  await runConcurrent(
    targets,
    async (asset, idx) => {
      const start = Date.now();
      try {
        const { b64, prompt } = await generateImage(apiKey, asset);
        const dataUrl = `data:image/png;base64,${b64}`;
        asset.dataUrl = dataUrl;
        asset.prompt = prompt;
        // Tag bookkeeping
        asset.tags = asset.tags.filter((t) => t !== 'bg-removed');
        if (!asset.tags.includes('bg-clean')) asset.tags = [...asset.tags, 'bg-clean'];
        if (!asset.tags.includes('openai-regen')) asset.tags = [...asset.tags, 'openai-regen'];
        asset.source = 'gemini-gen'; // keep enum compatible; treat AI-gen the same
        done++;
        const sec = ((Date.now() - start) / 1000).toFixed(1);
        const kb = Math.round((b64.length * 0.75) / 1024);
        console.log(`[${done}/${targets.length}]  ${asset.name}  ${sec}s  ${kb}KB`);
      } catch (err) {
        failures.push({ name: asset.name, msg: err.message });
        console.log(`[FAIL]  ${asset.name}  ${err.message}`);
      }
    },
    CONCURRENCY
  );

  // Save all back in one shot
  await writeCollection('brand_assets', assets);

  const totalSec = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log(`\n✓ Regenerated ${done}/${targets.length} assets in ${totalSec}s.`);
  if (failures.length > 0) {
    console.log(`  ⚠ ${failures.length} failed:`);
    for (const f of failures) console.log(`    ${f.name}: ${f.msg}`);
  }
  console.log(`\n  Cost estimate: ~$${(done * 0.07).toFixed(2)} (medium quality)`);
  console.log(`  Reload "Inspire → Brand assets" + re-run Render batch.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
