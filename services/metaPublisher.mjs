/**
 * Meta Graph API publisher for Instagram carousels.
 *
 * Flow (per https://developers.facebook.com/docs/instagram-api/guides/content-publishing):
 *   1. For each image_url, POST /{ig-user-id}/media with is_carousel_item=true → returns container_id
 *   2. POST /{ig-user-id}/media with media_type=CAROUSEL + children=[ids] → returns container_id
 *   3. POST /{ig-user-id}/media_publish with creation_id=<carousel_container_id>
 *   4. GET /{published_id}?fields=permalink → permalink URL
 *
 * For single-image posts (1 imageUrl), we skip the carousel wrapping and just
 * post the single media directly.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Meta Graph API error codes that are *transient* and worth retrying.
// 9004 in particular fires intermittently on valid images ("Only photo or video
// can be accepted as media type") and almost always resolves on retry.
const TRANSIENT_CODES = new Set([
    1,     // Unknown error
    2,     // Service unavailable
    4,     // App rate limit
    17,    // User request limit reached
    32,    // Page-level rate limit
    341,   // Application limit reached
    613,   // Calls within rate limit allowed
    9004,  // Media classification glitch — fixes itself on retry
]);

const RETRY_DELAYS_MS = [10_000, 30_000, 60_000]; // 10s, 30s, 60s

async function graphPost(url, params, accessToken, attempt = 0) {
    const body = new URLSearchParams({ ...params, access_token: accessToken });
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    const json = await res.json();
    if (!res.ok || json.error) {
        const msg = json.error?.message || JSON.stringify(json);
        const code = json.error?.code;
        const transient = TRANSIENT_CODES.has(code) || res.status === 429 || res.status >= 500;
        if (transient && attempt < RETRY_DELAYS_MS.length) {
            const wait = RETRY_DELAYS_MS[attempt];
            console.log(`[meta] transient error code=${code} status=${res.status}; retrying in ${wait/1000}s (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`);
            await sleep(wait);
            return graphPost(url, params, accessToken, attempt + 1);
        }
        throw new Error(`Graph API ${res.status} (code=${code}): ${msg}`);
    }
    return json;
}

async function graphGet(url, params, accessToken) {
    const qs = new URLSearchParams({ ...params, access_token: accessToken });
    const res = await fetch(`${url}?${qs}`);
    const json = await res.json();
    if (!res.ok || json.error) {
        const msg = json.error?.message || JSON.stringify(json);
        const code = json.error?.code;
        throw new Error(`Graph API ${res.status} (code=${code}): ${msg}`);
    }
    return json;
}

/**
 * Poll the container's status_code until FINISHED, ERROR, or EXPIRED.
 * IG containers process async, especially for video; for images it's usually quick.
 */
async function waitForContainerReady(containerId, accessToken, apiVersion, maxAttempts = 20) {
    for (let i = 0; i < maxAttempts; i++) {
        const status = await graphGet(
            `https://graph.facebook.com/${apiVersion}/${containerId}`,
            { fields: 'status_code,status' },
            accessToken
        );
        if (status.status_code === 'FINISHED') return status;
        if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
            throw new Error(`container ${containerId} status: ${status.status_code} — ${status.status || ''}`);
        }
        await sleep(2000);
    }
    throw new Error(`container ${containerId} not ready after ${maxAttempts} attempts`);
}

export async function publishCarousel({ igUserId, accessToken, apiVersion = 'v21.0', imageUrls, caption }) {
    if (!igUserId) throw new Error('missing igUserId');
    if (!accessToken) throw new Error('missing accessToken');
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) throw new Error('imageUrls must be non-empty array');
    if (imageUrls.length > 10) throw new Error('IG carousels support max 10 slides');

    const base = `https://graph.facebook.com/${apiVersion}/${igUserId}`;

    // SINGLE-IMAGE PATH
    if (imageUrls.length === 1) {
        const container = await graphPost(`${base}/media`, {
            image_url: imageUrls[0],
            caption: caption || '',
        }, accessToken);
        await waitForContainerReady(container.id, accessToken, apiVersion);

        const published = await graphPost(`${base}/media_publish`, {
            creation_id: container.id,
        }, accessToken);

        let permalink = null;
        try {
            const meta = await graphGet(
                `https://graph.facebook.com/${apiVersion}/${published.id}`,
                { fields: 'permalink' },
                accessToken
            );
            permalink = meta.permalink || null;
        } catch {}

        return { id: published.id, permalink };
    }

    // CAROUSEL PATH
    // Step 1: create a container per image
    const childIds = [];
    for (const url of imageUrls) {
        const c = await graphPost(`${base}/media`, {
            image_url: url,
            is_carousel_item: 'true',
        }, accessToken);
        childIds.push(c.id);
    }

    // Step 2: wait for each child to finish processing
    for (const id of childIds) {
        await waitForContainerReady(id, accessToken, apiVersion);
    }

    // Step 3: create the carousel container referencing the children
    const carousel = await graphPost(`${base}/media`, {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: caption || '',
    }, accessToken);
    await waitForContainerReady(carousel.id, accessToken, apiVersion);

    // Step 4: publish
    const published = await graphPost(`${base}/media_publish`, {
        creation_id: carousel.id,
    }, accessToken);

    let permalink = null;
    try {
        const meta = await graphGet(
            `https://graph.facebook.com/${apiVersion}/${published.id}`,
            { fields: 'permalink' },
            accessToken
        );
        permalink = meta.permalink || null;
    } catch {}

    return { id: published.id, permalink };
}
