import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import uploadBroadcastRecipientKeys from '../../src/utils/broadcast/uploadBroadcastRecipientKeys';

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });
const wrappedKey = (value: number) => Buffer.alloc(80, value).toString('base64');

describe('uploadBroadcastRecipientKeys', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores a guarded idempotent batch and returns total progress', async () => {
    const creatorId = new Types.ObjectId();
    const draft = new Broadcast({
      _id: new Types.ObjectId(),
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      creator: creatorId,
      audienceSnapshotCount: 3,
      encryptionVersion: 1,
      creatorKeyVersion: 1,
      creatorEncryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
    });
    const rows = [1, 2].map(
      (value) =>
        new BroadcastRecipient({
          broadcast: draft._id,
          recipient: new Types.ObjectId(),
          username: `member_${value}`,
          keyVersion: 1,
          encryptionPublicKey: Buffer.alloc(32, value).toString('base64'),
        }),
    );
    const body = {
      keys: rows.map((row, index) => ({
        recipientId: row.recipient.toString(),
        keyVersion: 1,
        encryptedBroadcastKey: wrappedKey(index + 1),
      })),
    };
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(draft) as never);
    vi.spyOn(BroadcastRecipient, 'find').mockReturnValue(queryResult(rows) as never);
    const bulkWriteSpy = vi
      .spyOn(BroadcastRecipient, 'bulkWrite')
      .mockResolvedValue({ matchedCount: 2 } as never);
    vi.spyOn(BroadcastRecipient, 'countDocuments').mockReturnValue(queryResult(2) as never);

    const result = await uploadBroadcastRecipientKeys(
      creatorId.toString(),
      draft._id.toString(),
      body,
    );

    expect(result).toEqual({
      ok: true,
      progress: {
        acceptedCount: 2,
        uploadedCount: 2,
        audienceCount: 3,
        remainingCount: 1,
        complete: false,
      },
    });
    expect(bulkWriteSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: expect.objectContaining({
              encryptedBroadcastKey: { $in: [null, body.keys[0]!.encryptedBroadcastKey] },
            }),
          }),
        }),
      ]),
      { ordered: true },
    );
  });

  it('rejects a ciphertext change without overwriting the stored value', async () => {
    const creatorId = new Types.ObjectId();
    const draft = new Broadcast({
      _id: new Types.ObjectId(),
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      creator: creatorId,
      audienceSnapshotCount: 1,
      encryptionVersion: 1,
      creatorKeyVersion: 1,
      creatorEncryptionPublicKey: Buffer.alloc(32, 1).toString('base64'),
    });
    const row = new BroadcastRecipient({
      broadcast: draft._id,
      recipient: new Types.ObjectId(),
      username: 'member_user',
      keyVersion: 1,
      encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
      encryptedBroadcastKey: wrappedKey(1),
    });
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(draft) as never);
    vi.spyOn(BroadcastRecipient, 'find').mockReturnValue(queryResult([row]) as never);
    const bulkWriteSpy = vi.spyOn(BroadcastRecipient, 'bulkWrite');

    const result = await uploadBroadcastRecipientKeys(creatorId.toString(), draft._id.toString(), {
      keys: [
        {
          recipientId: row.recipient.toString(),
          keyVersion: 1,
          encryptedBroadcastKey: wrappedKey(2),
        },
      ],
    });

    expect(result).toEqual({ ok: false, reason: 'encrypted_key_conflict' });
    expect(bulkWriteSpy).not.toHaveBeenCalled();
  });
});
