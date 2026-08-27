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
    expect(user.role).toBe('user');
    expect(user.status).toBe('active');
    expect(user.discoverScore).toBe(0);
    expect(user.discoverScoreVersion).toBe(3);
    expect(user.discoverScoreUpdatedAt).toBeNull();
    expect(user.lastActiveAt).toBeNull();
    expect(user.lastActivityHeartbeatAt).toBeNull();
    expect(user.toObject()).not.toHaveProperty('accountType');
    expect(user.toObject()).not.toHaveProperty('bio');
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
});
