#!/usr/bin/env node
/**
 * Patch 3 of the existing Qlipper plan's ideas to use 'testimonial' body style
 * with real WhatsApp-style chat content (transcribed from user-supplied screenshots).
 *
 * Strategy: find the first 3 ideas with body_style='explainer' and replace their
 * body slide content with a chat-bubble testimonial. We keep the cover slide as-is.
 */

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';

const TESTIMONIALS = [
  // From the Telegram review screenshot — Lynch user, condensed for chat-bubble format.
  {
    testimonial_label: 'ASLI DARI USER',
    cta_text: 'Coba Qlipper sekarang',
    testimonial_messages: [
      {
        from: 'incoming',
        sender: 'Lynch',
        text:
          'Izin review. User Windows nih, awal beli semingguan gabisa dipake, ngeluh terus.',
        time: '4:04 PM',
      },
      {
        from: 'incoming',
        sender: 'Lynch',
        text:
          'Akhirnya dinotice dan dibantu langsung sama owner via Google Meet 🙏',
        time: '4:05 PM',
      },
      {
        from: 'incoming',
        sender: 'Lynch',
        text:
          'Saya pake versi terbaru, aman udah hampir 1 bulan.',
        time: '4:06 PM',
      },
    ],
  },
  // From the WhatsApp screenshot — short thank-you exchange
  {
    testimonial_label: 'CHAT ASLI USER',
    cta_text: 'Coba Qlipper sekarang',
    testimonial_messages: [
      { from: 'incoming', text: 'Ok baik bang', time: '10:07 PM' },
      { from: 'incoming', text: 'Terimakasih atas panduannya bang 🙏', time: '10:07 PM' },
      { from: 'incoming', text: 'Semoga sukses selalu', time: '10:07 PM' },
      { from: 'outgoing', text: 'aman aja bang', time: '11:15 PM', checks: true },
    ],
  },
  // From the WhatsApp screenshot — "papua dah terang" testimonial
  {
    testimonial_label: 'CHAT ASLI USER',
    cta_text: 'Coba Qlipper sekarang',
    testimonial_messages: [
      {
        from: 'incoming',
        text: 'Bsok mlm aku khursus lagi ya bang, Papua dah terang, jdi seneng bgt ni aku bang',
        time: '12:08 AM',
      },
      { from: 'incoming', text: 'Makasih bgt lo bang', time: '12:08 AM' },
      {
        from: 'outgoing',
        text: 'Saya ikut seneng juga kalau user Qlipper bisa pakai akhirnya 😅',
        time: '12:13 AM',
        checks: true,
      },
      { from: 'incoming', text: 'Terbaik sudah ini', time: '12:13 AM' },
      { from: 'incoming', text: 'Lu ciptain sendri ya bang ini?', time: '12:13 AM' },
    ],
  },
];

async function main() {
  const plansRes = await fetch(`${STORAGE}/api/content_plans`);
  const plans = await plansRes.json();
  if (!Array.isArray(plans) || plans.length === 0) {
    console.error('No content_plans found.');
    process.exit(1);
  }

  // Target the 42-carousel plan (most recent)
  const target = plans.find((p) => p.name?.includes('42 posts')) || plans[0];
  console.log(`Patching plan: ${target.id}  "${target.name}"`);

  // Find first 3 ideas whose body slide is explainer
  const candidates = [];
  for (let i = 0; i < target.ideas.length && candidates.length < 3; i++) {
    const idea = target.ideas[i];
    const bodySlide = (idea.slides || []).find((s) => s.slide_type === 'body');
    if (bodySlide && bodySlide.body_style === 'explainer') candidates.push(i);
  }

  if (candidates.length < 3) {
    console.error(`Only found ${candidates.length} explainer ideas. Need 3.`);
    process.exit(1);
  }

  // Replace each candidate's body slide content
  for (let n = 0; n < 3; n++) {
    const ideaIdx = candidates[n];
    const idea = target.ideas[ideaIdx];
    const newSlides = (idea.slides || []).map((s) => {
      if (s.slide_type !== 'body') return s;
      return {
        ...s,
        body_style: 'testimonial',
        ...TESTIMONIALS[n],
        // Clear other body-style content fields so renderer is unambiguous
        body_text: undefined,
        body_bullets: undefined,
        body_stat: undefined,
        body_stat_label: undefined,
        // Drop any stale rendered_post_id so re-rendering picks up the new style
        rendered_post_id: undefined,
      };
    });
    // Reset top-level status so the renderer treats this idea as needing render
    target.ideas[ideaIdx] = {
      ...idea,
      slides: newSlides,
      status: 'approved',
      rendered_post_id: undefined,
    };
    console.log(`  #${ideaIdx + 1}: "${idea.headline}" → testimonial style`);
  }

  // Save back
  const saveRes = await fetch(`${STORAGE}/api/content_plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plans),
  });
  if (!saveRes.ok) {
    console.error('Save failed:', saveRes.status, await saveRes.text());
    process.exit(1);
  }

  console.log(`\n✓ 3 testimonials patched into the plan.`);
  console.log(`  Reload Plan → Queue and hit Render batch.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
