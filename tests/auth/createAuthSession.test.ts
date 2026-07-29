import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import env from '../../src/env';
import AuthSession from '../../src/models/AuthSession';
import createAuthSession from '../../src/utils/auth/createAuthSession';
import { hashRefreshToken } from '../../src/utils/auth/refreshToken';

describe('createAuthSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stores only the refresh token hash and returns a verifiable access token', async () => {
    let savedRefreshTokenHash: string | undefined;
    vi.spyOn(AuthSession.prototype, 'save').mockImplementation(async function saveSession() {
      savedRefreshTokenHash = this.refreshTokenHash;
      return this;
    });
    const userId = new Types.ObjectId();

    const auth = await createAuthSession({ id: userId, role: 'user' });
    const payload = jwt.verify(auth.accessToken, env.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
      issuer: env.AUTH_DOMAIN,
      audience: 'beseen-api',
    });

    expect(auth.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(savedRefreshTokenHash).toBe(hashRefreshToken(auth.refreshToken));
    expect(savedRefreshTokenHash).not.toBe(auth.refreshToken);
    expect(payload).toMatchObject({
      sub: userId.toString(),
      type: 'access',
      role: 'user',
    });
    expect(auth.refreshTokenExpiresAt.toISOString()).toBe('2026-08-26T12:00:00.000Z');
  });
});
