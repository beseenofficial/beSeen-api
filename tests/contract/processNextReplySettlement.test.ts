import { Types } from 'mongoose';
import User from '../../src/models/User';
import MessageBounty from '../../src/models/MessageBounty';
import ContractBounty from '../../src/models/ContractBounty';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getContractBounty from '../../src/utils/contract/getContractBounty';
import settleContractBounties from '../../src/utils/contract/settleContractBounties';
import processNextReplySettlement from '../../src/utils/contract/processNextReplySettlement';

vi.mock('../../src/utils/contract/getContractBounty', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/contract/settleContractBounties', () => ({ default: vi.fn() }));

const getContractBountyMock = vi.mocked(getContractBounty);

const settleContractBountiesMock = vi.mocked(settleContractBounties);

const bountyId = new Types.ObjectId('000000000000000000000001');

const sponsorId = new Types.ObjectId('000000000000000000000002');

const beneficiaryId = new Types.ObjectId('000000000000000000000003');

const now = new Date('2026-08-07T12:00:00.000Z');

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

const selectQuery = (value: unknown) => ({
  select: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(value) }),
});

describe('processNextReplySettlement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    getContractBountyMock.mockReset();
    settleContractBountiesMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('settles a verified reply and marks it claimed only after chain success', async () => {
    vi.spyOn(MessageBounty, 'findOneAndUpdate').mockReturnValue(
      execQuery({
        _id: bountyId,
        contractBountyId: '42',
        sponsor: sponsorId,
        beneficiary: beneficiaryId,
        amountUnits: 100_000_000,
        claimableAt: now,
      }) as never,
    );
    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(selectQuery({ walletAddress: 'GSPONSOR' }) as never)
      .mockReturnValueOnce(selectQuery({ walletAddress: 'GBENEFICIARY' }) as never);
    getContractBountyMock.mockResolvedValue({
      contractBountyId: '42',
      sender: 'GSPONSOR',
      recipient: 'GBENEFICIARY',
      amount: '100000000',
      deadline: '1786111200',
      status: 'locked',
    });
    settleContractBountiesMock.mockResolvedValue({ transactionHash: 'a'.repeat(64) });
    const contractUpdate = vi
      .spyOn(ContractBounty, 'updateOne')
      .mockReturnValue(execQuery({ matchedCount: 1 }) as never);

    const bountyUpdate = vi
      .spyOn(MessageBounty, 'updateOne')
      .mockReturnValue(execQuery({ matchedCount: 1 }) as never);

    await expect(processNextReplySettlement()).resolves.toBe(true);
    expect(settleContractBountiesMock).toHaveBeenCalledWith([42n]);
    expect(contractUpdate).toHaveBeenCalledWith(
      { contractBountyId: '42' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'settled',
          settlementTransactionHash: 'a'.repeat(64),
        }),
      }),
      { runValidators: true },
    );
    expect(bountyUpdate).toHaveBeenCalledWith(
      { _id: bountyId, settlementStatus: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'claimed',
          fundingStatus: 'contract_settled',
          settlementStatus: 'confirmed',
        }),
      }),
      { runValidators: true },
    );
  });

  it('refuses settlement when the registered participants do not match the chain', async () => {
    vi.spyOn(MessageBounty, 'findOneAndUpdate').mockReturnValue(
      execQuery({
        _id: bountyId,
        contractBountyId: '42',
        sponsor: sponsorId,
        beneficiary: beneficiaryId,
        amountUnits: 100_000_000,
        claimableAt: now,
      }) as never,
    );
    vi.spyOn(User, 'findById')
      .mockReturnValueOnce(selectQuery({ walletAddress: 'GSPONSOR' }) as never)
      .mockReturnValueOnce(selectQuery({ walletAddress: 'GBENEFICIARY' }) as never);
    getContractBountyMock.mockResolvedValue({
      contractBountyId: '42',
      sender: 'GUNRELATED',
      recipient: 'GBENEFICIARY',
      amount: '100000000',
      deadline: '1786111200',
      status: 'locked',
    });
    const updateSpy = vi
      .spyOn(MessageBounty, 'updateOne')
      .mockReturnValue(execQuery({ matchedCount: 1 }) as never);

    await expect(processNextReplySettlement()).resolves.toBe(true);
    expect(settleContractBountiesMock).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith(
      { _id: bountyId, settlementStatus: 'processing' },
      expect.objectContaining({
        $set: expect.objectContaining({ settlementStatus: 'failed', status: 'expired' }),
      }),
      { runValidators: true },
    );
  });
});
