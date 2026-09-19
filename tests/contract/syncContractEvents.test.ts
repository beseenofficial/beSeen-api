import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getHealth: vi.fn(),
  getEvents: vi.fn(),
  handleBounty: vi.fn(),
  handleAura: vi.fn(),
  handleEarning: vi.fn(),
  handleWithdrawal: vi.fn(),
  stateSave: vi.fn(),
  states: [] as Array<{
    lastProcessedLedger: number | null;
    eventCursor: string | null;
    auraEventCursor: string | null;
    save: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('../../src/utils/contract/contractConfig', () => ({
  default: () => ({
    rpcUrl: 'https://rpc.example.com',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
    startLedger: 50,
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
    xdr: {
      ScVal: {
        scvSymbol: (symbol: string) => ({ toXDR: () => `${symbol}-topic` }),
      },
    },
  },
}));
vi.mock('../../src/models/ContractSyncState', () => ({
  default: {
    findByIdAndUpdate: vi.fn(() => ({
      exec: async () => mocks.states.shift(),
    })),
  },
}));
vi.mock('../../src/utils/contract/event/syncBountyLockEvents', () => ({
  handleBountyLockEvent: mocks.handleBounty,
}));
vi.mock('../../src/utils/contract/event/syncAuraPurchaseEvents', () => ({
  handleAuraPurchaseEvent: mocks.handleAura,
}));
vi.mock('../../src/utils/contract/event/syncBountyEarningEvents', () => ({
  handleBountyEarningEvent: mocks.handleEarning,
}));
vi.mock('../../src/utils/contract/event/syncWithdrawalEvents', () => ({
  handleWithdrawalEvent: mocks.handleWithdrawal,
}));

import syncContractEvents from '../../src/utils/contract/event/syncContractEvents';

const event = (id: string, topic: string) => ({
  id,
  ledger: 101,
  txHash: 'a'.repeat(64),
  inSuccessfulContractCall: true,
  topic: [{ toXDR: () => topic }],
  value: {},
});

describe('unified contract event synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.states = [90, 95, 100, 100].map((lastProcessedLedger) => ({
      lastProcessedLedger,
      eventCursor: 'legacy-cursor',
      auraEventCursor: 'legacy-aura-cursor',
      save: mocks.stateSave,
    }));
    mocks.getHealth.mockResolvedValue({ oldestLedger: 50, latestLedger: 150 });
    mocks.getEvents.mockResolvedValue({
      events: [
        event('bounty-event', 'lock_bnty-topic'),
        event('aura-event', 'buy_aura-topic'),
        event('earning-event', 'pay_bnty-topic'),
        event('withdrawal-event', 'withdraw-topic'),
      ],
    });
    mocks.handleBounty.mockResolvedValue(true);
    mocks.handleAura.mockResolvedValue(true);
    mocks.handleEarning.mockResolvedValue(true);
    mocks.handleWithdrawal.mockResolvedValue(true);
  });

  it('fetches every registered topic once and dispatches each event to its handler', async () => {
    await expect(syncContractEvents()).resolves.toEqual({
      bounties: 1,
      auras: 1,
      earnings: 1,
      withdrawals: 1,
      processed: 4,
      lastProcessedLedger: 150,
    });

    expect(mocks.getEvents).toHaveBeenCalledOnce();
    expect(mocks.getEvents).toHaveBeenCalledWith({
      filters: [
        {
          type: 'contract',
          contractIds: ['CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'],
          topics: [['lock_bnty-topic'], ['buy_aura-topic'], ['pay_bnty-topic'], ['withdraw-topic']],
        },
      ],
      startLedger: 91,
      endLedger: 151,
      limit: 100,
    });
    expect(mocks.handleBounty).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bounty-event' }),
    );
    expect(mocks.handleAura).toHaveBeenCalledWith(expect.objectContaining({ id: 'aura-event' }));
    expect(mocks.handleEarning).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'earning-event' }),
    );
    expect(mocks.handleWithdrawal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'withdrawal-event' }),
    );
    expect(mocks.stateSave).toHaveBeenCalledTimes(4);
  });

  it('does not advance checkpoints when a handler fails', async () => {
    mocks.handleAura.mockRejectedValue(new Error('temporary handler failure'));

    await expect(syncContractEvents()).rejects.toThrow('temporary handler failure');
    expect(mocks.stateSave).not.toHaveBeenCalled();
  });
});
