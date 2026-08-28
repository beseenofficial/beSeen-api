import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MessageBounty from '../../src/models/MessageBounty';
import { withDatabaseTransaction } from '../../src/db';
import expireMessageBounty from '../../src/utils/messenger/expireMessageBounty';
import expireOfferedMessageBounties from '../../src/utils/messenger/expireOfferedMessageBounties';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../../src/utils/messenger/expireMessageBounty', () => ({ default: vi.fn() }));

describe('expireOfferedMessageBounties', () => {
  beforeEach(() => {
    vi.mocked(withDatabaseTransaction).mockReset();
    vi.mocked(expireMessageBounty).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists expired state only for offered bounties in the requested message page', async () => {
    const now = new Date('2026-08-07T12:00:00.000Z');

    const messageIds = [new Types.ObjectId(), new Types.ObjectId()];
    const bounties = messageIds.map((_id) => ({ _id }));
    vi.spyOn(MessageBounty, 'find').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(bounties),
    } as never);
    vi.mocked(withDatabaseTransaction).mockImplementation(async (operation) =>
      operation({} as never),
    );
    vi.mocked(expireMessageBounty).mockImplementation(
      async (bountyId) =>
        ({
          _id: bountyId,
        }) as never,
    );

    await expect(expireOfferedMessageBounties(now, messageIds)).resolves.toBe(2);
    expect(MessageBounty.find).toHaveBeenCalledWith({
      status: 'offered',
      expiresAt: { $lte: now },
      message: { $in: messageIds },
    });
    expect(expireMessageBounty).toHaveBeenCalledTimes(2);
  });

  it('does not query MongoDB for an empty message page', async () => {
    const findSpy = vi.spyOn(MessageBounty, 'find');

    await expect(expireOfferedMessageBounties(new Date(), [])).resolves.toBe(0);
    expect(findSpy).not.toHaveBeenCalled();
  });
});
