import { describe, expect, it } from 'vitest';

import User from '../../src/models/User';

const VALID_STELLAR_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const validUserInput = () => ({
  walletAddress: VALID_STELLAR_ADDRESS,
  username: 'beseen_user',
  displayName: 'BeSeen User',
});

describe('User model', () => {
  it('normalizes identity fields and applies safe defaults', async () => {
    const user = new User({
      ...validUserInput(),
      walletAddress: VALID_STELLAR_ADDRESS.toLowerCase(),
      username: '  BeSeen_User  ',
      displayName: '  BeSeen User  ',
    });

    await user.validate();

    expect(user.walletAddress).toBe(VALID_STELLAR_ADDRESS);
    expect(user.username).toBe('beseen_user');
    expect(user.displayName).toBe('BeSeen User');
    expect(user.bio).toBe('');
    expect(user.avatarUrl).toBeNull();
    expect(user.accountType).toBe('regular');
    expect(user.role).toBe('user');
    expect(user.status).toBe('active');
    expect(user.deletedAt).toBeNull();
  });

  it('rejects an invalid Stellar address', async () => {
    const user = new User({
      ...validUserInput(),
      walletAddress: 'not-a-stellar-address',
    });

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        walletAddress: expect.anything(),
      },
    });
  });

  it('rejects a username outside the allowed format', async () => {
    const user = new User({
      ...validUserInput(),
      username: 'invalid username!',
    });

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        username: expect.anything(),
      },
    });
  });

  it('declares unique indexes for wallet address and username', () => {
    const indexes = User.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { walletAddress: 1 },
          expect.objectContaining({ unique: true, name: 'users_wallet_address_unique' }),
        ],
        [{ username: 1 }, expect.objectContaining({ unique: true, name: 'users_username_unique' })],
      ]),
    );
  });
});
