import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scValToNative: vi.fn(),
  isRegistered: vi.fn(),
  confirmAuraPurchase: vi.fn(),
}));

vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: { scValToNative: mocks.scValToNative },
}));
vi.mock('../../src/models/AuraToken', () => ({ default: { exists: mocks.isRegistered } }));
vi.mock('../../src/utils/aura/confirmAuraPurchase', () => ({
  default: mocks.confirmAuraPurchase,
}));

import handleAuraPurchaseEvent from '../../src/utils/contract/event/syncAuraPurchaseEvents';

const buyer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const subject = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const contractEvent = {
  id: 'event-1',
  ledger: 101,
  txHash: 'a'.repeat(64),
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
  });

  it('ignores an unrelated direct contract purchase', async () => {
    mocks.isRegistered.mockResolvedValue(null);
    await expect(handleAuraPurchaseEvent(contractEvent)).resolves.toBe(false);
    expect(mocks.confirmAuraPurchase).not.toHaveBeenCalled();
  });
});
