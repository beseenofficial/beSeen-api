import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getHealth: vi.fn(),
  getEvents: vi.fn(),
  scValToNative: vi.fn(),
  stateSave: vi.fn(),
  upsertContractBounty: vi.fn(),
  getContractBounty: vi.fn(),
  isRegistered: vi.fn(),
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
    xdr: {
      ScVal: {
        scvSymbol: () => ({ toXDR: () => 'lock-bounty-topic' }),
      },
    },
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
vi.mock('../../src/models/MessageBounty', () => ({
  default: { exists: mocks.isRegistered },
}));
vi.mock('../../src/utils/contract/upsertContractBounty', () => ({
  default: mocks.upsertContractBounty,
}));
vi.mock('../../src/utils/contract/getContractBounty', () => ({
  default: mocks.getContractBounty,
}));

import syncBountyLockEvents from '../../src/utils/contract/event/syncBountyLockEvents';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

describe('bounty event synchronization', () => {
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
      cursor: 'cursor-1',
    });
    mocks.scValToNative.mockReturnValue({
      bounty_id: 1n,
      sender,
      recipient,
      amount: 20_000_000n,
      deadline: 1_700_172_800n,
    });
    mocks.isRegistered.mockResolvedValue({ _id: 'registered' });
  });

  it('stores complete lock events without making a get_bounty fallback call', async () => {
    await expect(syncBountyLockEvents()).resolves.toEqual({
      processed: 1,
      lastProcessedLedger: 10_099,
    });
    expect(mocks.getEvents).toHaveBeenCalledWith({
      filters: [
        {
          type: 'contract',
          contractIds: ['CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'],
          topics: [['lock-bounty-topic']],
        },
      ],
      startLedger: 100,
      endLedger: 10_100,
      limit: 100,
    });
    expect(mocks.upsertContractBounty).toHaveBeenCalledWith({
      contractBountyId: '1',
      sender,
      recipient,
      amount: '20000000',
      deadline: '1700172800',
      status: 'locked',
      observedVia: 'event',
      eventId: 'event-1',
      eventLedger: 101,
      lockTransactionHash: 'a'.repeat(64),
    });
    expect(mocks.getContractBounty).not.toHaveBeenCalled();
    expect(mocks.stateSave).toHaveBeenCalledOnce();
  });

  it('calls get_bounty when the event does not contain every contract field', async () => {
    mocks.scValToNative.mockReturnValue({ bounty_id: 1n });
    mocks.getContractBounty.mockResolvedValue({
      contractBountyId: '1',
      sender,
      recipient,
      amount: '20000000',
      deadline: '1700172800',
      status: 'locked',
    });

    await syncBountyLockEvents();

    expect(mocks.getContractBounty).toHaveBeenCalledWith(1n);
    expect(mocks.upsertContractBounty).toHaveBeenCalledOnce();
  });

  it('ignores contract calls that were not registered through the API', async () => {
    mocks.isRegistered.mockResolvedValue(null);

    await expect(syncBountyLockEvents()).resolves.toEqual({
      processed: 0,
      lastProcessedLedger: 10_099,
    });
    expect(mocks.getContractBounty).not.toHaveBeenCalled();
    expect(mocks.upsertContractBounty).not.toHaveBeenCalled();
    expect(mocks.stateSave).toHaveBeenCalledOnce();
  });
});
