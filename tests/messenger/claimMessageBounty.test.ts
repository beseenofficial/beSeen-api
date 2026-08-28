import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import { withDatabaseTransaction } from '../../src/db';
import MessageBounty from '../../src/models/MessageBounty';
import claimMessageBounty from '../../src/utils/messenger/claimMessageBounty';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);

const beneficiaryId = new Types.ObjectId('000000000000000000000001');

const sponsorId = new Types.ObjectId('000000000000000000000002');

const bountyId = new Types.ObjectId('000000000000000000000003');

const messageId = new Types.ObjectId('000000000000000000000004');

const conversationId = new Types.ObjectId('000000000000000000000005');

const replyMessageId = new Types.ObjectId('000000000000000000000006');

const now = new Date('2026-08-07T12:00:00.000Z');

const session = {} as never;

const sessionQuery = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

const bounty = (
  status: 'offered' | 'claimable' | 'claimed' | 'expired',
  fundingStatus: 'legacy' | 'reserved' | 'paid' | 'refunded' = 'legacy',
) =>
  new MessageBounty({
    _id: bountyId,
    message: messageId,
    conversation: conversationId,
    sponsor: sponsorId,
    beneficiary: beneficiaryId,
    assetCode: 'USDC',
    amount: '10',
    amountUnits: fundingStatus === 'legacy' ? null : 100_000_000,
    fundingStatus,
    durationSeconds: 3_600,
    status,
    expiresAt: new Date('2026-08-07T13:00:00.000Z'),
    replyMessage: status === 'offered' || status === 'expired' ? null : replyMessageId,
    claimableAt: status === 'offered' || status === 'expired' ? null : now,
    claimedAt: status === 'claimed' ? now : null,
  });

describe('claimMessageBounty', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation(session));
    vi.spyOn(User, 'findOne').mockReturnValue(sessionQuery({ _id: beneficiaryId }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('atomically claims a claimable bounty for its beneficiary', async () => {
    const claimable = bounty('claimable', 'reserved');

    const claimed = bounty('claimed', 'paid');
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(sessionQuery(claimable) as never);
    vi.spyOn(MessageBounty, 'findOneAndUpdate').mockReturnValue(execQuery(claimed) as never);
    const balanceSpy = vi
      .spyOn(User, 'updateOne')
      .mockReturnValue(execQuery({ matchedCount: 1 }) as never);

    await expect(
      claimMessageBounty(beneficiaryId.toString(), bountyId.toString()),
    ).resolves.toMatchObject({
      ok: true,
      claimedNow: true,
      bounty: { id: bountyId.toString(), status: 'claimed' },
    });
    expect(balanceSpy).toHaveBeenCalledWith(
      { _id: beneficiaryId, status: 'active', deletedAt: null },
      { $inc: { demoUsdcBalanceUnits: 100_000_000 } },
      { runValidators: true, session },
    );
  });

  it('returns an idempotent success for an already claimed bounty', async () => {
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(sessionQuery(bounty('claimed')) as never);
    const updateSpy = vi.spyOn(MessageBounty, 'findOneAndUpdate');

    await expect(
      claimMessageBounty(beneficiaryId.toString(), bountyId.toString()),
    ).resolves.toMatchObject({ ok: true, claimedNow: false });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('rejects an offered bounty that has not been unlocked', async () => {
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(sessionQuery(bounty('offered')) as never);

    await expect(
      claimMessageBounty(beneficiaryId.toString(), bountyId.toString()),
    ).resolves.toEqual({ ok: false, reason: 'bounty_not_claimable' });
  });

  it('persists expiry and rejects an offered bounty after its deadline', async () => {
    const expiredOffer = bounty('offered');
    expiredOffer.expiresAt = new Date('2026-08-07T11:00:00.000Z');
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(sessionQuery(expiredOffer) as never);
    vi.spyOn(MessageBounty, 'findOneAndUpdate')
      .mockReturnValueOnce(execQuery(null) as never)
      .mockReturnValueOnce(execQuery(bounty('expired')) as never);

    await expect(
      claimMessageBounty(beneficiaryId.toString(), bountyId.toString()),
    ).resolves.toEqual({ ok: false, reason: 'bounty_expired' });
  });
});
