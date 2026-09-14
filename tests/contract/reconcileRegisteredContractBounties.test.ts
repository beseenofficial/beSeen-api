import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  aggregateExec: vi.fn(),
  getContractBounty: vi.fn(),
  upsertContractBounty: vi.fn(),
}));

vi.mock('../../src/models/ContractBounty', () => ({
  default: { collection: { name: 'contractbounties' } },
}));
vi.mock('../../src/models/MessageBounty', () => ({
  default: {
    aggregate: vi.fn(() => ({ exec: mocks.aggregateExec })),
  },
}));
vi.mock('../../src/utils/contract/getContractBounty', () => ({
  default: mocks.getContractBounty,
}));
vi.mock('../../src/utils/contract/upsertContractBounty', () => ({
  default: mocks.upsertContractBounty,
}));

import reconcileRegisteredContractBounties from '../../src/utils/contract/reconcileRegisteredContractBounties';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

describe('registered contract bounty reconciliation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recovers an officially registered bounty whose lock event was missed', async () => {
    mocks.aggregateExec.mockResolvedValue([{ contractBountyId: '7' }]);
    mocks.getContractBounty.mockResolvedValue({
      contractBountyId: '7',
      sender,
      recipient,
      amount: '20000000',
      deadline: '1700172800',
      status: 'locked',
    });

    await expect(reconcileRegisteredContractBounties()).resolves.toEqual({
      checked: 1,
      synchronized: 1,
      notFound: 0,
    });
    expect(mocks.getContractBounty).toHaveBeenCalledWith(7n);
    expect(mocks.upsertContractBounty).toHaveBeenCalledWith(
      expect.objectContaining({ contractBountyId: '7', observedVia: 'reconciliation' }),
    );
  });

  it('does not create a mirror when the registered ID is absent on-chain', async () => {
    mocks.aggregateExec.mockResolvedValue([{ contractBountyId: '8' }]);
    mocks.getContractBounty.mockResolvedValue(null);

    await expect(reconcileRegisteredContractBounties()).resolves.toEqual({
      checked: 1,
      synchronized: 0,
      notFound: 1,
    });
    expect(mocks.upsertContractBounty).not.toHaveBeenCalled();
  });
});
