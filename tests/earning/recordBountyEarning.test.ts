import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  earningExec: vi.fn(),
  contractExec: vi.fn(),
  bountyUpdateExec: vi.fn(),
}));

vi.mock('../../src/db', () => ({
  withDatabaseTransaction: vi.fn(async (operation) => operation({ id: 'session' })),
}));

import User from '../../src/models/User';
import MessageBounty from '../../src/models/MessageBounty';
import ContractBounty from '../../src/models/ContractBounty';
import EarningTransaction from '../../src/models/EarningTransaction';
import recordBountyEarning from '../../src/utils/earning/recordBountyEarning';

const sponsorId = new Types.ObjectId('000000000000000000000001');
const beneficiaryId = new Types.ObjectId('000000000000000000000002');
const bountyId = new Types.ObjectId('000000000000000000000003');
const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const recipient = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBU4I';

const queryResult = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('recordBountyEarning', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.earningExec.mockReset().mockResolvedValue({});
    mocks.contractExec.mockReset().mockResolvedValue({ modifiedCount: 1 });
    mocks.bountyUpdateExec.mockReset().mockResolvedValue({ modifiedCount: 1 });

    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(
      queryResult({
        _id: bountyId,
        sponsor: sponsorId,
        beneficiary: beneficiaryId,
        amountUnits: '50000000',
        claimedAt: new Date('2026-09-16T12:00:00.000Z'),
      }) as never,
    );
    vi.spyOn(User, 'findById').mockImplementation((id) =>
      queryResult({ walletAddress: id?.toString() === sponsorId.toString() ? sender : recipient }),
    );
    vi.spyOn(EarningTransaction, 'findOneAndUpdate').mockReturnValue({
      exec: mocks.earningExec,
    } as never);
    vi.spyOn(ContractBounty, 'updateOne').mockReturnValue({
      exec: mocks.contractExec,
    } as never);
    vi.spyOn(MessageBounty, 'updateOne').mockReturnValue({
      exec: mocks.bountyUpdateExec,
    } as never);
  });

  it('stores the net reward once and confirms the bounty state', async () => {
    await expect(
      recordBountyEarning(
        {
          contractBountyId: '42',
          sender,
          recipient,
          amountUnits: '50000000',
          feeAmountUnits: '2500000',
        },
        { eventId: 'event-1', ledger: 101, txHash: 'A'.repeat(64) },
      ),
    ).resolves.toBe(true);

    expect(EarningTransaction.findOneAndUpdate).toHaveBeenCalledWith(
      { type: 'bounty_reply', contractBountyId: '42' },
      {
        $setOnInsert: expect.objectContaining({
          user: beneficiaryId,
          messageBounty: bountyId,
          grossAmountUnits: '50000000',
          feeAmountUnits: '2500000',
          netAmountUnits: '47500000',
          transactionHash: 'a'.repeat(64),
        }),
      },
      expect.objectContaining({ upsert: true, runValidators: true }),
    );
    expect(MessageBounty.updateOne).toHaveBeenCalledWith(
      { _id: bountyId },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'claimed',
          fundingStatus: 'contract_settled',
          settlementStatus: 'confirmed',
        }),
      }),
      expect.objectContaining({ runValidators: true }),
    );
  });
});
