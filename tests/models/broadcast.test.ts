import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import Broadcast from '../../src/models/Broadcast';

const broadcastInput = () => ({
  clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  creator: new Types.ObjectId(),
  audienceSnapshotCount: 12,
  encryptionVersion: 1,
  creatorKeyVersion: 1,
  creatorSigningPublicKey: Buffer.alloc(32, 2).toString('base64'),
  creatorEncryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
});

describe('Broadcast model', () => {
  it('stores draft metadata without plaintext or message keys', async () => {
    const broadcast = new Broadcast(broadcastInput());

    await broadcast.validate();

    expect(broadcast.status).toBe('draft');
    expect(broadcast.expiresAt).toBeInstanceOf(Date);
    expect(broadcast.audienceType).toBe('demo_all_users');
    expect(Broadcast.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { creator: 1, clientBroadcastId: 1 },
          expect.objectContaining({ unique: true, name: 'broadcasts_creator_client_id_unique' }),
        ],
        [
          { status: 1, expiresAt: 1 },
          expect.objectContaining({ name: 'broadcasts_status_expiration' }),
        ],
      ]),
    );
  });

  it('throws instead of silently storing plaintext or private-key fields', () => {
    expect(() => new Broadcast({ ...broadcastInput(), plaintext: 'secret' })).toThrow();
    expect(() => new Broadcast({ ...broadcastInput(), privateKey: 'secret' })).toThrow();
  });

  it('requires a complete encrypted envelope when published', async () => {
    const incomplete = new Broadcast({ ...broadcastInput(), status: 'published' });
    const complete = new Broadcast({
      ...broadcastInput(),
      status: 'published',
      contentCiphertext: Buffer.alloc(32, 3).toString('base64'),
      contentNonce: Buffer.alloc(24, 4).toString('base64'),
      creatorEncryptedBroadcastKey: Buffer.alloc(80, 5).toString('base64'),
      recipientKeysDigest: 'a'.repeat(64),
      signature: Buffer.alloc(64, 6).toString('base64'),
      publishedAt: new Date(),
    });

    await expect(incomplete.validate()).rejects.toBeDefined();
    await expect(complete.validate()).resolves.toBeUndefined();
  });
});
