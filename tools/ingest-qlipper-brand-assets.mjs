#!/usr/bin/env node
/**
 * Ingest Qlipper's OFFICIAL brand asset library from:
 *   ~/Documents/Qlipper Desktop Revamp/frontend/public/brand/{dark-fire,royal-gold}/
 *
 * These are already organized:
 *   dark-fire/df-<icon>.png  → dark theme variant
 *   royal-gold/rg-<icon>.png → light theme variant
 *
 * No AI tagging needed — filenames are self-descriptive.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const QLIPPER_BRAND_ID = '1779856883804';

const BRAND_ROOT = path.join(
  os.homedir(),
  'Documents',
  'Qlipper Desktop Revamp',
  'frontend',
  'public',
  'brand'
);
const VARIANTS = [
  { dir: 'dark-fire', prefix: 'df-', theme: 'dark', themeName: 'Dark Fire' },
  { dir: 'royal-gold', prefix: 'rg-', theme: 'light', themeName: 'Royal Gold' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function prettifyIconName(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const existing = await fetchCollection('brand_assets');
  const existingNames = new Set(
    (Array.isArray(existing) ? existing : [])
      .filter((a) => a.brand_id === QLIPPER_BRAND_ID)
      .map((a) => a.name)
  );

  const newAssets = [];
  const skipped = [];

  for (const variant of VARIANTS) {
    const dirPath = path.join(BRAND_ROOT, variant.dir);
    let files;
    try {
      files = await fs.readdir(dirPath);
    } catch (err) {
      console.error(`Cannot read ${dirPath}: ${err.message}`);
      continue;
    }

    files = files.filter((f) => f.endsWith('.png') && f.startsWith(variant.prefix));
    console.log(`\n${variant.themeName} (${variant.theme}): ${files.length} icons`);

    for (const fname of files) {
      const iconSlug = fname.replace(variant.prefix, '').replace(/\.png$/, '');
      const iconName = prettifyIconName(iconSlug); // e.g. "Clapper Board"
      const displayName = `${iconName} (${variant.themeName})`;

      if (existingNames.has(displayName)) {
        skipped.push(displayName);
        continue;
      }

      const filePath = path.join(dirPath, fname);
      const buf = await fs.readFile(filePath);
      const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;

      const asset = {
        id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brand_id: QLIPPER_BRAND_ID,
        name: displayName,
        dataUrl,
        source: 'upload',
        prompt: `Official Qlipper brand icon. Variant: ${variant.themeName}. Icon: ${iconName}.`,
        tags: [
          variant.theme,        // 'dark' or 'light' — used by renderer to pair with theme
          variant.dir,          // 'dark-fire' or 'royal-gold' — full variant name
          iconSlug,             // 'clapper-board' — for keyword matching
          ...iconSlug.split('-'), // individual words for fuzzy matching
        ],
        createdAt: Date.now(),
      };

      newAssets.push(asset);
      console.log(`  + ${displayName}  [${asset.tags.join(', ')}]`);
    }
  }

  if (newAssets.length === 0) {
    console.log(`\nNo new assets. Skipped ${skipped.length} duplicates.`);
    return;
  }

  const updated = [...newAssets, ...(Array.isArray(existing) ? existing : [])];
  await writeCollection('brand_assets', updated);

  console.log(`\n✓ Ingested ${newAssets.length} official brand assets.`);
  if (skipped.length > 0) console.log(`  Skipped ${skipped.length} already in library.`);
  console.log(`\n  Reload "Inspire → Brand assets" in the app to see them.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
