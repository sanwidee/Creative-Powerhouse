#!/usr/bin/env node
/**
 * Mark every idea in the Qlipper 42-carousel plan as 'scheduled'.
 * (Acts as the "approve all + schedule" button until we build that UI.)
 */

const STORAGE = process.env.POWERHOUSE_STORAGE_URL || 'http://localhost:3001';

async function main() {
  const plans = await fetch(`${STORAGE}/api/content_plans`).then((r) => r.json());
  if (!Array.isArray(plans) || plans.length === 0) {
    console.error('No content_plans found.');
    process.exit(1);
  }

  const target = plans.find((p) => p.name?.includes('42 posts')) || plans[0];
  console.log(`Plan: ${target.id}  "${target.name}"`);

  let updated = 0;
  for (const idea of target.ideas) {
    // Only flip statuses that haven't moved past scheduled
    if (idea.status === 'approved' || idea.status === 'rendered') {
      idea.status = 'scheduled';
      updated++;
    }
  }

  if (updated === 0) {
    console.log('Nothing to update (all ideas already scheduled / published).');
    return;
  }

  const res = await fetch(`${STORAGE}/api/content_plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plans),
  });
  if (!res.ok) {
    console.error('Save failed:', res.status, await res.text());
    process.exit(1);
  }

  console.log(`✓ Marked ${updated} ideas as 'scheduled'.`);
  console.log(`  Queue now reflects: ready to publish at their scheduled_at times.`);
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
