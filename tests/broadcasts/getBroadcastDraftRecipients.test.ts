import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import getBroadcastDraftRecipients from '../../src/utils/broadcast/getBroadcastDraftRecipients';

const chainResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('getBroadcastDraftRecipients', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a stable recipient cursor and does not expose private data', async () => {
    const creatorId = new Types.ObjectId();

    const draft = new Broadcast({
      _id: new Types.ObjectId(),
      clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
      creator: creatorId,
      audienceSnapshotCount: 2,
      encryptionVersion: 1,
      creatorKeyVersion: 1,
      creatorSigningPublicKey: Buffer.alloc(32, 2).toString('base64'),
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
    rows[0]!.encryptedBroadcastKey = Buffer.alloc(80, 9).toString('base64');
    vi.spyOn(Broadcast, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(draft),
    } as never);
    const recipientQuery = chainResult(rows);
    vi.spyOn(BroadcastRecipient, 'find').mockReturnValue(recipientQuery as never);
    vi.spyOn(BroadcastRecipient, 'countDocuments').mockReturnValue({
      exec: vi.fn().mockResolvedValue(1),
    } as never);

    const result = await getBroadcastDraftRecipients(creatorId.toString(), draft._id.toString(), {
      limit: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      recipients: {
        hasMore: true,
        nextCursor: rows[0]!.recipient.toString(),
        items: [
          {
            userId: rows[0]!.recipient.toString(),
            username: 'member_1',
            keyVersion: 1,
            keyUploaded: true,
            encryptedBroadcastKey: rows[0]!.encryptedBroadcastKey,
          },
        ],
      },
      draft: {
        progress: { uploadedCount: 1, remainingCount: 1, complete: false },
      },
    });
    expect(result).not.toHaveProperty('recipients.items.0.privateKey');
    expect(recipientQuery.limit).toHaveBeenCalledWith(2);
  });

  it('hides drafts owned by another creator behind not-found', async () => {
    vi.spyOn(Broadcast, 'findOne').mockReturnValue({
      exec: vi.fn().mockResolvedValue(null),
    } as never);
    const findRecipientsSpy = vi.spyOn(BroadcastRecipient, 'find');

    const countRecipientsSpy = vi.spyOn(BroadcastRecipient, 'countDocuments');

    await expect(
      getBroadcastDraftRecipients(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        {
          limit: 100,
        },
      ),
    ).resolves.toEqual({ ok: false, reason: 'draft_not_found' });
    expect(findRecipientsSpy).not.toHaveBeenCalled();
    expect(countRecipientsSpy).not.toHaveBeenCalled();
  });
});
