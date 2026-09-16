import { describe, expect, it } from 'vitest';

import ContractBounty from '../../src/models/ContractBounty';

const sender = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';

const recipient = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

const bountyInput = () => ({
  contractBountyId: '1',
  sender,
  recipient,
  amount: '20000000',
  deadline: '1700172800',
  status: 'locked' as const,
  observedVia: 'event' as const,
  eventId: '0000000000000000001-0000000001',
  eventLedger: 123,
  lockTransactionHash: 'a'.repeat(64),
});

describe('ContractBounty model', () => {
  it('stores the contract ID separately from the Mongo ObjectId', async () => {
    const bounty = new ContractBounty(bountyInput());

    await expect(bounty.validate()).resolves.toBeUndefined();
    expect(bounty._id.toString()).not.toBe(bounty.contractBountyId);
    expect(bounty.contractBountyId).toBe('1');
  });

  it('defines a globally unique contract bounty ID index', () => {
    expect(ContractBounty.schema.indexes()).toContainEqual([
      { contractBountyId: 1 },
      expect.objectContaining({ unique: true, name: 'contract_bounties_contract_id_unique' }),
    ]);
  });

  it('rejects zero IDs and malformed on-chain fields', async () => {
    await expect(
      new ContractBounty({ ...bountyInput(), contractBountyId: '0' }).validate(),
    ).rejects.toBeDefined();
    await expect(
      new ContractBounty({ ...bountyInput(), amount: '-1' }).validate(),
    ).rejects.toBeDefined();
    await expect(
      new ContractBounty({ ...bountyInput(), sender: 'not-an-address' }).validate(),
    ).rejects.toBeDefined();
  });
});
