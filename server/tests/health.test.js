const request = require('supertest');
const app = require('../src/app');

describe('app', () => {
    it('responds on the root route', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
    });
});
