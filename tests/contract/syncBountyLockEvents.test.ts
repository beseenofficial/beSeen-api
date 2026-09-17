import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  scValToNative: vi.fn(),
  upsertContractBounty: vi.fn(),
  getContractBounty: vi.fn(),
  isRegistered: vi.fn(),
}));

vi.mock('../../src/utils/contract/stellarSdk', () => ({
  default: { scValToNative: mocks.scValToNative },
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

import handleBountyLockEvent from '../../src/utils/contract/event/syncBountyLockEvents';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
const contractEvent = {
  id: 'event-1',
  ledger: 101,
  txHash: 'a'.repeat(64),
  value: {},
};

describe('bounty lock event handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scValToNative.mockReturnValue({
      bounty_id: 1n,
      sender,
      recipient,
      amount: 20_000_000n,
      deadline: 1_700_172_800n,
    });
    mocks.isRegistered.mockResolvedValue({ _id: 'registered' });
  });

  it('stores a complete lock event without a get_bounty fallback call', async () => {
    await expect(handleBountyLockEvent(contractEvent)).resolves.toBe(true);
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

    await handleBountyLockEvent(contractEvent);

    expect(mocks.getContractBounty).toHaveBeenCalledWith(1n);
    expect(mocks.upsertContractBounty).toHaveBeenCalledOnce();
  });

  it('ignores contract calls that were not registered through the API', async () => {
    mocks.isRegistered.mockResolvedValue(null);

    await expect(handleBountyLockEvent(contractEvent)).resolves.toBe(false);
    expect(mocks.getContractBounty).not.toHaveBeenCalled();
    expect(mocks.upsertContractBounty).not.toHaveBeenCalled();
  });
});
