import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { publishCarousel } from './services/metaPublisher.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database');

// Load .env (so the scheduler can read META_ACCESS_TOKEN etc.)
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));

const getFile = (name) => path.join(DB_PATH, `${name}.json`);

const readCollection = async (name) => {
    try {
        const data = await fs.readFile(getFile(name), 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
    }
};

const writeCollection = async (name, data) => {
    await fs.writeFile(getFile(name), JSON.stringify(data, null, 2));
};

// ─── Storage API ──────────────────────────────────────────────────────────────

app.get('/api/:collection', async (req, res) => {
    try {
        const data = await readCollection(req.params.collection);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/:collection', async (req, res) => {
    try {
        const collection = req.params.collection;
        const filePath = getFile(collection);

        if (collection === 'usage_logs' && !Array.isArray(req.body)) {
            // Append mode for usage logs
            let current = [];
            try {
                const data = await fs.readFile(filePath, 'utf8');
                current = JSON.parse(data);
                if (!Array.isArray(current)) current = [];
            } catch (e) {
                current = [];
            }
            current.push(req.body);
            await fs.writeFile(filePath, JSON.stringify(current, null, 2));
        } else {
            await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── Health endpoint ─────────────────────────────────────────────────────────

app.get('/healthz', (req, res) => {
    res.json({
        ok: true,
        scheduler: SCHEDULER_ENABLED,
        last_tick_at: lastTickAt,
        last_tick: lastTickSummary,
        env: {
            has_meta_token: !!process.env.META_ACCESS_TOKEN,
            has_ig_user_id: !!process.env.IG_USER_ID,
            public_base_url: process.env.PUBLIC_BASE_URL || null,
            node_env: process.env.NODE_ENV || 'development',
        },
    });
});

// ─── Public image endpoint (for Meta to fetch via image_url) ─────────────────
// GET /public/post/<post_id>.png → serves the GeneratedPost imageSource as image/png.

app.get('/public/post/:postId.png', async (req, res) => {
    try {
        const posts = await readCollection('posts');
        const post = posts.find((p) => p.id === req.params.postId);
        if (!post) return res.status(404).send('post not found');

        const m = (post.imageSource || '').match(/^data:image\/(png|jpe?g);base64,(.+)$/);
        if (!m) return res.status(415).send('not a base64 image');

        const buf = Buffer.from(m[2], 'base64');
        res.setHeader('Content-Type', `image/${m[1] === 'jpg' ? 'jpeg' : m[1]}`);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(buf);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ─── Scheduler status endpoint ───────────────────────────────────────────────

let lastTickAt = null;
let lastTickSummary = null;
const recentEvents = []; // ring buffer of last 50 publish attempts

const pushEvent = (event) => {
    recentEvents.unshift({ at: Date.now(), ...event });
    if (recentEvents.length > 50) recentEvents.length = 50;
};

app.get('/api/scheduler/status', async (req, res) => {
    const plans = await readCollection('content_plans');
    const allIdeas = plans.flatMap((p) => (p.ideas || []).map((i) => ({ planId: p.id, ...i })));
    const nowMs = Date.now();
    const upcoming = allIdeas
        .filter((i) => i.status === 'scheduled' && i.scheduled_at && i.scheduled_at > nowMs)
        .sort((a, b) => a.scheduled_at - b.scheduled_at)
        .slice(0, 10)
        .map((i) => ({ id: i.id, headline: i.headline, scheduled_at_iso: i.scheduled_at_iso, planId: i.planId }));
    const overdue = allIdeas
        .filter((i) => i.status === 'scheduled' && i.scheduled_at && i.scheduled_at <= nowMs)
        .slice(0, 10)
        .map((i) => ({ id: i.id, headline: i.headline, scheduled_at_iso: i.scheduled_at_iso }));

    res.json({
        cron_enabled: SCHEDULER_ENABLED,
        last_tick_at: lastTickAt,
        last_tick: lastTickSummary,
        recent_events: recentEvents,
        upcoming,
        overdue,
        meta: {
            has_token: !!process.env.META_ACCESS_TOKEN,
            ig_user_id: process.env.IG_USER_ID || null,
            public_base_url: process.env.PUBLIC_BASE_URL || null,
        },
    });
});

// Manual one-off publish trigger (used for testing a single idea)
app.post('/api/scheduler/publish-now', async (req, res) => {
    const { ideaId, dryRun } = req.body || {};
    if (!ideaId) return res.status(400).json({ error: 'missing ideaId' });
    try {
        const result = await publishIdeaById(ideaId, { dryRun: !!dryRun });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Publisher core ──────────────────────────────────────────────────────────

/**
 * Resolve which IG credentials to use for publishing a plan's idea.
 *
 * Lookup order:
 *   1. social_accounts collection — find enabled IG entry where brand_id === plan.brand_id
 *   2. Fallback to env vars (Qlipper legacy default — works because Qlipper was the
 *      first/only brand when the system was bootstrapped)
 *
 * Returns null if no usable credentials found.
 */
const resolveIgCreds = async (plan) => {
    let accounts = [];
    try { accounts = await readCollection('social_accounts'); } catch {}

    const match = (Array.isArray(accounts) ? accounts : []).find(
        (a) => a && a.enabled !== false && a.platform === 'instagram' && a.brand_id === plan?.brand_id
    );

    if (match) {
        return {
            source: 'social_accounts',
            account_handle: match.handle,
            igUserId: match.account_id,
            accessToken: match.access_token,
            apiVersion: match.api_version || 'v21.0',
        };
    }

    // Fallback to env — ONLY for the legacy brand explicitly bound to the env token.
    // Without this gate, ANY brand without a social_accounts entry would cross-publish
    // to the env-default account (e.g. Pidgo ideas posting to @qlipper.ai).
    const LEGACY_ENV_BRAND_ID = process.env.LEGACY_ENV_BRAND_ID || '1779856883804'; // Qlipper.ai
    if (
        plan?.brand_id === LEGACY_ENV_BRAND_ID
        && process.env.IG_USER_ID && process.env.META_ACCESS_TOKEN
    ) {
        return {
            source: 'env',
            account_handle: 'env-default',
            igUserId: process.env.IG_USER_ID,
            accessToken: process.env.META_ACCESS_TOKEN,
            apiVersion: process.env.META_API_VERSION || 'v21.0',
        };
    }

    return null;
};

const publishIdeaById = async (ideaId, opts = {}) => {
    const plans = await readCollection('content_plans');
    let foundIdea = null;
    let foundPlan = null;
    for (const p of plans) {
        const idx = (p.ideas || []).findIndex((i) => i.id === ideaId);
        if (idx >= 0) { foundIdea = p.ideas[idx]; foundPlan = p; break; }
    }
    if (!foundIdea) throw new Error(`idea ${ideaId} not found`);

    const slides = foundIdea.slides || [];
    const slideIds = slides.map((s) => s.rendered_post_id).filter(Boolean);
    if (slideIds.length === 0) {
        // Fall back to single-post mode (legacy)
        if (foundIdea.rendered_post_id) slideIds.push(foundIdea.rendered_post_id);
    }
    if (slideIds.length === 0) throw new Error('idea has no rendered slides yet');

    const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    if (!baseUrl) throw new Error('PUBLIC_BASE_URL not set in .env (need ngrok/cloudflared tunnel URL)');

    const imageUrls = slideIds.map((pid) => `${baseUrl}/public/post/${pid}.png`);

    const caption = (foundIdea.caption_draft || '') +
        ((foundIdea.hashtags || []).length ? '\n\n' + foundIdea.hashtags.join(' ') : '');

    // Per-brand credentials lookup
    const creds = await resolveIgCreds(foundPlan);
    if (!creds) {
        throw new Error(`no IG credentials for brand_id=${foundPlan?.brand_id} — add a social_accounts entry`);
    }

    const event = {
        ideaId: foundIdea.id,
        headline: foundIdea.headline,
        slide_count: imageUrls.length,
        dry_run: !!opts.dryRun,
        account: creds.account_handle,
        creds_source: creds.source,
    };

    if (opts.dryRun) {
        pushEvent({ type: 'dry_run', ...event, image_urls: imageUrls, caption });
        return { ok: true, dry_run: true, image_urls: imageUrls, caption, account: creds.account_handle };
    }

    try {
        const result = await publishCarousel({
            igUserId: creds.igUserId,
            accessToken: creds.accessToken,
            apiVersion: creds.apiVersion,
            imageUrls,
            caption,
        });

        // Mark idea + slides as published
        foundIdea.status = 'published';
        foundIdea.published_at = Date.now();
        foundIdea.published_id = result.id;
        foundIdea.published_permalink = result.permalink || null;
        for (const s of slides) {
            if (s.rendered_post_id) s.status = 'published';
        }
        await writeCollection('content_plans', plans);

        pushEvent({ type: 'published', ...event, ig_media_id: result.id });
        return { ok: true, ig_media_id: result.id, permalink: result.permalink };
    } catch (err) {
        foundIdea.status = 'failed';
        foundIdea.last_error = err.message;
        foundIdea.publish_retries = (foundIdea.publish_retries || 0) + 1;
        foundIdea.last_failed_at = Date.now();
        await writeCollection('content_plans', plans);
        pushEvent({ type: 'failed', ...event, error: err.message, retries: foundIdea.publish_retries });
        throw err;
    }
};

// ─── Cron worker ──────────────────────────────────────────────────────────────

const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED !== '0';
const TICK_MS = 60_000;                       // 1 minute
const MISSED_WINDOW_MS = 6 * 3600 * 1000;     // give up after >6h overdue
const MAX_RETRIES = 5;                        // failed-post retry budget per idea

// Global tick lock — prevents a tick firing while the previous one is still
// processing publishes. A carousel publish can take 10-60s; without this, the
// next 60s tick re-reads 'scheduled' ideas and double-publishes them.
let tickInProgress = false;
// How long a 'publishing' claim is considered fresh. After this, the cron may
// re-pick it up assuming the previous publish crashed mid-flight.
const PUBLISH_CLAIM_TTL_MS = 10 * 60 * 1000; // 10 minutes

const cronTick = async () => {
    if (tickInProgress) {
        // Skip this tick — previous one is still running
        return;
    }
    tickInProgress = true;
    lastTickAt = Date.now();
    const summary = { checked: 0, due: 0, retry: 0, published: 0, failed: 0, skipped_old: 0 };

    try {
        const plans = await readCollection('content_plans');
        const now = Date.now();
        const due = [];
        let stateMutated = false;

        for (const p of plans) {
            for (const i of p.ideas || []) {
                summary.checked++;
                if (!i.scheduled_at) continue;
                const overdue = i.scheduled_at <= now;
                const missed = now - i.scheduled_at > MISSED_WINDOW_MS;

                if (i.status === 'scheduled' && overdue && !missed) {
                    due.push(i);
                } else if (i.status === 'publishing') {
                    // Stuck 'publishing' claim — assume crashed. Reset only if stale.
                    const claimAge = now - (i.publishing_started_at || 0);
                    if (claimAge > PUBLISH_CLAIM_TTL_MS) {
                        i.status = 'failed';
                        i.last_error = `stale publishing claim (${Math.round(claimAge / 60000)}m)`;
                        stateMutated = true;
                    }
                    // else: still being published by another in-flight call → skip
                } else if (i.status === 'failed' && overdue && !missed) {
                    // Re-pick up transient failures (e.g. Meta 9004) until budget exhausted.
                    const retries = i.publish_retries || 0;
                    if (retries < MAX_RETRIES) {
                        i.status = 'scheduled';
                        stateMutated = true;
                        due.push(i);
                        summary.retry++;
                    }
                } else if (i.status === 'scheduled' && missed) {
                    i.status = 'failed';
                    i.last_error = 'missed schedule window (>6h overdue)';
                    summary.skipped_old++;
                    stateMutated = true;
                }
            }
        }
        summary.due = due.length;

        // ATOMIC CLAIM: before doing any Meta calls, mark all due ideas as 'publishing'
        // in a single write. This way even if cron re-fires (e.g. tickInProgress flag
        // misses due to race), the ideas are visibly in-flight and won't be re-picked.
        for (const idea of due) {
            idea.status = 'publishing';
            idea.publishing_started_at = now;
            stateMutated = true;
        }
        if (stateMutated) await writeCollection('content_plans', plans);

        // Publish due posts sequentially
        for (const idea of due) {
            try {
                await publishIdeaById(idea.id);
                summary.published++;
            } catch (err) {
                summary.failed++;
                console.error(`[scheduler] publish failed for ${idea.id}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[scheduler] tick error:', err.message);
    } finally {
        tickInProgress = false;
    }

    lastTickSummary = summary;
    if (summary.due > 0 || summary.skipped_old > 0 || summary.retry > 0) {
        console.log(`[scheduler] tick: ${JSON.stringify(summary)}`);
    }
};

if (SCHEDULER_ENABLED) {
    setInterval(cronTick, TICK_MS);
    // Run once shortly after boot too
    setTimeout(cronTick, 5000);
}

// ─── Production: serve the built Vite SPA from the same port ─────────────────
// When NODE_ENV=production AND dist/ exists, mount it as static.
// Falls back to index.html for client-side routes.

if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    try {
        // Probe — if dist/index.html exists, mount it
        await fs.access(path.join(distPath, 'index.html'));
        app.use(express.static(distPath));
        app.get('*', (req, res, next) => {
            // Don't catch /api, /public, /healthz — those routes already handled above
            if (req.path.startsWith('/api') || req.path.startsWith('/public') || req.path === '/healthz') return next();
            res.sendFile(path.join(distPath, 'index.html'));
        });
        console.log(`Serving static SPA from ${distPath}`);
    } catch {
        console.log(`NODE_ENV=production but dist/ not found at ${distPath} — skipping static mount.`);
    }
}

// ─── Boot ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
    console.log(`Storage server running on http://localhost:${PORT}`);
    if (SCHEDULER_ENABLED) {
        console.log(`Scheduler enabled — tick every ${TICK_MS / 1000}s`);
        console.log(`  META configured: ${!!process.env.META_ACCESS_TOKEN}, IG_USER_ID: ${process.env.IG_USER_ID || '(none)'}`);
        console.log(`  PUBLIC_BASE_URL: ${process.env.PUBLIC_BASE_URL || '(unset — set this once your tunnel is up)'}`);
    } else {
        console.log(`Scheduler DISABLED (SCHEDULER_ENABLED=0)`);
    }
});
