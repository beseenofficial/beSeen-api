import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import cancelBroadcastDraft from '../../src/utils/broadcast/cancelBroadcastDraft';

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

const createDraft = (creatorId: Types.ObjectId) =>
  new Broadcast({
    _id: new Types.ObjectId(),
    clientBroadcastId: crypto.randomUUID(),
    creator: creatorId,
    audienceSnapshotCount: 2,
    encryptionVersion: 1,
    creatorKeyVersion: 1,
    creatorSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
    creatorEncryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
  });

describe('cancelBroadcastDraft', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('atomically marks a draft canceled before removing recipient rows', async () => {
    const creatorId = new Types.ObjectId();

    const draft = createDraft(creatorId);
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(draft) as never);
    const updateSpy = vi
      .spyOn(Broadcast, 'updateOne')
      .mockReturnValue(queryResult({ modifiedCount: 1 }) as never);

    const deleteRecipientsSpy = vi
      .spyOn(BroadcastRecipient, 'deleteMany')
      .mockReturnValue(queryResult({ deletedCount: 2 }) as never);

    const result = await cancelBroadcastDraft(creatorId.toString(), draft._id.toString());

    expect(result).toMatchObject({
      ok: true,
      canceledNow: true,
      removedRecipientCount: 2,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      { _id: draft._id, creator: creatorId.toString(), status: 'draft' },
      { $set: { status: 'canceled', canceledAt: expect.any(Date) } },
      { runValidators: true },
    );
    expect(deleteRecipientsSpy).toHaveBeenCalledAfter(updateSpy);
  });

  it('never removes recipient rows from an already published broadcast', async () => {
    const creatorId = new Types.ObjectId();

    const published = createDraft(creatorId);
    published.status = 'published';
    vi.spyOn(Broadcast, 'findOne').mockReturnValue(queryResult(published) as never);
    const deleteRecipientsSpy = vi.spyOn(BroadcastRecipient, 'deleteMany');

    await expect(
      cancelBroadcastDraft(creatorId.toString(), published._id.toString()),
    ).resolves.toEqual({ ok: false, reason: 'published_broadcast' });
    expect(deleteRecipientsSpy).not.toHaveBeenCalled();
  });
});
