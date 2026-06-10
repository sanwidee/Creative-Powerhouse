#!/usr/bin/env node
/**
 * Ingest REAL Pidgo posters into brand_assets.
 *
 * Sources:
 *   /sidehustle/PIDGO/ads/data/creatives/     (final feed + carousel + story posters)
 *   /sidehustle/PIDGO/ads/data/creatives/new/ (mascot-led variants)
 *
 * Curation rule: take FINAL versions only — skip v2, v3 iterations. For each theme
 * (3menit, anti-langganan, harga, pixel) we pick the most polished version.
 *
 * Theme + aspect inferred from filename:
 *   pidgo-3menit-final.png       → topic-speed, aspect-1-1, feed
 *   pidgo-anti-langganan-final   → topic-anti-subscription, feed
 *   pidgo-harga-final            → topic-pricing, feed
 *   pidgo-pixel-final            → topic-feature-pixel, feed
 *   pidgo-story-*.png            → aspect-9-16, story
 *   pidgo-carousel-slide*.png    → multi-slide carousel
 *   pidgo-image-*.png            → topic-specific single-image hook
 *   creatives/new/3menit-mascot  → mascot-led, topic-speed
 *   creatives/new/anti-langganan-mascot → mascot-led, anti-sub
 *   creatives/new/pixel-pain-mascot     → mascot-led, pixel-pain
 *   creatives/new/ai-revision-v2 → mascot-led, feature-AI-revision
 *   creatives/new/all-in-one-v2  → mascot-led, feature-all-in-one
 *   creatives/new/chat-creation-v2 → mascot-led, feature-chat-to-LP
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const PIDGO_BRAND_ID = process.env.PIDGO_BRAND_ID;
if (!PIDGO_BRAND_ID) { console.error('PIDGO_BRAND_ID required'); process.exit(1); }

const SRC_CREATIVES = '/Volumes/Sanwidi 2TB/02-projects/sidehustle/PIDGO/ads/data/creatives';
const SRC_NEW = path.join(SRC_CREATIVES, 'new');

// Curated whitelist — only "final" versions + new mascot variants. No v2/v3 iterations.
const FEED_FINALS = [
  'pidgo-3menit-final.png',
  'pidgo-anti-langganan-final.png',
  'pidgo-harga-final.png',
  'pidgo-pixel-final.png',
];

const STORY_SET = [
  'pidgo-story-3menit.png',
  'pidgo-story-anti-langganan.png',
  'pidgo-story-harga.png',
  'pidgo-story-pixel.png',
];

const CAROUSEL_SLIDES = [
  'pidgo-carousel-slide1.png',
  'pidgo-carousel-slide2.png',
  'pidgo-carousel-slide3.png',
];

const IMAGE_HOOKS = [
  'pidgo-image-pain-hook.png',
  'pidgo-image-story-hook.png',
  'pidgo-image-price.png',
];

const MASCOT_NEW = [
  '3menit-mascot.png',
  'anti-langganan-mascot.png',
  'pixel-pain-mascot.png',
  'ai-revision-v2.png',
  'all-in-one-v2.png',
  'chat-creation-v2.png',
];

function tagsFor(fname, group) {
  const f = fname.toLowerCase();
  const tags = ['pidgo', 'dark', 'full-poster'];

  // Topic
  if (f.includes('3menit')) tags.push('topic-speed', 'speed', '3-menit-promise');
  if (f.includes('anti-langganan')) tags.push('topic-anti-subscription', 'anti-subscription');
  if (f.includes('harga')) tags.push('topic-pricing', 'pricing');
  if (f.includes('pixel')) tags.push('topic-feature-pixel', 'meta-pixel', 'tracking');
  if (f.includes('ai-revision')) tags.push('topic-feature', 'feature-ai-revision');
  if (f.includes('all-in-one')) tags.push('topic-feature', 'feature-all-in-one');
  if (f.includes('chat-creation')) tags.push('topic-feature', 'feature-chat-to-lp');
  if (f.includes('pain')) tags.push('pain-point');
  if (f.includes('mascot')) tags.push('mascot-led', 'pidgo-mascot');
  if (f.includes('hook')) tags.push('hook-style');

  // Aspect / placement
  if (group === 'story' || f.startsWith('pidgo-story')) tags.push('aspect-9-16', 'instagram-story');
  else if (group === 'carousel') tags.push('aspect-1-1', 'carousel-slide');
  else if (group === 'image-hook') tags.push('aspect-1-1', 'single-image-hook');
  else tags.push('aspect-1-1', 'instagram-feed');

  if (group === 'mascot-new') tags.push('mascot-led', 'pidgo-mascot');

  return [...new Set(tags)];
}

function nameFor(fname) {
  return fname
    .replace(/\.(png|jpg|jpeg)$/i, '')
    .replace(/^pidgo-/, '')
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
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

async function ingestFile(dir, fname, group) {
  const filePath = path.join(dir, fname);
  const buf = await fs.readFile(filePath);
  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
  return {
    id: `asset_pidgo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brand_id: PIDGO_BRAND_ID,
    name: `Pidgo · ${nameFor(fname)}${group === 'story' ? ' (Story)' : group === 'carousel' ? ' (Carousel)' : ''}`,
    dataUrl,
    source: 'upload',
    prompt: `Real Pidgo brand asset. File: ${fname}. Group: ${group}.`,
    tags: [...tagsFor(fname, group), 'pidgo-real', group],
    createdAt: Date.now(),
    sizeKb: Math.round(buf.length / 1024),
  };
}

async function main() {
  console.log(`Storage: ${STORAGE}\n`);

  const existing = await fetchCollection('brand_assets');
  const newAssets = [];

  for (const fname of FEED_FINALS) {
    const a = await ingestFile(SRC_CREATIVES, fname, 'feed');
    newAssets.push(a);
    console.log(`  + ${a.name} (${a.sizeKb}KB)  [${a.tags.slice(0, 5).join(', ')}]`);
  }
  for (const fname of STORY_SET) {
    const a = await ingestFile(SRC_CREATIVES, fname, 'story');
    newAssets.push(a);
    console.log(`  + ${a.name} (${a.sizeKb}KB)  [${a.tags.slice(0, 5).join(', ')}]`);
  }
  for (const fname of CAROUSEL_SLIDES) {
    const a = await ingestFile(SRC_CREATIVES, fname, 'carousel');
    newAssets.push(a);
    console.log(`  + ${a.name} (${a.sizeKb}KB)  [${a.tags.slice(0, 5).join(', ')}]`);
  }
  for (const fname of IMAGE_HOOKS) {
    const a = await ingestFile(SRC_CREATIVES, fname, 'image-hook');
    newAssets.push(a);
    console.log(`  + ${a.name} (${a.sizeKb}KB)  [${a.tags.slice(0, 5).join(', ')}]`);
  }
  for (const fname of MASCOT_NEW) {
    const a = await ingestFile(SRC_NEW, fname, 'mascot-new');
    newAssets.push(a);
    console.log(`  + ${a.name} (${a.sizeKb}KB)  [${a.tags.slice(0, 5).join(', ')}]`);
  }

  const sizeKb = newAssets.reduce((sum, a) => sum + (a.sizeKb || 0), 0);
  // Strip sizeKb before saving (it's just for log output)
  for (const a of newAssets) delete a.sizeKb;

  await writeCollection('brand_assets', [...newAssets, ...existing]);
  console.log(`\n✓ Ingested ${newAssets.length} real Pidgo assets (${(sizeKb/1024).toFixed(1)} MB total)`);
}

main().catch((e) => {
  console.error('Fatal:', e.message || e);
  process.exit(1);
});
