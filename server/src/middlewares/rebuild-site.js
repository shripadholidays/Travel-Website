const { requestRebuild } = require('../services/site-rebuild');

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

// After a successful change to public content, schedules a site rebuild (see services/site-rebuild)
module.exports = function rebuildSite(req, res, next) {
    if (READS.has(req.method)) return next();
    res.on('finish', () => {
        if (res.statusCode < 400) requestRebuild(`${req.method} ${req.originalUrl.split('?')[0]}`);
    });
    next();
};
