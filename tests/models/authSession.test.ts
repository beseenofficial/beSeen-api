import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import AuthSession from '../../src/models/AuthSession';
import { hashRefreshToken } from '../../src/utils/auth/refreshToken';

describe('AuthSession model', () => {
  it('stores only a refresh token hash and declares expiration indexes', async () => {
    const session = new AuthSession({
      user: new Types.ObjectId(),
      refreshTokenHash: hashRefreshToken('r'.repeat(43)),
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    await session.validate();

    expect(session.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.revokedAt).toBeNull();
    expect(AuthSession.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { refreshTokenHash: 1 },
          expect.objectContaining({
            unique: true,
            name: 'auth_sessions_refresh_token_hash_unique',
          }),
        ],
        [
          { expiresAt: 1 },
          expect.objectContaining({ expireAfterSeconds: 0, name: 'auth_sessions_expiry_ttl' }),
        ],
      ]),
    );
  });
});
