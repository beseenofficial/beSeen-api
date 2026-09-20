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
    const aggregate = vi.spyOn(EarningTransaction, 'aggregate').mockReturnValue({
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
          contractAuraTokenId: null,
          assetCode: 'USDC',
          amount: '4.75',
          transactionHash: 'a'.repeat(64),
          earnedAt: new Date('2026-09-16T12:00:00.000Z'),
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    expect(aggregate).toHaveBeenCalledWith([
      {
        $match: {
          user: new Types.ObjectId('000000000000000000000001'),
          type: { $in: ['bounty_reply', 'aura_purchase'] },
        },
      },
      { $group: { _id: null, totalUnits: { $sum: { $toDecimal: '$netAmountUnits' } } } },
    ]);
  });

  it('lists withdrawals as negative items without subtracting them from the total', async () => {
    const withdrawal = new EarningTransaction({
      _id: new Types.ObjectId('000000000000000000000011'),
      user: new Types.ObjectId('000000000000000000000001'),
      messageBounty: null,
      contractBountyId: null,
      contractAuraTokenId: null,
      type: 'withdrawal',
      assetCode: 'USDC',
      grossAmountUnits: '12500000',
      feeAmountUnits: '0',
      netAmountUnits: '-12500000',
      transactionHash: 'b'.repeat(64),
      eventId: 'event-2',
      eventLedger: 102,
      earnedAt: new Date('2026-09-19T12:01:00.000Z'),
    });

    vi.spyOn(EarningTransaction, 'find').mockReturnValue(listResult([withdrawal]) as never);
    vi.spyOn(EarningTransaction, 'aggregate').mockReturnValue({
      exec: vi.fn().mockResolvedValue([{ totalUnits: { toString: () => '47500000' } }]),
    } as never);

    const result = await getEarningTransactions('000000000000000000000001', { limit: 25 });

    expect(result.totalAmount).toBe('4.75');
    expect(result.items[0]).toMatchObject({
      type: 'withdrawal',
      reason: 'Earnings withdrawal',
      amount: '-1.25',
    });
  });
});
