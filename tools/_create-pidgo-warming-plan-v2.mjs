#!/usr/bin/env node
/**
 * Pidgo warming plan v2 — 5 weeks × 2 posts/day = 70 ideas.
 *
 * Uses the 74 mascot-led Pidgo assets on VPS (6 existing + 68 from mascot bank).
 * Strategy:
 *   - Bucket assets by category (emotion / product / scenario / paired / seasonal / existing)
 *   - Interleave categories across slots so feed feels balanced
 *   - 2 slots/day: 09:00 WIB (morning) + 19:00 WIB (evening)
 *   - Schedule from tomorrow (May 31, 2026 WIB) for 35 days
 *
 * Captions NOT generated here — placeholder `caption_draft: asset.name`.
 * Task #90 fills proper Pidgo-voice captions afterward.
 *
 * Deletes any existing plan_pidgo_warm_* (all current Pidgo plans).
 *
 * Required env:
 *   PIDGO_BRAND_ID
 *   POWERHOUSE_STORAGE_URL
 */

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'https://powerhouse.weedlabs.online';
const PIDGO_BRAND_ID = process.env.PIDGO_BRAND_ID;
if (!PIDGO_BRAND_ID) { console.error('PIDGO_BRAND_ID env required'); process.exit(1); }

const DAYS = 35;
const SLOTS_PER_DAY = 2;
const TOTAL_SLOTS = DAYS * SLOTS_PER_DAY;
const SLOT_HOURS_UTC = [2, 12]; // 09:00 WIB, 19:00 WIB
const DAY_MS = 86_400_000;

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

function categoryOf(asset) {
  const tags = asset.tags || [];
  for (const t of tags) {
    if (t === 'category-emotion') return 'emotion';
    if (t === 'category-product') return 'product';
    if (t === 'category-scenario') return 'scenario';
    if (t === 'category-paired') return 'paired';
  }
  // seasonal pattern from filename
  if (/seasonal/i.test(asset.name)) return 'seasonal';
  // legacy 6 — mascot-new tag
  if (tags.includes('mascot-new')) return 'legacy-mascot';
  return 'other';
}

function primaryTopic(asset) {
  const tags = asset.tags || [];
  const topics = tags.filter((t) => t.startsWith('topic-'));
  return topics[0] || 'topic-default';
}

// Build interleaved sequence: round-robin through categories so consecutive slots
// land on different categories. When buckets empty, wrap around.
function buildSequence(assets, targetLength) {
  const buckets = { emotion: [], product: [], scenario: [], paired: [], seasonal: [], 'legacy-mascot': [], other: [] };
  for (const a of assets) {
    buckets[categoryOf(a)].push(a);
  }
  // Shuffle each bucket for variety (deterministic seed by name)
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Rhythm: product (feature-heavy) → emotion (relatable) → scenario (story) →
  //         emotion → product → paired → scenario → emotion → seasonal → cycle
  const rhythm = ['product', 'emotion', 'scenario', 'emotion', 'product', 'paired', 'scenario', 'emotion', 'seasonal', 'legacy-mascot'];

  const sequence = [];
  const reuseCursors = {}; // when a bucket empties, reuse cycling
  for (const k of Object.keys(buckets)) reuseCursors[k] = 0;

  let rhythmIdx = 0;
  while (sequence.length < targetLength) {
    const cat = rhythm[rhythmIdx % rhythm.length];
    rhythmIdx++;
    let asset = buckets[cat].shift();
    if (!asset) {
      // bucket empty — reuse cycling
      const reusePool = (assets.filter((a) => categoryOf(a) === cat));
      if (reusePool.length > 0) {
        asset = reusePool[reuseCursors[cat] % reusePool.length];
        reuseCursors[cat]++;
      } else {
        // category has zero items — fall through to other category
        continue;
      }
    }
    sequence.push(asset);
  }
  return sequence;
}

function tomorrowMidnightUtc() {
  // "Today" baseline frozen in claudeMd: 2026-05-30
  // First slot = May 31 09:00 WIB = May 31 02:00 UTC
  return Date.UTC(2026, 4, 31, 2, 0, 0); // May 31 02:00 UTC
}

