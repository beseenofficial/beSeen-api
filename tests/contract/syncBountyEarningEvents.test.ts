import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scValToNative: vi.fn(),
  recordBountyEarning: vi.fn(),
}));

vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: { scValToNative: mocks.scValToNative },
}));
vi.mock('../../src/utils/earning/recordBountyEarning', () => ({
  default: mocks.recordBountyEarning,
}));

import handleBountyEarningEvent, {
  decodeBountySettledEvent,
} from '../../src/utils/contract/event/syncBountyEarningEvents';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
const contractEvent = {
  id: 'event-1',
  ledger: 101,
  txHash: 'a'.repeat(64),
  value: {},
};

describe('bounty earning event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scValToNative.mockReturnValue({
      bounty_id: 42n,
      sender,
      recipient,
      amount: 50_000_000n,
      fee: 2_500_000n,
    });
    mocks.recordBountyEarning.mockResolvedValue(true);
  });

  it('records a successful pay_bnty event', async () => {
    await expect(handleBountyEarningEvent(contractEvent)).resolves.toBe(true);
    expect(mocks.recordBountyEarning).toHaveBeenCalledWith(
      {
        contractBountyId: '42',
        sender,
        recipient,
        amountUnits: '50000000',
        feeAmountUnits: '2500000',
      },
      { eventId: 'event-1', ledger: 101, txHash: 'a'.repeat(64) },
    );
  });

  it('decodes and validates exact settlement values', () => {
    expect(
      decodeBountySettledEvent({
        bounty_id: '42',
        sender,
        recipient,
        amount: '50000000',
        fee: '0',
      }),
    ).toEqual({
      contractBountyId: '42',
      sender,
      recipient,
      amountUnits: '50000000',
      feeAmountUnits: '0',
    });
  });
});
