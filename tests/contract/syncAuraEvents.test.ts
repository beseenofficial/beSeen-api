import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  scValToNative: vi.fn(),
  stateSave: vi.fn(),
  isRegistered: vi.fn(),
  confirmAuraPurchase: vi.fn(),
}));

vi.mock('../../src/utils/contract/contractConfig', () => ({
  default: () => ({
    rpcUrl: 'https://rpc.example.com',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
    startLedger: 100,
  }),
}));
vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: {
    rpc: {
      Server: vi.fn(function MockServer() {
        return { getEvents: mocks.getEvents };
      }),
    },
    xdr: { ScVal: { scvSymbol: () => ({ toXDR: () => 'buy-aura-topic' }) } },
    scValToNative: mocks.scValToNative,
  },
}));
vi.mock('../../src/models/ContractSyncState', () => ({
  default: {
    findByIdAndUpdate: vi.fn(() => ({
      exec: async () => ({ auraEventCursor: null, save: mocks.stateSave }),
    })),
  },
}));
vi.mock('../../src/models/AuraToken', () => ({ default: { exists: mocks.isRegistered } }));
vi.mock('../../src/utils/aura/confirmAuraPurchase', () => ({
  default: mocks.confirmAuraPurchase,
}));

import syncAuraEvents from '../../src/utils/contract/syncAuraEvents';

const buyer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const subject = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Aura purchase event synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue({
      events: [
        {
          id: 'event-1',
          ledger: 101,
          txHash: 'a'.repeat(64),
          inSuccessfulContractCall: true,
          value: {},
        },
      ],
      cursor: 'cursor-1',
    });
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

  it('confirms only a matching API-registered transaction', async () => {
    await expect(syncAuraEvents()).resolves.toEqual({ processed: 1, cursor: 'cursor-1' });
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
    await expect(syncAuraEvents()).resolves.toEqual({ processed: 0, cursor: 'cursor-1' });
    expect(mocks.confirmAuraPurchase).not.toHaveBeenCalled();
    expect(mocks.stateSave).toHaveBeenCalledOnce();
  });
});
