const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const request = require('supertest');
const app = require('../src/app');
const { UPLOAD_ROOT, safeKey } = require('../src/services/storage');
const { connect, disconnect, reset, createUser, cookieFor } = require('./helpers');

sharp.cache(false);
const png = () => sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#f97316' } }).png().toBuffer();

describe('image uploads (local disk fallback)', () => {
    let editor;
    const saved = [];

    beforeAll(connect);
    beforeEach(async () => {
        await reset();
        editor = await createUser('editor');
    });
    afterAll(async () => {
        saved.forEach((key) => fs.rmSync(path.join(UPLOAD_ROOT, key), { force: true }));
        await disconnect();
    });

    it('compresses to WebP, caps the size and returns a public URL', async () => {
        const res = await request(app).post('/api/v1/upload').set('Cookie', cookieFor(editor))
            .attach('file', await png(), { filename: '../../evil.html', contentType: 'image/png' });
        expect(res.status).toBe(200);
        const { url, filename } = res.body.data;
        saved.push(filename);
        expect(filename).toMatch(/^images\/\d+-[a-f0-9]{12}\.webp$/);
        expect(url.endsWith(`/uploads/${filename}`)).toBe(true);

        const meta = await sharp(fs.readFileSync(path.join(UPLOAD_ROOT, filename))).metadata();
        expect(meta.format).toBe('webp');
        expect(meta.width).toBe(2000);

        const served = await request(app).get(`/uploads/${filename}`);
        expect(served.status).toBe(200);
        expect(served.headers['x-content-type-options']).toBe('nosniff');
    });

    it('rejects files that only claim to be images, and SVG', async () => {
        const cookie = cookieFor(editor);
        const fake = await request(app).post('/api/v1/upload').set('Cookie', cookie)
            .attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
        expect(fake.status).toBe(400);

        const svg = await request(app).post('/api/v1/upload').set('Cookie', cookie)
            .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
        expect(svg.status).toBe(400);
    });

    it('only lets staff upload, and deletes by key', async () => {
        const traveller = await createUser('user');
        const denied = await request(app).post('/api/v1/upload').set('Cookie', cookieFor(traveller))
            .attach('file', await png(), { filename: 'a.png', contentType: 'image/png' });
        expect(denied.status).toBe(403);

        const up = await request(app).post('/api/v1/upload').set('Cookie', cookieFor(editor))
            .attach('file', await png(), { filename: 'a.png', contentType: 'image/png' });
        const key = up.body.data.filename;
        const del = await request(app).delete(`/api/v1/upload/${key}`).set('Cookie', cookieFor(editor));
        expect(del.status).toBe(200);
        expect(fs.existsSync(path.join(UPLOAD_ROOT, key))).toBe(false);
    });

    it('refuses keys that could escape the uploads folder', () => {
        expect(safeKey('images/../../server.js')).toBeNull();
        expect(safeKey('../images/1-abcdefabcdef.webp')).toBeNull();
        expect(safeKey('images/1700000000000-abcdefabcdef.webp')).toBe('images/1700000000000-abcdefabcdef.webp');
    });
});
