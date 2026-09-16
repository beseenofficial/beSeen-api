import User from '../../src/models/User';
import MessageBounty from '../../src/models/MessageBounty';
import { afterEach, describe, expect, it, vi } from 'vitest';
import removeDemoUsdc from '../../src/migrations/20260915RemoveDemoUsdc';

describe('20260915RemoveDemoUsdc migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('removes balances and demo bounties while preserving contract registrations', async () => {
    const userUpdateSpy = vi.spyOn(User.collection, 'updateMany').mockResolvedValue({
      matchedCount: 3,
      modifiedCount: 3,
    } as never);

    const bountyUpdateSpy = vi.spyOn(MessageBounty.collection, 'updateMany').mockResolvedValue({
      modifiedCount: 2,
    } as never);

    const bountyDeleteSpy = vi.spyOn(MessageBounty.collection, 'deleteMany').mockResolvedValue({
      deletedCount: 4,
    } as never);

    await expect(removeDemoUsdc()).resolves.toEqual({
      matchedUsers: 3,
      removedUserBalances: 3,
      migratedContractAmounts: 2,
      removedDemoBounties: 4,
    });
    expect(userUpdateSpy).toHaveBeenCalledWith(
      { demoUsdcBalanceUnits: { $exists: true } },
      { $unset: { demoUsdcBalanceUnits: '' } },
    );
    expect(bountyUpdateSpy).toHaveBeenCalledWith(
      {
        contractBountyId: { $type: 'string' },
        amountUnits: { $type: 'number' },
      },
      [{ $set: { amountUnits: { $toString: '$amountUnits' } } }],
    );
    expect(bountyDeleteSpy).toHaveBeenCalledWith({
      $or: [{ contractBountyId: null }, { contractBountyId: { $exists: false } }],
    });
  });
});
