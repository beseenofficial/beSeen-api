import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import Broadcast from '../../src/models/Broadcast';

const broadcastInput = () => ({
  clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  creator: new Types.ObjectId(),
  audienceSnapshotCount: 12,
  encryptionVersion: 1,
  creatorKeyVersion: 1,
  creatorEncryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
});

describe('Broadcast model', () => {
  it('stores draft metadata without plaintext or message keys', async () => {
    const broadcast = new Broadcast(broadcastInput());

    await broadcast.validate();

    expect(broadcast.status).toBe('draft');
    expect(broadcast.audienceType).toBe('all_active_users');
    expect(Broadcast.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { creator: 1, clientBroadcastId: 1 },
          expect.objectContaining({ unique: true, name: 'broadcasts_creator_client_id_unique' }),
        ],
      ]),
    );
  });

  it('throws instead of silently storing plaintext or private-key fields', () => {
    expect(() => new Broadcast({ ...broadcastInput(), plaintext: 'secret' })).toThrow();
    expect(() => new Broadcast({ ...broadcastInput(), privateKey: 'secret' })).toThrow();
  });
});
