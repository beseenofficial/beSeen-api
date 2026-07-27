import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthSession from '../../src/models/AuthSession';
import User from '../../src/models/User';
import refreshAuthSession from '../../src/utils/auth/refreshAuthSession';
import { hashRefreshToken } from '../../src/utils/auth/refreshToken';

const REFRESH_TOKEN = 'r'.repeat(43);

const queryResult = <T>(value: T) => ({
  exec: vi.fn().mockResolvedValue(value),
});

describe('refreshAuthSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('atomically rotates a valid refresh token', async () => {
    const authSessionId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const expiresAt = new Date('2026-08-26T12:00:00.000Z');
    vi.spyOn(AuthSession, 'findOne').mockReturnValue(
      queryResult({ _id: authSessionId, user: userId, expiresAt }) as never,
    );
    const rotateSpy = vi
      .spyOn(AuthSession, 'findOneAndUpdate')
      .mockReturnValue(queryResult({ _id: authSessionId, user: userId, expiresAt }) as never);
    vi.spyOn(User, 'findOne').mockReturnValue(
      queryResult({ _id: userId, role: 'user', accountType: 'regular' }) as never,
    );

    const result = await refreshAuthSession(REFRESH_TOKEN);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.auth.refreshToken).not.toBe(REFRESH_TOKEN);
    expect(result.auth.refreshTokenExpiresAt).toBe(expiresAt);
    expect(rotateSpy).toHaveBeenCalledWith(
      {
        _id: authSessionId,
        refreshTokenHash: hashRefreshToken(REFRESH_TOKEN),
        revokedAt: null,
        expiresAt: { $gt: new Date('2026-07-27T12:00:00.000Z') },
      },
      {
        $set: {
          refreshTokenHash: hashRefreshToken(result.auth.refreshToken),
          lastUsedAt: new Date('2026-07-27T12:00:00.000Z'),
        },
      },
      { new: true },
    );
  });

  it('rejects an unknown, expired, revoked, or already-rotated token', async () => {
    vi.spyOn(AuthSession, 'findOne').mockReturnValue(queryResult(null) as never);
    const rotateSpy = vi.spyOn(AuthSession, 'findOneAndUpdate');
    const userLookupSpy = vi.spyOn(User, 'findOne');

    const result = await refreshAuthSession(REFRESH_TOKEN);

    expect(result).toEqual({ ok: false, reason: 'refresh_token_invalid' });
    expect(userLookupSpy).not.toHaveBeenCalled();
    expect(rotateSpy).not.toHaveBeenCalled();
  });
});
