import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import EarningTransaction from '../../src/models/EarningTransaction';
import {
  recordAuraEarning,
  recordWithdrawal,
} from '../../src/utils/earning/recordContractFinancialEvent';

const userId = new Types.ObjectId('000000000000000000000001');
const wallet = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const userQuery = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  lean: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('contract financial event recording', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(User, 'findOne').mockReturnValue(userQuery({ _id: userId }) as never);
    vi.spyOn(EarningTransaction, 'findOneAndUpdate').mockReturnValue({
      exec: vi.fn().mockResolvedValue({}),
    } as never);
  });

  it('records the Aura subject net earning after fee', async () => {
    await expect(
      recordAuraEarning(
        {
          contractAuraTokenId: '42',
          subject: wallet,
          priceAmountUnits: '20000000',
          feeAmountUnits: '1000000',
        },
        { eventId: 'event-1', ledger: 101, txHash: 'A'.repeat(64) },
        '2026-09-19T12:00:00Z',
      ),
    ).resolves.toBe(true);

    expect(EarningTransaction.findOneAndUpdate).toHaveBeenCalledWith(
      { type: 'aura_purchase', contractAuraTokenId: '42' },
      {
        $setOnInsert: expect.objectContaining({
          user: userId,
          grossAmountUnits: '20000000',
          feeAmountUnits: '1000000',
          netAmountUnits: '19000000',
          transactionHash: 'a'.repeat(64),
        }),
      },
      expect.objectContaining({ upsert: true, runValidators: true }),
    );
  });

  it('records a withdrawal as a negative amount', async () => {
    await expect(
      recordWithdrawal(
        { owner: wallet, amountUnits: '12500000' },
        { eventId: 'event-2', ledger: 102, txHash: 'B'.repeat(64) },
        '2026-09-19T12:01:00Z',
      ),
    ).resolves.toBe(true);

    expect(EarningTransaction.findOneAndUpdate).toHaveBeenCalledWith(
      { eventId: 'event-2' },
      {
        $setOnInsert: expect.objectContaining({
          user: userId,
          type: 'withdrawal',
          grossAmountUnits: '12500000',
          feeAmountUnits: '0',
          netAmountUnits: '-12500000',
          transactionHash: 'b'.repeat(64),
        }),
      },
      expect.objectContaining({ upsert: true, runValidators: true }),
    );
  });
});
