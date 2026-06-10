#!/usr/bin/env node
/**
 * Create Pidgoapp brand profile in the brands collection.
 *
 * Visual identity + voice profile distilled from:
 *   1-Projects/Personal/Pidgoapp/pidgoapp-brand-asset-guidelines.md
 *
 * If a Pidgo brand entry already exists, update it in place (preserves id).
 */

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';

const PIDGO_BRAND = {
  // id assigned below (preserved if already exists)
  name: 'Pidgoapp',
  imageSource: '', // optional hero image — left empty, can be set later via BrandLab
  dna: {
    brand_name: 'Pidgoapp',
    primary_colors: ['#ff2d78', '#0a0a0f', '#00f0ff', '#b44dff'],
    color_logic:
      'Neon pink (#ff2d78) as mascot/primary CTA. Void Black (#0a0a0f) for marketing backgrounds. Electric Cyan (#00f0ff) and Neon Purple (#b44dff) as secondary energy. Bold gradient: pink → purple → cyan.',
    brand_vibe:
      'Friendly, playful, capable, but not childish. Indonesian-first. Mascot-led product education. Retro-tech with CRT/grid references.',
    typography_notes:
      'Headings: Space Grotesk 600-700, geometric. Body: Inter 400-600. Code/labels: JetBrains Mono. Wordmark lowercase "pidgo".',
    forbidden_styles: [
      'Corporate SaaS English fog',
      'Stock photo people',
      'Generic cute decoration without product context',
      'Empower-your-business style copy',
    ],
    dark_mode_colors: ['#0a0a0f', '#12121a', '#1a1a2e'],
    light_mode_colors: [],
  },
  guidelines:
    'Pidgoapp is an AI landing page generator. Promise: fast LP creation with built-in tracking/pixel setup. Mascot-led identity (Pidgo, round pink pigeon, 3D Pixar render). Indonesian-first.',
  visual_identity: {
    bg_dark: '#0a0a0f',
    bg_light: '#f7e8f0', // soft pink-cream (derived; no formal light variant in guidelines)
    ink_dark: '#f0e6d3',
    ink_light: '#0a0a0f',
    sub_ink_dark: '#a89b8c',
    sub_ink_light: '#5a4a3d',
    accent_color: '#ff2d78', // Pidgo Pink — primary
    accent_color_2: '#00f0ff', // Electric Cyan — secondary
    cta_text_default: 'Coba Pidgo sekarang',
    font_family_serif: '"Space Grotesk", system-ui, sans-serif',
    font_family_sans: '"Inter", system-ui, sans-serif',
  },
  voice_profile: {
    tagline: 'Bikin LP 3 menit. Pixel langsung masuk.',
    signature_phrases: [
      'Bikin LP 3 menit. Pixel langsung masuk.',
      'Tool lain bikin LP. Pidgo pasangin pixel-nya.',
      'Ga perlu coding. Ga perlu desainer.',
      'LP-mu udah jadi.',
      'Lagi generate ya, tunggu bentar.',
    ],
    banned_phrases: [
      'empower your business',
      'AI-powered landing page solutions',
      'unlock potential',
      'leverage',
      'utilize',
      'in today\'s fast-paced world',
    ],
    target_audience:
      'Indonesian creators, marketers, small business owners, side-hustlers, agency owners who need fast LP creation with tracking pixels. Often non-technical.',
    language_default: 'bahasa',
    tone: 'Friendly, playful, mascot-led, direct. Like a smart younger friend explaining how easy it is. Never corporate.',
  },
};

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
  const brands = await fetchCollection('brands');
  console.log(`Brands collection has ${brands.length} entries.`);

  const existing = brands.find(
    (b) => b.name && (b.name.toLowerCase() === 'pidgoapp' || b.name.toLowerCase() === 'pidgo' || b.name.toLowerCase() === 'pidgoapp.online')
  );

  const now = Date.now();
  let updated;
  if (existing) {
    console.log(`Updating existing brand "${existing.name}" (id=${existing.id}) in place — preserving id, merging fields.`);
    Object.assign(existing, PIDGO_BRAND, { id: existing.id, createdAt: existing.createdAt || now });
    updated = brands;
  } else {
    console.log('Creating new Pidgoapp brand entry.');
    updated = [{ id: String(now), ...PIDGO_BRAND, createdAt: now }, ...brands];
  }

  await writeCollection('brands', updated);

  const pidgo = updated.find((b) => b.name === 'Pidgoapp');
  console.log(`\n✓ Pidgoapp brand ready:`);
  console.log(`  id: ${pidgo.id}`);
  console.log(`  accent: ${pidgo.visual_identity.accent_color} + ${pidgo.visual_identity.accent_color_2}`);
  console.log(`  cta: "${pidgo.visual_identity.cta_text_default}"`);
  console.log(`  tagline: "${pidgo.voice_profile.tagline}"`);
}

main().catch((e) => {
  console.error('Fatal:', e.message || e);
  process.exit(1);
});
