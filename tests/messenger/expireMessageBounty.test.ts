import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import MessageBounty from '../../src/models/MessageBounty';
import expireMessageBounty from '../../src/utils/messenger/expireMessageBounty';

const bountyId = new Types.ObjectId();
const sponsorId = new Types.ObjectId();
const now = new Date('2026-08-28T12:00:00.000Z');
const session = {} as never;
const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('expireMessageBounty', () => {
  afterEach(() => vi.restoreAllMocks());

  it('atomically refunds a reserved bounty to its sponsor', async () => {
    const refunded = { _id: bountyId, sponsor: sponsorId, amountUnits: 50_000_000 };
    vi.spyOn(MessageBounty, 'findOneAndUpdate').mockReturnValueOnce(execQuery(refunded) as never);
    const balanceSpy = vi
      .spyOn(User, 'updateOne')
      .mockReturnValue(execQuery({ matchedCount: 1 }) as never);

    await expect(expireMessageBounty(bountyId, now, session)).resolves.toBe(refunded);
    expect(balanceSpy).toHaveBeenCalledWith(
      { _id: sponsorId },
      { $inc: { demoUsdcBalanceUnits: 50_000_000 } },
      { runValidators: true, session },
    );
  });

  it('expires a legacy bounty without changing any balance', async () => {
    const expiredLegacy = { _id: bountyId, fundingStatus: 'legacy' };
    vi.spyOn(MessageBounty, 'findOneAndUpdate')
      .mockReturnValueOnce(execQuery(null) as never)
      .mockReturnValueOnce(execQuery(expiredLegacy) as never);
    const balanceSpy = vi.spyOn(User, 'updateOne');

    await expect(expireMessageBounty(bountyId, now, session)).resolves.toBe(expiredLegacy);
    expect(balanceSpy).not.toHaveBeenCalled();
  });
});
