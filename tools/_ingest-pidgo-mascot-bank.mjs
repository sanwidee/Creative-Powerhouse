#!/usr/bin/env node
/**
 * Ingest Pidgo mascot pose bank from /legacy imported/asset/generated-openai/
 * into VPS brand_assets (powerhouse.weedlabs.online).
 *
 * Source: 69 ready-to-post mascot poses named pidgo-{category}-{n}-{pose}.png
 * Categories: emotion, product, scenario, paired
 *
 * Skips:
 *   - macOS resource forks (._*.png)
 *   - "copy.png" duplicates (keep canonical)
 *   - Names that already exist in brand_assets for this brand
 *
 * Usage:
 *   PIDGO_BRAND_ID=1780133445610 \
 *   POWERHOUSE_STORAGE_URL=https://powerhouse.weedlabs.online \
 *   node tools/_ingest-pidgo-mascot-bank.mjs
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'https://powerhouse.weedlabs.online';
const PIDGO_BRAND_ID = process.env.PIDGO_BRAND_ID;
if (!PIDGO_BRAND_ID) { console.error('PIDGO_BRAND_ID required'); process.exit(1); }

const SRC = '/Volumes/Sanwidi 2TB/02-projects/sidehustle/PIDGO/ads/data/creatives/legacy imported/asset/generated-openai';

// Map pose-slug → topic tags (drives caption + plan slot allocation later)
const POSE_TOPIC_MAP = {
  // emotions (#21-35) — mostly general/relatable
  'happy-default': ['topic-default', 'topic-greeting'],
  'excited-waving': ['topic-greeting', 'topic-announcement'],
  'thinking': ['topic-educational', 'topic-tip'],
  'shocked': ['topic-stat-shocking', 'topic-hook'],
  'sad': ['topic-pain-point'],
  'celebrating': ['topic-milestone', 'topic-launch'],
  'sleeping': ['topic-relatable', 'topic-late-night'],
  'determined': ['topic-motivation'],
  'mind-blown': ['topic-insight'],
  'proud': ['topic-milestone'],
  'confused': ['topic-faq', 'topic-question'],
  'laughing': ['topic-relatable', 'topic-funny'],
  'shushing': ['topic-secret', 'topic-insider-tip'],
  'winking': ['topic-cta', 'topic-playful'],
  'love-hearts': ['topic-appreciation', 'topic-community'],

  // product (#01-12) — feature-led
  'pointing-lp': ['topic-feature', 'topic-product-walkthrough'],
  'wiring-pixels': ['topic-feature-pixel', 'topic-feature-tracking'],
  'typing-laptop': ['topic-workflow', 'topic-day-in-life'],
  'delivering-flying': ['topic-speed', 'topic-3-menit-promise'],
  'clicking-edit': ['topic-feature-edit', 'topic-feature-live-editing'],
  'choosing-template': ['topic-feature-template'],
  'export-download': ['topic-feature-export'],
  'mobile-phone': ['topic-mobile-responsive'],
  'multi-ai': ['topic-feature-multi-ai', 'topic-feature-byok'],
  'rewriting-text': ['topic-feature-ai-revision', 'topic-feature'],
  'pricing-card': ['topic-pricing'],
  'cta-button': ['topic-cta', 'topic-conversion'],

  // scenario (#25-40)
  'teacher': ['topic-educational', 'topic-tip'],
  'megaphone': ['topic-announcement', 'topic-launch'],
  'shield-security': ['topic-trust', 'topic-security'],
  'rocket-launch': ['topic-launch', 'topic-milestone'],
  'money-coins': ['topic-pricing', 'topic-value'],
  'clock-time': ['topic-speed', 'topic-3-menit-promise'],
  'checklist': ['topic-feature-list', 'topic-feature'],
  'trophy-winner': ['topic-milestone', 'topic-social-proof'],
  'high-five': ['topic-community', 'topic-onboarding'],
  'indonesia-flag': ['topic-indonesia-pride', 'topic-local-buy'],
  'gift-box': ['topic-promo', 'topic-bonus'],
  'boxing-vs': ['topic-comparison', 'topic-anti-subscription'],
  'coffee-morning': ['topic-relatable', 'topic-day-in-life'],
  'superhero': ['topic-empowerment', 'topic-motivation'],
  'painting-artist': ['topic-customization', 'topic-feature'],
  'night-owl': ['topic-relatable', 'topic-late-night'],

  // paired (#56-60)
  'pidgo-army': ['topic-feature-overview', 'topic-feature'],
  'with-user': ['topic-onboarding', 'topic-tutorial'],
  'vs-old-way': ['topic-comparison', 'topic-pain-point'],
  'pidgo-stack': ['topic-engagement', 'topic-fun'],
};

function parseFilename(fname) {
  // pidgo-{category}-{NN}-{pose-slug}.png
  const base = fname.replace(/\.png$/i, '').replace(/ copy$/, '');
  const m = base.match(/^pidgo-(emotion|product|scenario|paired)-(\d+)-(.+)$/i);
  if (!m) return null;
  return { category: m[1].toLowerCase(), num: m[2], slug: m[3].toLowerCase() };
}

function tagsFor(fname, parsed) {
  const tags = new Set([
    'pidgo', 'pidgo-mascot', 'mascot-led', 'pidgo-real',
    'mascot-bank', 'aspect-1-1', 'dark', 'full-poster',
  ]);
  if (parsed) {
    tags.add(`category-${parsed.category}`);
    const topics = POSE_TOPIC_MAP[parsed.slug] || [];
    for (const t of topics) tags.add(t);
    tags.add(`pose-${parsed.slug}`);
  }
  return [...tags];
}

function nameFor(fname, parsed) {
  if (!parsed) {
    return `Pidgo · ${fname.replace(/\.png$/i, '').replace(/-/g, ' ')}`;
  }
  const titled = parsed.slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const cat = parsed.category[0].toUpperCase() + parsed.category.slice(1);
  return `Pidgo · ${cat} ${parsed.num} ${titled}`;
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

async function ingestFile(fname) {
  const filePath = path.join(SRC, fname);
  const buf = await fs.readFile(filePath);
  const parsed = parseFilename(fname);
  return {
    id: `asset_pidgo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brand_id: PIDGO_BRAND_ID,
    name: nameFor(fname, parsed),
    dataUrl: `data:image/png;base64,${buf.toString('base64')}`,
    source: 'upload',
    prompt: `Pidgo mascot pose bank. File: ${fname}.${parsed ? ` Category: ${parsed.category}, pose: ${parsed.slug}.` : ''}`,
    tags: tagsFor(fname, parsed),
    createdAt: Date.now(),
    _sizeKb: Math.round(buf.length / 1024),
  };
}

async function main() {
  console.log(`Source: ${SRC}`);
  console.log(`Storage: ${STORAGE}`);
  console.log(`Pidgo brand: ${PIDGO_BRAND_ID}\n`);

  const all = await fs.readdir(SRC);
  // Skip macOS resource forks and "copy" duplicates
  const files = all
    .filter((f) => /\.png$/i.test(f))
    .filter((f) => !f.startsWith('._'))
    .filter((f) => !/ copy\.png$/i.test(f))
    .sort();

  console.log(`Found ${files.length} candidate files (after filtering ._ and copy duplicates).\n`);

  const existing = await fetchCollection('brand_assets');
  const existingNames = new Set(
    existing.filter((a) => a.brand_id === PIDGO_BRAND_ID).map((a) => a.name)
  );

  const newAssets = [];
  let skipped = 0;
  for (const fname of files) {
    const asset = await ingestFile(fname);
    if (existingNames.has(asset.name)) {
      console.log(`  · skip (exists): ${asset.name}`);
      skipped++;
      continue;
    }
    console.log(`  + ${asset.name} (${asset._sizeKb}KB) [${asset.tags.filter((t) => t.startsWith('topic-')).slice(0, 3).join(', ')}]`);
    newAssets.push(asset);
  }

  if (!newAssets.length) {
    console.log('\nNothing new to ingest.');
    return;
  }

  const totalKb = newAssets.reduce((s, a) => s + (a._sizeKb || 0), 0);
  for (const a of newAssets) delete a._sizeKb;

  await writeCollection('brand_assets', [...newAssets, ...existing]);
  console.log(`\n✓ Ingested ${newAssets.length} new assets (${(totalKb/1024).toFixed(1)} MB). Skipped ${skipped} duplicates.`);
  console.log(`  Total Pidgo assets now: ${newAssets.length + existing.filter((a) => a.brand_id === PIDGO_BRAND_ID).length}`);
}

main().catch((e) => {
  console.error('Fatal:', e.message || e);
  process.exit(1);
});
