import { describe, expect, it, vi } from 'vitest';

import EarningTransaction from '../../src/models/EarningTransaction';
import addFinancialEventTransactions from '../../src/migrations/20260919AddFinancialEventTransactions';

describe('addFinancialEventTransactions', () => {
  it('replaces the old bounty index and adds the Aura index', async () => {
    vi.spyOn(EarningTransaction.collection, 'indexes').mockResolvedValue([
      {
        name: 'earning_transactions_bounty_unique',
        key: { type: 1, contractBountyId: 1 },
        unique: true,
      },
    ] as never);
    const dropIndex = vi
      .spyOn(EarningTransaction.collection, 'dropIndex')
      .mockResolvedValue(undefined as never);
    const createIndex = vi
      .spyOn(EarningTransaction.collection, 'createIndex')
      .mockImplementation(async (_fields, options) => options?.name ?? '');

    await expect(addFinancialEventTransactions()).resolves.toEqual({
      droppedIndexes: 1,
      ensuredIndexes: 2,
    });
    expect(dropIndex).toHaveBeenCalledWith('earning_transactions_bounty_unique');
    expect(createIndex).toHaveBeenCalledTimes(2);
  });
});
