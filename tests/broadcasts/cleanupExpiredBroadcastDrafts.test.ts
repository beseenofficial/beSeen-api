import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import cleanupExpiredBroadcastDrafts from '../../src/utils/broadcast/cleanupExpiredBroadcastDrafts';

const listQueryResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('cleanupExpiredBroadcastDrafts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marks expired drafts, re-reads canceled IDs, then removes children before parents', async () => {
    const expiredId = new Types.ObjectId();
    vi.spyOn(Broadcast, 'find')
      .mockReturnValueOnce(listQueryResult([{ _id: expiredId }]) as never)
      .mockReturnValueOnce(listQueryResult([{ _id: expiredId }]) as never);
    const updateSpy = vi
      .spyOn(Broadcast, 'updateMany')
      .mockReturnValue(queryResult({ modifiedCount: 1 }) as never);

    const recipientDeleteSpy = vi
      .spyOn(BroadcastRecipient, 'deleteMany')
      .mockReturnValue(queryResult({ deletedCount: 4 }) as never);

    const draftDeleteSpy = vi
      .spyOn(Broadcast, 'deleteMany')
      .mockReturnValue(queryResult({ deletedCount: 1 }) as never);

    const now = new Date('2026-07-27T12:00:00.000Z');

    const result = await cleanupExpiredBroadcastDrafts(now);

    expect(result).toEqual({
      expiredDraftCount: 1,
      deletedDraftCount: 1,
      deletedRecipientCount: 4,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      { _id: { $in: [expiredId] }, status: 'draft' },
      { $set: { status: 'canceled', canceledAt: now } },
      { runValidators: true },
    );
    expect(recipientDeleteSpy).toHaveBeenCalledBefore(draftDeleteSpy);
    expect(draftDeleteSpy).toHaveBeenCalledWith({
      _id: { $in: [expiredId] },
      status: 'canceled',
    });
  });
});
