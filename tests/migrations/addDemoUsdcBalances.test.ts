import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import MessageBounty from '../../src/models/MessageBounty';
import addDemoUsdcBalances from '../../src/migrations/20260828AddDemoUsdcBalances';

describe('20260828AddDemoUsdcBalances migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('funds old users and marks pre-balance bounties as legacy', async () => {
    const userUpdateSpy = vi.spyOn(User.collection, 'updateMany').mockResolvedValue({
      matchedCount: 3,
      modifiedCount: 3,
    } as never);
    const bountyUpdateSpy = vi.spyOn(MessageBounty.collection, 'updateMany').mockResolvedValue({
      matchedCount: 4,
      modifiedCount: 4,
    } as never);

    await expect(addDemoUsdcBalances()).resolves.toEqual({
      matchedUsers: 3,
      modifiedUsers: 3,
      matchedLegacyBounties: 4,
      modifiedLegacyBounties: 4,
    });
    expect(userUpdateSpy).toHaveBeenCalledWith(
      { demoUsdcBalanceUnits: { $exists: false } },
      { $set: { demoUsdcBalanceUnits: 200_000_000 } },
    );
    expect(bountyUpdateSpy).toHaveBeenCalledWith(
      {
        $or: [{ amountUnits: { $exists: false } }, { fundingStatus: { $exists: false } }],
      },
      [
        {
          $set: {
            amountUnits: { $ifNull: ['$amountUnits', null] },
            fundingStatus: { $ifNull: ['$fundingStatus', 'legacy'] },
          },
        },
      ],
    );
  });
});
