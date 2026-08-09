import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MessageBounty from '../../src/models/MessageBounty';
import resolveReplyBounty from '../../src/utils/messenger/resolveReplyBounty';

const conversationId = new Types.ObjectId('000000000000000000000001');

const originalMessageId = new Types.ObjectId('000000000000000000000002');

const replyMessageId = new Types.ObjectId('000000000000000000000003');

const sponsorId = new Types.ObjectId('000000000000000000000004');

const beneficiaryId = new Types.ObjectId('000000000000000000000005');

const repliedAt = new Date('2026-08-07T12:00:00.000Z');

const session = {} as never;

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

const input = () => ({
  conversationId,
  replyToMessageId: originalMessageId.toString(),
  replyMessageId,
  senderId: beneficiaryId,
  recipientId: sponsorId,
  repliedAt,
  session,
});

describe('resolveReplyBounty', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('atomically unlocks the offered bounty for the first timely direct reply', async () => {
    const bounty = new MessageBounty({
      _id: new Types.ObjectId(),
      message: originalMessageId,
      conversation: conversationId,
      sponsor: sponsorId,
      beneficiary: beneficiaryId,
      assetCode: 'USDC',
      amount: '10',
      durationSeconds: 3_600,
      status: 'claimable',
      expiresAt: new Date('2026-08-07T13:00:00.000Z'),
      replyMessage: replyMessageId,
      claimableAt: repliedAt,
    });
    vi.spyOn(MessageBounty, 'findOneAndUpdate').mockReturnValue(execQuery(bounty) as never);
    const expireSpy = vi.spyOn(MessageBounty, 'updateOne');

    await expect(resolveReplyBounty(input())).resolves.toBe(bounty);
    expect(MessageBounty.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: originalMessageId.toString(),
        beneficiary: beneficiaryId,
        sponsor: sponsorId,
        status: 'offered',
        expiresAt: { $gt: repliedAt },
      }),
      {
        $set: {
          status: 'claimable',
          replyMessage: replyMessageId,
          claimableAt: repliedAt,
        },
      },
      { returnDocument: 'after', runValidators: true, session },
    );
    expect(expireSpy).not.toHaveBeenCalled();
  });

  it('expires an unanswered offer when the direct reply is too late', async () => {
    vi.spyOn(MessageBounty, 'findOneAndUpdate').mockReturnValue(execQuery(null) as never);
    vi.spyOn(MessageBounty, 'updateOne').mockReturnValue(
      execQuery({ acknowledged: true, modifiedCount: 1 }) as never,
    );

    await expect(resolveReplyBounty(input())).resolves.toBeNull();
    expect(MessageBounty.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'offered', expiresAt: { $lte: repliedAt } }),
      { $set: { status: 'expired' } },
      { session },
    );
  });
});
