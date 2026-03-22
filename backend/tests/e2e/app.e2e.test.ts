import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../src/app';

describe('App E2E', () => {
  it('returns health status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('applies CORS for an allowed origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
  });

  it('blocks authenticated project routes without an access token cookie', async () => {
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Please refresh your page');
  });

  it('rejects session refresh when the refresh token cookie is missing', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Refresh token missing');
  });
});
