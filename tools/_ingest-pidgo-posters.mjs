#!/usr/bin/env node
/**
 * Ingest 17 curated Pidgo posters from /sidehustle/PIDGO/ads/data/curated/
 * into brand_assets collection, tagged with Pidgo brand_id.
 *
 * Each poster is treated as a 'full-poster' asset (text baked into the image)
 * — used as standalone IG posts, not as icons in a templated renderer.
 *
 * Tag inference from filename:
 *   - pricing: harga, investasi, batch1
 *   - anti-sub: bebas, langganan
 *   - speed: 3menit, autoclip, hemat-waktu
 *   - social-proof: creator, ratusan, ribuan
 *   - feature: ubah-format, puluhan-clip
 *   - promo: early-access
 *
 * Aspect ratio inferred from filename suffix (-feed = 4:5, -story = 9:16, default = 1:1).
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const PIDGO_BRAND_ID = process.env.PIDGO_BRAND_ID;
const SOURCE_DIR = '/Volumes/Sanwidi 2TB/02-projects/sidehustle/PIDGO/ads/data/curated';

if (!PIDGO_BRAND_ID) {
  console.error('PIDGO_BRAND_ID env var required (the brand id from _create-pidgo-brand.mjs output).');
  process.exit(1);
}

function inferTags(fname) {
  const f = fname.toLowerCase();
  const tags = ['curated', 'full-poster', 'pidgo'];

  // Topic tags
  if (/harga|investasi|batch/.test(f)) tags.push('topic-pricing', 'pricing');
  if (/bebas|langganan/.test(f)) tags.push('topic-anti-subscription', 'anti-subscription');
  if (/3menit|autoclip|hemat-waktu|menit/.test(f)) tags.push('topic-speed', 'speed', 'time-savings');
  if (/creator|ratusan|ribuan/.test(f)) tags.push('topic-social-proof', 'social-proof');
  if (/ubah-format|format-video/.test(f)) tags.push('topic-feature', 'feature-format-conversion');
  if (/puluhan-clip|panjang/.test(f)) tags.push('topic-feature', 'feature-long-to-short');
  if (/early-access/.test(f)) tags.push('topic-promo', 'promo', 'launch');

  // Aspect ratio tags
  if (/-feed\.png$/.test(f)) tags.push('aspect-4-5', 'instagram-feed');
  else if (/-story\.png$/.test(f)) tags.push('aspect-9-16', 'instagram-story');
  else tags.push('aspect-1-1', 'square');

  // Theme: Pidgo posters use dark background per brand identity
  tags.push('dark');

  return [...new Set(tags)];
}

function deriveName(fname) {
  // Strip extension, dashes → spaces, title-case words
  return fname
    .replace(/\.(png|jpg|jpeg)$/i, '')
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
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

async function main() {
  console.log(`Ingest source: ${SOURCE_DIR}`);
  console.log(`Storage: ${STORAGE}`);
  console.log(`Pidgo brand_id: ${PIDGO_BRAND_ID}`);
  console.log();

  let files;
  try {
    files = await fs.readdir(SOURCE_DIR);
  } catch (err) {
    console.error(`Cannot read source dir: ${err.message}`);
    process.exit(1);
  }
  files = files.filter((f) => /\.(png|jpe?g)$/i.test(f) && !f.startsWith('.'));
  console.log(`Found ${files.length} image files.\n`);

  const existing = await fetchCollection('brand_assets');
  const existingNames = new Set(
    existing.filter((a) => a.brand_id === PIDGO_BRAND_ID).map((a) => a.name)
  );

  const newAssets = [];
  for (const fname of files) {
    const filePath = path.join(SOURCE_DIR, fname);
    const buf = await fs.readFile(filePath);
    const ext = fname.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
    const dataUrl = `data:image/${ext};base64,${buf.toString('base64')}`;
    const name = deriveName(fname);

    if (existingNames.has(name)) {
      console.log(`  · skip (already exists): ${name}`);
      continue;
    }

    const tags = inferTags(fname);
    const asset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brand_id: PIDGO_BRAND_ID,
      name,
      dataUrl,
      source: 'upload',
      prompt: `Curated Pidgo ad creative. Filename: ${fname}`,
      tags,
      createdAt: Date.now(),
    };
    newAssets.push(asset);
    const sizeKb = Math.round(buf.length / 1024);
    console.log(`  + ${name}  (${sizeKb}KB)  [${tags.slice(2, 6).join(', ')}]`);
  }

  if (newAssets.length === 0) {
    console.log('\nNothing new to ingest.');
    return;
  }

  const updated = [...newAssets, ...existing];
  await writeCollection('brand_assets', updated);
  console.log(`\n✓ Ingested ${newAssets.length} Pidgo posters into brand_assets.`);
  console.log(`  Reload Inspire → Brand assets and pick Pidgoapp to browse.`);
}

main().catch((e) => {
  console.error('Fatal:', e.message || e);
  process.exit(1);
});
