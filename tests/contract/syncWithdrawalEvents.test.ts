import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scValToNative: vi.fn(),
  recordWithdrawal: vi.fn(),
}));

vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: { scValToNative: mocks.scValToNative },
}));
vi.mock('../../src/utils/earning/recordContractFinancialEvent', () => ({
  recordWithdrawal: mocks.recordWithdrawal,
}));

import handleWithdrawalEvent, {
  decodeWithdrawalEvent,
} from '../../src/utils/contract/event/syncWithdrawalEvents';

const owner = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

describe('withdrawal event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scValToNative.mockReturnValueOnce(owner).mockReturnValueOnce({ amount: 12_500_000n });
    mocks.recordWithdrawal.mockResolvedValue(true);
  });

  it('reads the indexed owner topic and records a negative transaction', async () => {
    const event = {
      id: 'event-1',
      ledger: 101,
      ledgerClosedAt: '2026-09-19T12:00:00Z',
      txHash: 'a'.repeat(64),
      topic: [{}, {}],
      value: {},
    };

    await expect(handleWithdrawalEvent(event as never)).resolves.toBe(true);
    expect(mocks.recordWithdrawal).toHaveBeenCalledWith(
      { owner, amountUnits: '12500000' },
      { eventId: 'event-1', ledger: 101, txHash: 'a'.repeat(64) },
      '2026-09-19T12:00:00Z',
    );
  });

  it('rejects malformed values', () => {
    expect(() => decodeWithdrawalEvent(owner, { amount: 0n })).toThrow(
      'Withdrawal amount is not a positive integer',
    );
  });
});
