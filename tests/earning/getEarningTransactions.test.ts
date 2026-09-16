import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EarningTransaction from '../../src/models/EarningTransaction';
import getEarningTransactions from '../../src/utils/earning/getEarningTransactions';

const listResult = (value: unknown) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('getEarningTransactions', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the net amount, reason, date, and transaction hash', async () => {
    const row = new EarningTransaction({
      _id: new Types.ObjectId('000000000000000000000010'),
      user: new Types.ObjectId('000000000000000000000001'),
      messageBounty: new Types.ObjectId('000000000000000000000002'),
      contractBountyId: '42',
      type: 'bounty_reply',
      assetCode: 'USDC',
      grossAmountUnits: '50000000',
      feeAmountUnits: '2500000',
      netAmountUnits: '47500000',
      transactionHash: 'a'.repeat(64),
      eventId: 'event-1',
      eventLedger: 101,
      earnedAt: new Date('2026-09-16T12:00:00.000Z'),
    });

    vi.spyOn(EarningTransaction, 'find').mockReturnValue(listResult([row]) as never);
    vi.spyOn(EarningTransaction, 'aggregate').mockReturnValue({
      exec: vi.fn().mockResolvedValue([{ totalUnits: { toString: () => '47500000' } }]),
    } as never);

    await expect(
      getEarningTransactions('000000000000000000000001', { limit: 25 }),
    ).resolves.toEqual({
      assetCode: 'USDC',
      totalAmount: '4.75',
      items: [
        {
          id: '000000000000000000000010',
          type: 'bounty_reply',
          reason: 'Bounty reply reward',
          contractBountyId: '42',
          assetCode: 'USDC',
          amount: '4.75',
          transactionHash: 'a'.repeat(64),
          earnedAt: new Date('2026-09-16T12:00:00.000Z'),
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });
});
