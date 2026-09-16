import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  stateSave: vi.fn(),
  getContractBounty: vi.fn(),
  upsertContractBounty: vi.fn(),
  isRegistered: vi.fn(),
}));

const state = {
  eventCursor: null,
  lastReconciledBountyId: '0',
  save: mocks.stateSave,
};

vi.mock('../../src/models/ContractBounty', () => ({
  default: { exists: mocks.exists },
}));
vi.mock('../../src/models/ContractSyncState', () => ({
  default: {
    findByIdAndUpdate: vi.fn(() => ({ exec: async () => state })),
  },
}));
vi.mock('../../src/models/MessageBounty', () => ({
  default: { exists: mocks.isRegistered },
}));
vi.mock('../../src/utils/contract/getContractBounty', () => ({
  default: mocks.getContractBounty,
}));
vi.mock('../../src/utils/contract/upsertContractBounty', () => ({
  default: mocks.upsertContractBounty,
}));

import reconcileNextContractBounty from '../../src/utils/contract/reconcileNextContractBounty';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

describe('contract bounty reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.lastReconciledBountyId = '0';
    mocks.isRegistered.mockResolvedValue({ _id: 'registered' });
  });

  it('advances across event-observed IDs and checks the next missing ID', async () => {
    mocks.exists.mockResolvedValueOnce({ _id: 'one' }).mockResolvedValueOnce({ _id: 'two' });
    mocks.exists.mockResolvedValueOnce(null);
    mocks.getContractBounty.mockResolvedValue({
      contractBountyId: '3',
      sender,
      recipient,
      amount: '1',
      deadline: '2000000000',
      status: 'locked',
    });

    await expect(reconcileNextContractBounty()).resolves.toEqual({
      checkedBountyId: '3',
      found: true,
      registered: true,
      advancedAcrossObserved: 2,
    });
    expect(mocks.getContractBounty).toHaveBeenCalledWith(3n);
    expect(mocks.upsertContractBounty).toHaveBeenCalledWith(
      expect.objectContaining({ contractBountyId: '3', observedVia: 'reconciliation' }),
    );
    expect(state.lastReconciledBountyId).toBe('3');
  });

  it('does not advance when the next contract ID does not exist', async () => {
    mocks.exists.mockResolvedValue(null);
    mocks.getContractBounty.mockResolvedValue(null);

    await expect(reconcileNextContractBounty()).resolves.toEqual({
      checkedBountyId: '1',
      found: false,
      registered: false,
      advancedAcrossObserved: 0,
    });
    expect(mocks.upsertContractBounty).not.toHaveBeenCalled();
    expect(state.lastReconciledBountyId).toBe('0');
  });

  it('advances past an existing but unregistered contract bounty without storing it', async () => {
    mocks.exists.mockResolvedValue(null);
    mocks.isRegistered.mockResolvedValue(null);
    mocks.getContractBounty.mockResolvedValue({
      contractBountyId: '1',
      sender,
      recipient,
      amount: '1',
      deadline: '2000000000',
      status: 'locked',
    });

    await expect(reconcileNextContractBounty()).resolves.toEqual({
      checkedBountyId: '1',
      found: true,
      registered: false,
      advancedAcrossObserved: 0,
    });
    expect(mocks.upsertContractBounty).not.toHaveBeenCalled();
    expect(state.lastReconciledBountyId).toBe('1');
  });
});