async function main() {
  console.log(`Storage: ${STORAGE}, brand: ${PIDGO_BRAND_ID}`);

  const assets = await fetchCollection('brand_assets');
  const pidgoAssets = assets.filter((a) =>
    a.brand_id === PIDGO_BRAND_ID
    && (a.tags || []).includes('mascot-led')
    && !(a.tags || []).includes('aspect-9-16')
    && !(a.tags || []).includes('carousel-slide')
  );
  console.log(`Pidgo mascot-led assets: ${pidgoAssets.length}`);

  // Tally by category for visibility
  const tally = {};
  for (const a of pidgoAssets) {
    const c = categoryOf(a);
    tally[c] = (tally[c] || 0) + 1;
  }
  console.log(`Categories: ${JSON.stringify(tally)}`);

  const sequence = buildSequence(pidgoAssets, TOTAL_SLOTS);
  console.log(`Built sequence of ${sequence.length} slots\n`);

  // Build idea objects
  const startUtc = tomorrowMidnightUtc();
  const ideas = [];
  const newPosts = [];
  for (let i = 0; i < sequence.length; i++) {
    const asset = sequence[i];
    const day = Math.floor(i / SLOTS_PER_DAY);
    const slotInDay = i % SLOTS_PER_DAY;
    const scheduledAt = startUtc + day * DAY_MS + (SLOT_HOURS_UTC[slotInDay] - SLOT_HOURS_UTC[0]) * 3600 * 1000;

    const postId = `post_pidgo_warm2_${Date.now()}_${i}`;
    newPosts.push({
      id: postId,
      name: `Pidgo · ${asset.name}`,
      imageSource: asset.dataUrl,
      history: [],
      blueprintId: 'pidgo:curated-poster',
      aspectRatio: '1:1',
      createdAt: Date.now(),
    });

    ideas.push({
      id: `idea_pidgo_warm2_${Date.now()}_${i}`,
      topic: primaryTopic(asset).replace('topic-', ''),
      headline: asset.name,
      format: 'cta',
      theme: 'dark',
      caption_draft: asset.name, // placeholder — task #90 fills proper caption
      hashtags: ['#PidgoAI', '#LandingPageIndonesia'],
      scheduled_at: scheduledAt,
      scheduled_at_iso: new Date(scheduledAt).toISOString(),
      target_platforms: ['instagram'],
      status: 'scheduled',
      slides: [{
        slide_index: 0,
        slide_type: 'cover',
        theme: 'dark',
        rendered_post_id: postId,
      }],
      rendered_post_id: postId,
    });
  }

  // Save posts
  const existingPosts = await fetchCollection('posts');
  await writeCollection('posts', [...newPosts, ...existingPosts]);
  console.log(`Saved ${newPosts.length} new GeneratedPost wrappers.`);

  // Save plan — REPLACE any old plan_pidgo_warm_*
  const plans = await fetchCollection('content_plans');
  const keptPlans = plans.filter((p) => !(p.brand_id === PIDGO_BRAND_ID && /^plan_pidgo_warm/.test(p.id)));
  const removed = plans.length - keptPlans.length;
  if (removed > 0) console.log(`Removing ${removed} old Pidgo warming plan(s).`);

  const fmt = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Jakarta' });
  const newPlan = {
    id: `plan_pidgo_warm_${Date.now()}`,
    name: `Pidgoapp · warming ${fmt(ideas[0].scheduled_at)} – ${fmt(ideas[ideas.length - 1].scheduled_at)} · ${ideas.length} posts`,
    brief: `Warming @pidgoapp with ${ideas.length} mascot posts. 2/day (09:00 & 19:00 WIB) × ${DAYS} days. Category-interleaved (emotion/product/scenario/paired/seasonal/legacy-mascot) for varied feed rhythm.`,
    brand_id: PIDGO_BRAND_ID,
    schedule: {
      posts_per_day: SLOTS_PER_DAY,
      days: DAYS,
      start_utc: startUtc,
      timezone: 'Asia/Jakarta',
      slots_wib: ['09:00', '19:00'],
    },
    ideas,
    createdAt: Date.now(),
  };

  await writeCollection('content_plans', [newPlan, ...keptPlans]);
  console.log(`\n✓ Saved plan ${newPlan.id}`);
  console.log(`  ${newPlan.name}`);
  console.log(`  First: ${ideas[0].scheduled_at_iso}  ${ideas[0].headline}`);
  console.log(`  Last:  ${ideas[ideas.length-1].scheduled_at_iso}  ${ideas[ideas.length-1].headline}`);
  console.log(`\n  Captions are PLACEHOLDERS. Run _regen-pidgo-captions.mjs next.`);
}

main().catch((e) => { console.error('Fatal:', e.message || e); process.exit(1); });
