const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Asks the frontend host to rebuild the site, so new or changed tours, articles, destinations and
 * settings reach the prerendered pages and the sitemap. Changes are grouped: the hook is called once
 * the edits stop for `delayMs`, and at most `maxWaitMs` after the first one. Without a hook URL it does nothing.
 */
let timer = null;
let firstAt = 0;
let reasons = new Set();

async function trigger() {
    const { hookUrl } = config.siteRebuild;
    const why = [...reasons];
    clearTimeout(timer);
    timer = null;
    firstAt = 0;
    reasons = new Set();
    try {
        await axios.post(hookUrl, null, { timeout: 10_000 });
        logger.info('Site rebuild requested', { changes: why });
        return true;
    } catch (err) {
        logger.warn('Site rebuild hook failed', { status: err.response?.status, error: err.message });
        return false;
    }
}

function requestRebuild(reason) {
    const { hookUrl, delayMs, maxWaitMs } = config.siteRebuild;
    if (!hookUrl) return;
    const now = Date.now();
    if (!firstAt) firstAt = now;
    if (reasons.size < 20) reasons.add(reason);
    clearTimeout(timer);
    const wait = Math.max(0, Math.min(delayMs, firstAt + maxWaitMs - now));
    timer = setTimeout(trigger, wait);
    timer.unref?.();
}

// On shutdown a waiting rebuild is sent now rather than lost
function flushRebuild() {
    return timer ? trigger() : Promise.resolve(false);
}

const isPending = () => timer !== null;

module.exports = { requestRebuild, flushRebuild, isPending };
