import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import MessageBounty from '../../src/models/MessageBounty';

const sponsor = new Types.ObjectId('000000000000000000000001');

const beneficiary = new Types.ObjectId('000000000000000000000002');

const bountyInput = () => ({
  contractBountyId: '1',
  message: new Types.ObjectId('000000000000000000000003'),
  conversation: new Types.ObjectId('000000000000000000000004'),
  sponsor,
  beneficiary,
  assetCode: 'USDC',
  amount: '10.5',
  amountUnits: '105000000',
  durationSeconds: 3_600,
  expiresAt: new Date('2026-08-07T13:00:00.000Z'),
});

describe('MessageBounty model', () => {
  it('requires contract funding and exact base units', async () => {
    const bounty = new MessageBounty(bountyInput());

    await expect(bounty.validate()).resolves.toBeUndefined();
    expect(bounty.status).toBe('offered');
    expect(bounty.contractBountyId).toBe('1');
    expect(bounty.amountUnits).toBe('105000000');
    expect(bounty.fundingStatus).toBe('contract_locked');
    expect(bounty.settlementStatus).toBe('pending');
    expect(bounty.replyMessage).toBeNull();
    expect(bounty.claimableAt).toBeNull();
    expect(bounty.claimedAt).toBeNull();

    await expect(
      new MessageBounty({ ...bountyInput(), contractBountyId: undefined }).validate(),
    ).rejects.toBeDefined();

    await expect(
      new MessageBounty({ ...bountyInput(), amountUnits: undefined }).validate(),
    ).rejects.toBeDefined();
  });

  it('defines one bounty per message and expiry query indexes', () => {
    expect(MessageBounty.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { message: 1 },
          expect.objectContaining({ unique: true, name: 'message_bounties_message_unique' }),
        ],
        [
          { contractBountyId: 1 },
          expect.objectContaining({ unique: true, name: 'message_bounties_contract_id_unique' }),
        ],
        [
          { status: 1, expiresAt: 1 },
          expect.objectContaining({ name: 'message_bounties_status_expiry' }),
        ],
      ]),
    );
  });

  it('rejects invalid amounts, durations, self-bounties, and undeclared payment fields', async () => {
    await expect(
      new MessageBounty({ ...bountyInput(), amount: '0' }).validate(),
    ).rejects.toBeDefined();
    await expect(
      new MessageBounty({ ...bountyInput(), durationSeconds: 0 }).validate(),
    ).rejects.toBeDefined();
    await expect(
      new MessageBounty({ ...bountyInput(), beneficiary: sponsor }).validate(),
    ).rejects.toThrow('A bounty requires different sponsor and beneficiary users');
    await expect(
      new MessageBounty({
        ...bountyInput(),
        contractBountyId: ((1n << 64n) + 1n).toString(),
      }).validate(),
    ).rejects.toThrow('Contract bounty ID must be a positive u64 integer');
    expect(() => new MessageBounty({ ...bountyInput(), paymentSecret: 'not-allowed' })).toThrow();
  });
});
