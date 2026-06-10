#!/usr/bin/env node
/**
 * Regenerate brand assets from the Qlipper prompt bank.
 *
 * Reads /tmp/cph-brand-prompts.json (array of {id, description, category, full_prompt})
 * For each entry:
 *   1. Strip baked-in text instructions so the result is icon-only
 *   2. Call OpenAI gpt-image-1 with background=transparent, quality=medium
 *   3. Save the generated PNG dataUrl to brand_assets
 *
 * After all complete, optionally drop old dark-fire assets to clean up the library.
 *
 * Env vars (auto-read from .env or process.env):
 *   OPENAI_API_KEY
 *   POWERHOUSE_STORAGE_URL (default http://localhost:3001 — set to 3040 on VPS)
 *   CONCURRENCY (default 1 — gpt-image-1 has 5/min limit)
 *   PACE_MS (default 13000 — ~4.5 req/min)
 *   DROP_DARK_FIRE=1 — also remove existing dark-fire assets
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const MODEL = 'gpt-image-1';
const SIZE = '1024x1024';
const QUALITY = 'medium';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '1', 10);
const PACE_MS = parseInt(process.env.PACE_MS || '13000', 10);
const RETRIES = 3;
const QLIPPER_BRAND_ID = '1779856883804';
const PROMPTS_FILE = process.env.PROMPTS_FILE || '/tmp/cph-brand-prompts.json';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

async function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const envPath = path.join(REPO_ROOT, '.env');
  const txt = await fs.readFile(envPath, 'utf8');
  const m = txt.match(/^OPENAI_API_KEY\s*=\s*(.+)$/m);
  if (!m) throw new Error('OPENAI_API_KEY not found');
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

/**
 * Strip text-rendering instructions from a prompt while preserving the visual
 * mood (gold ember, black bg, 3D metallic, etc.).
 *
 * The prompt bank uses a consistent structure:
 *   [base mood paragraph]. [scene description with text].
 * The text-bearing parts are usually delimited by phrases like:
 *   - `"…" text in …`
 *   - `…in white serif headline`
 *   - `…rendered in glowing 3D gold`
 *   - `text reads "…"`
 */
function stripTextFromPrompt(p, description) {
  let out = p;

  // 1. Remove quoted text strings (anything in "…" or '…')
  out = out.replace(/"[^"]+"/g, '');
  out = out.replace(/'[^']+'/g, '');

  // 2. Remove typography descriptors that ONLY make sense with text
  const TEXT_PHRASES = [
    /[^.]*\b(?:headline|tagline|subhead|caption|copy|sentence)\b[^.]*\./gi,
    /[^.]*\btext (?:in|reads|positioned|placed|below|above|on)\b[^.]*\./gi,
    /[^.]*\btypography in[^.]*\./gi,
    /[^.]*\bin (?:white|brown|gold|black) serif\b[^.]*\./gi,
    /[^.]*\brendered in (?:glowing|3D) (?:gold|amber)\b[^.]*\./gi,
    /[^.]*\b(?:text|title|wordmark|lettering)\b[^.]*\./gi,
  ];
  for (const re of TEXT_PHRASES) out = out.replace(re, '');

  // 3. Collapse double-spaces, double-periods, leading/trailing space
  out = out.replace(/\s+\./g, '.').replace(/\.\.+/g, '.').replace(/\s{2,}/g, ' ').trim();

  // 4. Append our renderer-friendly constraints
  out += ` ${description}. Icon-only composition, no text, no letters, no typography, no words. Single subject centered. Transparent background. Empty space around the subject. Square 1:1 format.`;

  return out;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 50);
}

async function generateImage(apiKey, body, attempt = 0) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
      const wait = (attempt + 1) * 8000;
      console.log(`    ↻ retry in ${wait}ms (status ${res.status})`);
      await new Promise((r) => setTimeout(r, wait));
      return generateImage(apiKey, body, attempt + 1);
    }
    throw new Error(`status ${res.status}: ${err.slice(0, 250)}`);
  }
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('no b64_json: ' + JSON.stringify(json).slice(0, 200));
  return b64;
}

async function main() {
  const apiKey = await loadKey();
  const prompts = JSON.parse(await fs.readFile(PROMPTS_FILE, 'utf8'));
  console.log(`Loaded ${prompts.length} prompts from ${PROMPTS_FILE}`);
  console.log(`Storage: ${STORAGE}`);
  console.log(`Model: ${MODEL}  size: ${SIZE}  quality: ${QUALITY}`);
  console.log(`Concurrency: ${CONCURRENCY}  pace: ${PACE_MS}ms`);
  console.log();

  const assets = await fetchCollection('brand_assets');
  const newAssets = [];
  const failures = [];

  let lastStartedAt = 0;
  const start = Date.now();

  for (let i = 0; i < prompts.length; i++) {
    if (PACE_MS > 0) {
      const wait = lastStartedAt + PACE_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastStartedAt = Date.now();
    }

    const p = prompts[i];
    const cleanPrompt = stripTextFromPrompt(p.full_prompt, p.description);

    const t0 = Date.now();
    try {
      const b64 = await generateImage(apiKey, {
        model: MODEL,
        prompt: cleanPrompt,
        n: 1,
        size: SIZE,
        background: 'transparent',
        output_format: 'png',
        quality: QUALITY,
      });
      const dataUrl = `data:image/png;base64,${b64}`;
      const kb = Math.round((b64.length * 0.75) / 1024);

      const asset = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brand_id: QLIPPER_BRAND_ID,
        name: `${p.id} · ${p.description}`,
        dataUrl,
        source: 'gemini-gen',
        prompt: cleanPrompt,
        // Tags: theme + category + prompt-id (slug parts) + 'brand-prompt' marker
        tags: [
          'dark',
          'bg-clean',
          'brand-prompt',
          p.category,
          ...p.id.split('-'),
          ...slugify(p.description).split('-').slice(0, 4),
        ].filter(Boolean),
        createdAt: Date.now(),
      };
      newAssets.push(asset);
      const sec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[${i + 1}/${prompts.length}] ${p.id}  (${sec}s, ${kb}KB)  ${p.description}`);
    } catch (err) {
      failures.push({ id: p.id, msg: err.message });
      console.log(`[FAIL] ${p.id}: ${err.message}`);
    }
  }

  // Optionally drop old dark-fire variants to keep library clean
  let removedCount = 0;
  let assetsAfter = assets;
  if (process.env.DROP_DARK_FIRE === '1') {
    assetsAfter = assets.filter((a) => {
      const isDarkFire = a.brand_id === QLIPPER_BRAND_ID && Array.isArray(a.tags) && a.tags.includes('dark-fire');
      if (isDarkFire) removedCount++;
      return !isDarkFire;
    });
  }

  const updated = [...newAssets, ...assetsAfter];
  await writeCollection('brand_assets', updated);

  const totalSec = ((Date.now() - start) / 1000).toFixed(1);
  console.log();
  console.log(`✓ Added ${newAssets.length}/${prompts.length} new brand-prompt assets`);
  if (removedCount > 0) console.log(`  Removed ${removedCount} old dark-fire variants (DROP_DARK_FIRE=1)`);
  if (failures.length > 0) {
    console.log(`  ⚠ ${failures.length} failed:`);
    for (const f of failures) console.log(`    ${f.id}: ${f.msg}`);
  }
  console.log(`  Time: ${totalSec}s`);
  console.log(`  Cost: ~$${(newAssets.length * 0.07).toFixed(2)}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
