import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import BroadcastRecipient from '../../src/models/BroadcastRecipient';

describe('BroadcastRecipient model', () => {
  it('snapshots one public encryption key per broadcast recipient', async () => {
    const row = new BroadcastRecipient({
      broadcast: new Types.ObjectId(),
      recipient: new Types.ObjectId(),
      username: 'member_user',
      keyVersion: 1,
      encryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
    });

    await row.validate();

    expect(row.encryptedBroadcastKey).toBeNull();
    expect(BroadcastRecipient.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { broadcast: 1, recipient: 1 },
          expect.objectContaining({
            unique: true,
            name: 'broadcast_recipients_broadcast_user_unique',
          }),
        ],
      ]),
    );
  });

  it('rejects plaintext and private key fields', () => {
    const base = {
      broadcast: new Types.ObjectId(),
      recipient: new Types.ObjectId(),
      username: 'member_user',
      keyVersion: 1,
      encryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
    };

    expect(() => new BroadcastRecipient({ ...base, plaintext: 'secret' })).toThrow();
    expect(() => new BroadcastRecipient({ ...base, privateKey: 'secret' })).toThrow();
  });

  it('accepts only an 80-byte canonical sealed-box wrapped key', async () => {
    const base = {
      broadcast: new Types.ObjectId(),
      recipient: new Types.ObjectId(),
      username: 'member_user',
      keyVersion: 1,
      encryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
    };

    const valid = new BroadcastRecipient({
      ...base,
      encryptedBroadcastKey: Buffer.alloc(80, 2).toString('base64'),
    });

    const invalid = new BroadcastRecipient({
      ...base,
      encryptedBroadcastKey: Buffer.alloc(79, 2).toString('base64'),
    });

    await expect(valid.validate()).resolves.toBeUndefined();
    await expect(invalid.validate()).rejects.toMatchObject({
      errors: { encryptedBroadcastKey: expect.anything() },
    });
  });
});
