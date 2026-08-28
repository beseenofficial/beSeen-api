import { describe, expect, it } from 'vitest';

import User from '../../src/models/User';

const WALLET = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('User model', () => {
  it('stores only the minimal public profile plus internal account state', async () => {
    const user = new User({ walletAddress: WALLET.toLowerCase(), username: '  BeSeen_User  ' });
    await user.validate();

    expect(user.walletAddress).toBe(WALLET);
    expect(user.username).toBe('beseen_user');
    expect(user.avatar).toBeNull();
    expect(user.avatarObjectKey).toBeNull();
    expect(user.bio).toBeNull();
    expect(user.verificationGrantedAt).toBeNull();
    expect(user.verificationExpiresAt).toBeNull();
    expect(user.role).toBe('user');
    expect(user.status).toBe('active');
    expect(user.discoverScore).toBe(0);
    expect(user.discoverScoreVersion).toBe(3);
    expect(user.discoverScoreUpdatedAt).toBeNull();
    expect(user.lastActiveAt).toBeNull();
    expect(user.lastActivityHeartbeatAt).toBeNull();
    expect(user.toObject()).not.toHaveProperty('accountType');
    expect(user.toObject()).not.toHaveProperty('displayName');
  });

  it('declares a stable Discover ranking index', () => {
    expect(User.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { status: 1, discoverScore: -1, _id: -1 },
          expect.objectContaining({ name: 'users_discover_ranking' }),
        ],
      ]),
    );
  });

  it('rejects invalid Stellar addresses and usernames', async () => {
    await expect(
      new User({ walletAddress: 'invalid', username: 'ok_user' }).validate(),
    ).rejects.toThrow();
    await expect(
      new User({ walletAddress: WALLET, username: 'bad-name' }).validate(),
    ).rejects.toThrow();
  });

  it('accepts a short single-line bio and rejects longer or multiline values', async () => {
    await expect(
      new User({
        walletAddress: WALLET,
        username: 'valid_user',
        bio: 'Privacy belongs to everyone',
      }).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new User({ walletAddress: WALLET, username: 'valid_user', bio: 'a'.repeat(64) }).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new User({ walletAddress: WALLET, username: 'valid_user', bio: 'a'.repeat(65) }).validate(),
    ).rejects.toThrow();
    await expect(
      new User({ walletAddress: WALLET, username: 'valid_user', bio: 'first\nsecond' }).validate(),
    ).rejects.toThrow();
  });

  it('requires a complete verification period with expiration after its grant time', async () => {
    const grantedAt = new Date('2026-08-01T00:00:00.000Z');
    const expiresAt = new Date('2026-09-01T00:00:00.000Z');

    await expect(
      new User({
        walletAddress: WALLET,
        username: 'verified_user',
        verificationGrantedAt: grantedAt,
        verificationExpiresAt: expiresAt,
      }).validate(),
    ).resolves.toBeUndefined();
    await expect(
      new User({
        walletAddress: WALLET,
        username: 'partial_user',
        verificationExpiresAt: expiresAt,
      }).validate(),
    ).rejects.toThrow();
    await expect(
      new User({
        walletAddress: WALLET,
        username: 'expired_before_grant',
        verificationGrantedAt: expiresAt,
        verificationExpiresAt: grantedAt,
      }).validate(),
    ).rejects.toThrow();
  });
});
