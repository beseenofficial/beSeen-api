import { Types } from 'mongoose';
import MessageBounty from '../../src/models/MessageBounty';
import { afterEach, describe, expect, it, vi } from 'vitest';
import expireMessageBounty from '../../src/utils/messenger/expireMessageBounty';

const bountyId = new Types.ObjectId();
const now = new Date('2026-08-28T12:00:00.000Z');
const session = {} as never;
const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('expireMessageBounty', () => {
  afterEach(() => vi.restoreAllMocks());

  it('expires a contract bounty without changing any database balance', async () => {
    const expired = { _id: bountyId, fundingStatus: 'contract_locked' };

    const updateSpy = vi
      .spyOn(MessageBounty, 'findOneAndUpdate')
      .mockReturnValue(execQuery(expired) as never);

    await expect(expireMessageBounty(bountyId, now, session)).resolves.toBe(expired);
    expect(updateSpy).toHaveBeenCalledWith(
      {
        _id: bountyId,
        status: 'offered',
        fundingStatus: 'contract_locked',
        expiresAt: { $lte: now },
      },
      {
        $set: {
          status: 'expired',
          settlementStatus: 'failed',
          settlementLastError: 'Reply window expired before a valid reply',
        },
      },
      { returnDocument: 'after', runValidators: true, session },
    );
  });
});
