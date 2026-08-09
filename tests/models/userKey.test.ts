import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import UserKey from '../../src/models/UserKey';

const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');

const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');

describe('UserKey model', () => {
  it('accepts canonical public keys and applies versioned defaults', async () => {
    const userKey = new UserKey({
      user: new Types.ObjectId(),
      signingPublicKey: SIGNING_PUBLIC_KEY,
      encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
    });

    await userKey.validate();

    expect(userKey.derivationVersion).toBe(1);
    expect(userKey.status).toBe('active');
    expect(userKey.revokedAt).toBeNull();
  });

  it('rejects malformed public keys', async () => {
    const userKey = new UserKey({
      user: new Types.ObjectId(),
      signingPublicKey: 'invalid',
      encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
    });

    await expect(userKey.validate()).rejects.toMatchObject({
      errors: {
        signingPublicKey: expect.anything(),
      },
    });
  });

  it('declares identity and active-key uniqueness indexes', () => {
    const indexes = UserKey.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { user: 1, derivationVersion: 1 },
          expect.objectContaining({
            unique: true,
            name: 'user_keys_user_derivation_version_unique',
          }),
        ],
        [
          { user: 1 },
          expect.objectContaining({
            unique: true,
            partialFilterExpression: { status: 'active' },
            name: 'user_keys_one_active_per_user',
          }),
        ],
      ]),
    );
  });
});
