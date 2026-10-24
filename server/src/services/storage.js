'use strict';
/**
 * File storage for uploaded images.
 * Cloudflare R2 (S3-compatible) when configured, so images survive redeploys on hosts
 * with a throwaway disk (Render, Railway…). Falls back to server/uploads for local dev.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const FOLDER_RE = /^[a-z0-9-]+$/;
const FILENAME_RE = /^[0-9]+-[a-f0-9]{12}\.[a-z0-9]{2,5}$/;

const s = () => config.storage;

function isR2Configured() {
    const c = s();
    return Boolean(c.r2AccountId && c.r2AccessKeyId && c.r2SecretAccessKey && c.r2Bucket && c.r2PublicUrl);
}

let client;
function r2Client() {
    if (!client) {
        const { S3Client } = require('@aws-sdk/client-s3');
        client = new S3Client({
            region: 'auto',
            endpoint: `https://${s().r2AccountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: s().r2AccessKeyId, secretAccessKey: s().r2SecretAccessKey },
        });
    }
    return client;
}

// Never derived from the client's filename: random id + an extension the server chose
function uniqueFilename(extension) {
    return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`;
}

/** Where local-disk files are served from. Prefers the configured public URL over the request host. */
function localPublicBase(req) {
    if (s().publicApiUrl) return s().publicApiUrl;
    if (req) return `${req.protocol}://${req.get('host')}`;
    return `http://localhost:${config.app.port}`;
}

/** Saves a buffer and returns { url, key } where key is "folder/filename". */
async function saveFile({ buffer, folder = 'images', extension, contentType, req }) {
    if (!FOLDER_RE.test(folder)) throw new Error('Invalid upload folder');
    const filename = uniqueFilename(extension);
    const key = `${folder}/${filename}`;

    if (isR2Configured()) {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await r2Client().send(new PutObjectCommand({
            Bucket: s().r2Bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
        }));
        return { url: `${s().r2PublicUrl}/${key}`, key };
    }

    const dir = path.join(UPLOAD_ROOT, folder);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), buffer);
    return { url: `${localPublicBase(req)}/uploads/${key}`, key };
}

/** Turns "folder/filename" into a safe key, or null when it is anything else. */
function safeKey(key) {
    const [folder, filename, extra] = String(key || '').split('/');
    if (extra !== undefined || !FOLDER_RE.test(folder || '') || !FILENAME_RE.test(filename || '')) return null;
    return `${folder}/${filename}`;
}

/** Deletes by key. Returns false when the key is invalid or the file is missing. */
async function deleteFile(key) {
    const clean = safeKey(key);
    if (!clean) return false;

    if (isR2Configured()) {
        const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
        await r2Client().send(new DeleteObjectCommand({ Bucket: s().r2Bucket, Key: clean }));
        return true;
    }

    try {
        await fs.promises.unlink(path.join(UPLOAD_ROOT, clean));
        return true;
    } catch {
        return false;
    }
}

module.exports = { UPLOAD_ROOT, isR2Configured, saveFile, deleteFile, safeKey };
