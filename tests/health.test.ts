import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app';

describe('health routes', () => {
  it('returns the API health state', async () => {
    const response = await request(app).get('/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'success',
      message: 'BeSeen API is healthy',
      result: {
        service: 'beseen-api',
        state: 'ok',
      },
    });
    expect(response.body.result.timestamp).toEqual(expect.any(String));
    expect(response.body.result.uptime).toEqual(expect.any(Number));
  });

  it('returns the standard response for unknown routes', async () => {
    const response = await request(app).get('/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Route not found',
      result: {},
    });
  });
});
