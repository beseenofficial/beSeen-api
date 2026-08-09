import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import User from '../../src/models/User';

describe('GET /v1/users/username/availability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes and reports an available username', async () => {
    const existsSpy = vi.spyOn(User, 'exists').mockResolvedValue(null);

    const response = await request(app)
      .get('/v1/users/username/availability')
      .query({ username: '  New_User  ' });

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      username: 'new_user',
      available: true,
      reason: null,
    });
    expect(existsSpy).toHaveBeenCalledWith({ username: 'new_user' });
  });

  it('reports a username already held by any account', async () => {
    vi.spyOn(User, 'exists').mockResolvedValue({ _id: new Types.ObjectId() });

    const response = await request(app)
      .get('/v1/users/username/availability')
      .query({ username: 'taken_user' });

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      username: 'taken_user',
      available: false,
      reason: 'taken',
    });
  });

  it('returns form-friendly responses for reserved and invalid usernames without database access', async () => {
    const existsSpy = vi.spyOn(User, 'exists');

    const reservedResponse = await request(app)
      .get('/v1/users/username/availability')
      .query({ username: 'Me' });

    const invalidResponse = await request(app)
      .get('/v1/users/username/availability')
      .query({ username: 'ab!' });

    expect(reservedResponse.status).toBe(200);
    expect(reservedResponse.body.result).toEqual({
      username: 'me',
      available: false,
      reason: 'reserved',
    });
    expect(invalidResponse.status).toBe(200);
    expect(invalidResponse.body.result).toEqual({
      username: 'ab!',
      available: false,
      reason: 'invalid',
    });
    expect(existsSpy).not.toHaveBeenCalled();
  });

  it('requires a username query value', async () => {
    const response = await request(app).get('/v1/users/username/availability');

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
  });
});
