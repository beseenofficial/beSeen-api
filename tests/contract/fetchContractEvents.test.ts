import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  getHealth: vi.fn(),
  getEvents: vi.fn(),
  eventLedgerBatchSize: 10_000,
}));

vi.mock('../../src/logger', () => ({
  default: { info: mocks.info, warn: mocks.warn },
}));
vi.mock('../../src/utils/contract/contractConfig', () => ({
  default: () => ({
    rpcUrl: 'https://rpc.example.com',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    sourceAccount: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV',
    startLedger: 100,
    eventLedgerBatchSize: mocks.eventLedgerBatchSize,
  }),
}));
vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: {
    rpc: {
      Server: vi.fn(function MockServer() {
        return { getHealth: mocks.getHealth, getEvents: mocks.getEvents };
      }),
    },
  },
}));

import fetchContractEvents from '../../src/utils/contract/event/fetchContractEvents';

describe('contract event ledger batching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eventLedgerBatchSize = 10_000;

    mocks.getHealth.mockResolvedValue({ oldestLedger: 50, latestLedger: 25_000 });
    mocks.getEvents.mockResolvedValue({ events: [], cursor: 'unused' });
  });

  it('starts at the configured deployment ledger and advances one bounded range', async () => {
    await expect(fetchContractEvents('test-stream', 'topic', null)).resolves.toEqual({
      events: [],
      lastProcessedLedger: 10_099,
    });
    expect(mocks.getEvents).toHaveBeenCalledWith({
      filters: [
        {
          type: 'contract',
          contractIds: ['CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'],
          topics: [['topic']],
        },
      ],
      startLedger: 100,
      endLedger: 10_100,
      limit: 100,
    });
    expect(mocks.info).toHaveBeenCalledWith(
      {
        stream: 'test-stream',
        startLedger: 100,
        endLedger: 10_099,
        latestLedger: 25_000,
      },
      'Checking contract event ledger range',
    );
  });

  it('resumes from the ledger after the persisted checkpoint', async () => {
    await expect(fetchContractEvents('test-stream', 'topic', 12_345)).resolves.toEqual({
      events: [],
      lastProcessedLedger: 22_345,
    });
    expect(mocks.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 12_346, endLedger: 22_346 }),
    );
  });

  it('uses the configured ledger batch size', async () => {
    mocks.eventLedgerBatchSize = 2_500;

    await expect(fetchContractEvents('test-stream', 'topic', null)).resolves.toEqual({
      events: [],
      lastProcessedLedger: 2_599,
    });
    expect(mocks.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 100, endLedger: 2_600 }),
    );
  });

  it('clamps an unavailable historical checkpoint to the RPC retention window', async () => {
    mocks.getHealth.mockResolvedValue({ oldestLedger: 5_000, latestLedger: 25_000 });

    await expect(fetchContractEvents('test-stream', 'topic', null)).resolves.toEqual({
      events: [],
      lastProcessedLedger: 14_999,
    });
    expect(mocks.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ startLedger: 5_000, endLedger: 15_000 }),
    );
    expect(mocks.warn).toHaveBeenCalledOnce();
  });

  it('shrinks a saturated range instead of skipping matching events', async () => {
    mocks.getEvents
      .mockResolvedValueOnce({
        events: Array.from({ length: 100 }, (_, index) => ({ id: `event-${index}` })),
        cursor: 'saturated',
      })
      .mockResolvedValueOnce({ events: [], cursor: 'unused' });

    await expect(fetchContractEvents('test-stream', 'topic', null)).resolves.toEqual({
      events: [],
      lastProcessedLedger: 5_099,
    });
    expect(mocks.getEvents).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ startLedger: 100, endLedger: 5_100 }),
    );
  });
});
