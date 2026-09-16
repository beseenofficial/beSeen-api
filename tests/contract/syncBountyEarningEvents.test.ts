import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getHealth: vi.fn(),
  getEvents: vi.fn(),
  scValToNative: vi.fn(),
  stateSave: vi.fn(),
  recordBountyEarning: vi.fn(),
}));

vi.mock('../../src/utils/contract/contractConfig', () => ({
  default: () => ({
    rpcUrl: 'https://rpc.example.com',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
    startLedger: 100,
    eventLedgerBatchSize: 10_000,
  }),
}));
vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: {
    rpc: {
      Server: vi.fn(function MockServer() {
        return { getHealth: mocks.getHealth, getEvents: mocks.getEvents };
      }),
    },
    xdr: { ScVal: { scvSymbol: () => ({ toXDR: () => 'pay-bounty-topic' }) } },
    scValToNative: mocks.scValToNative,
  },
}));
vi.mock('../../src/models/ContractSyncState', () => ({
  default: {
    findByIdAndUpdate: vi.fn(() => ({
      exec: async () => ({
        eventCursor: null,
        lastProcessedLedger: null,
        save: mocks.stateSave,
      }),
    })),
  },
}));
vi.mock('../../src/utils/earning/recordBountyEarning', () => ({
  default: mocks.recordBountyEarning,
}));

import syncBountyEarningEvents, {
  decodeBountySettledEvent,
} from '../../src/utils/contract/event/syncBountyEarningEvents';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

describe('bounty earning event synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getHealth.mockResolvedValue({ oldestLedger: 100, latestLedger: 20_000 });
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
    });
    mocks.scValToNative.mockReturnValue({
      bounty_id: 42n,
      sender,
      recipient,
      amount: 50_000_000n,
      fee: 2_500_000n,
    });
    mocks.recordBountyEarning.mockResolvedValue(true);
  });

  it('records a successful pay_bnty event and advances its own checkpoint', async () => {
    await expect(syncBountyEarningEvents()).resolves.toEqual({
      processed: 1,
      lastProcessedLedger: 10_099,
    });
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
    expect(mocks.stateSave).toHaveBeenCalledOnce();
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
