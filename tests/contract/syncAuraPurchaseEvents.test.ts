import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scValToNative: vi.fn(),
  isRegistered: vi.fn(),
  confirmAuraPurchase: vi.fn(),
  recordAuraEarning: vi.fn(),
}));

vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: { scValToNative: mocks.scValToNative },
}));
vi.mock('../../src/models/AuraToken', () => ({ default: { exists: mocks.isRegistered } }));
vi.mock('../../src/utils/aura/confirmAuraPurchase', () => ({
  default: mocks.confirmAuraPurchase,
}));
vi.mock('../../src/utils/earning/recordContractFinancialEvent', () => ({
  recordAuraEarning: mocks.recordAuraEarning,
}));

import handleAuraPurchaseEvent from '../../src/utils/contract/event/syncAuraPurchaseEvents';

const buyer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const subject = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const contractEvent = {
  id: 'event-1',
  ledger: 101,
  txHash: 'a'.repeat(64),
  ledgerClosedAt: '2026-09-19T12:00:00Z',
  value: {},
};

describe('Aura purchase event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scValToNative.mockReturnValue({
      token_id: 42n,
      buyer,
      subject,
      price: 20_000_000n,
      fee: 1_000_000n,
    });
    mocks.isRegistered.mockResolvedValue({ _id: 'registered' });
    mocks.confirmAuraPurchase.mockResolvedValue({ confirmed: true });
    mocks.recordAuraEarning.mockResolvedValue(true);
  });

  it('confirms a matching API-registered transaction', async () => {
    await expect(handleAuraPurchaseEvent(contractEvent)).resolves.toBe(true);
    expect(mocks.isRegistered).toHaveBeenCalledWith({
      contractTokenId: '42',
      purchaseTransactionHash: 'a'.repeat(64),
      status: { $ne: 'failed' },
    });
    expect(mocks.confirmAuraPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        contractTokenId: '42',
        buyer,
        subject,
        transactionHash: 'a'.repeat(64),
      }),
      'event',
    );
    expect(mocks.recordAuraEarning).toHaveBeenCalledWith(
      {
        contractAuraTokenId: '42',
        subject,
        priceAmountUnits: '20000000',
        feeAmountUnits: '1000000',
      },
      { eventId: 'event-1', ledger: 101, txHash: 'a'.repeat(64) },
      '2026-09-19T12:00:00Z',
    );
  });

  it('records earnings for an API user even when the purchase was not registered', async () => {
    mocks.isRegistered.mockResolvedValue(null);
    await expect(handleAuraPurchaseEvent(contractEvent)).resolves.toBe(true);
    expect(mocks.confirmAuraPurchase).not.toHaveBeenCalled();
    expect(mocks.recordAuraEarning).toHaveBeenCalledOnce();
  });
});
