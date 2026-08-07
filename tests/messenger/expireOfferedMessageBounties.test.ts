import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MessageBounty from '../../src/models/MessageBounty';
import expireOfferedMessageBounties from '../../src/utils/messenger/expireOfferedMessageBounties';

describe('expireOfferedMessageBounties', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists expired state only for offered bounties in the requested message page', async () => {
    const now = new Date('2026-08-07T12:00:00.000Z');
    const messageIds = [new Types.ObjectId(), new Types.ObjectId()];
    vi.spyOn(MessageBounty, 'updateMany').mockReturnValue({
      exec: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
    } as never);

    await expect(expireOfferedMessageBounties(now, messageIds)).resolves.toBe(2);
    expect(MessageBounty.updateMany).toHaveBeenCalledWith(
      {
        status: 'offered',
        expiresAt: { $lte: now },
        message: { $in: messageIds },
      },
      { $set: { status: 'expired' } },
    );
  });

  it('does not query MongoDB for an empty message page', async () => {
    const updateSpy = vi.spyOn(MessageBounty, 'updateMany');

    await expect(expireOfferedMessageBounties(new Date(), [])).resolves.toBe(0);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
