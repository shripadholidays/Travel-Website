'use strict';
const sharp = require('sharp');

sharp.cache(false);

const MAX_DIMENSION = 2000;   // wide enough for full-width hero banners
const WEBP_QUALITY = 82;

/**
 * Decodes the upload as a real image (whatever its declared type), fixes phone rotation,
 * strips metadata (GPS etc.) and re-encodes as WebP. Returns null for anything that isn't an image.
 */
async function compressImage(buffer) {
    try {
        const output = await sharp(buffer, { limitInputPixels: 50_000_000 })
            .rotate()
            .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
        return { buffer: output, contentType: 'image/webp', extension: 'webp' };
    } catch {
        return null;
    }
}

module.exports = { compressImage };
