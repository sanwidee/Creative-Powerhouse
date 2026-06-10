#!/usr/bin/env node
/**
 * Remove backgrounds from Desktop-ingested Qlipper AI assets.
 *
 * For each brand_asset tagged 'desktop-ai':
 *   1. Decode dataUrl → buffer
 *   2. Sample corner + edge pixels to estimate bg color
 *   3. For every pixel within tolerance of bg → set alpha = 0
 *   4. Encode as PNG with alpha
 *   5. Replace asset.dataUrl
 *
 * Works well for solid/near-solid backgrounds (Gemini-generated images).
 * Less clean for complex backgrounds, but better than nothing without an ML model.
 */

import sharp from 'sharp';

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';
const TOLERANCE = 35; // RGB distance — bigger = more aggressive removal

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

function dataUrlToBuffer(dataUrl) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('not a base64 dataUrl');
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
}

async function removeBg(buffer, tolerance = TOLERANCE) {
  // Get raw RGBA pixel data
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels = 4 after ensureAlpha

  // Sample bg color from 12 edge points (corners + mid-edges + 1/4 + 3/4 along edges)
  const samplePoints = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
    [Math.floor(width / 4), 0], [Math.floor((width * 3) / 4), 0],
    [Math.floor(width / 4), height - 1], [Math.floor((width * 3) / 4), height - 1],
  ];

  let rSum = 0, gSum = 0, bSum = 0;
  for (const [x, y] of samplePoints) {
    const idx = (y * width + x) * channels;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
  }
  const bgR = rSum / samplePoints.length;
  const bgG = gSum / samplePoints.length;
  const bgB = bSum / samplePoints.length;

  // Squared tolerance for cheap euclidean compare
  const tolSq = tolerance * tolerance * 3;
  let cleared = 0;
  for (let i = 0; i < data.length; i += channels) {
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    if (dr * dr + dg * dg + db * db < tolSq) {
      data[i + 3] = 0; // alpha 0
      cleared++;
    }
  }

  const totalPx = width * height;
  const cleanedBuf = await sharp(data, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return {
    buffer: cleanedBuf,
    bg: [Math.round(bgR), Math.round(bgG), Math.round(bgB)],
    clearedPct: ((cleared / totalPx) * 100).toFixed(1),
  };
}

async function main() {
  const assets = await fetchCollection('brand_assets');
  const targets = assets.filter((a) => Array.isArray(a.tags) && a.tags.includes('desktop-ai'));
  console.log(`Found ${targets.length} desktop-ai assets to process.\n`);

  if (targets.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  let n = 0;
  for (const asset of targets) {
    n++;
    try {
      const { buffer: origBuf } = dataUrlToBuffer(asset.dataUrl);
      const origSize = origBuf.length;

      const { buffer: cleanBuf, bg, clearedPct } = await removeBg(origBuf);
      const cleanSize = cleanBuf.length;

      const newDataUrl = `data:image/png;base64,${cleanBuf.toString('base64')}`;
      asset.dataUrl = newDataUrl;
      // Tag it as bg-removed so we can find/reprocess later
      if (!asset.tags.includes('bg-removed')) asset.tags = [...asset.tags, 'bg-removed'];

      console.log(
        `[${n}/${targets.length}] ${asset.name}  bg=rgb(${bg.join(',')})  cleared=${clearedPct}%  ${(origSize/1024).toFixed(0)}KB → ${(cleanSize/1024).toFixed(0)}KB`
      );
    } catch (err) {
      console.warn(`[${n}/${targets.length}] ${asset.name}  ⚠ ${err.message}`);
    }
  }

  // Save the modified assets back. assets[] still references the same objects, just with updated dataUrls.
  await writeCollection('brand_assets', assets);
  console.log(`\n✓ Updated ${targets.length} assets with transparent backgrounds.`);
  console.log(`  Reload "Inspire → Brand assets" in the app to see them.`);
  console.log(`  Then hit Render batch again in Plan → Queue to use the cleaned versions.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
