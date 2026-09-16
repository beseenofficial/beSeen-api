import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import EarningTransaction from '../../src/models/EarningTransaction';

const earningInput = () => ({
  user: new Types.ObjectId(),
  messageBounty: new Types.ObjectId(),
  contractBountyId: '42',
  type: 'bounty_reply' as const,
  assetCode: 'USDC' as const,
  grossAmountUnits: '50000000',
  feeAmountUnits: '2500000',
  netAmountUnits: '47500000',
  transactionHash: 'a'.repeat(64),
  eventId: '0000000000000065-0000000001',
  eventLedger: 101,
  earnedAt: new Date('2026-09-16T12:00:00.000Z'),
});

describe('EarningTransaction model', () => {
  it('accepts a confirmed bounty reply earning', async () => {
    await expect(new EarningTransaction(earningInput()).validate()).resolves.toBeUndefined();
  });

  it('rejects malformed money and transaction metadata', async () => {
    await expect(
      new EarningTransaction({
        ...earningInput(),
        netAmountUnits: '-1',
        transactionHash: 'invalid',
      }).validate(),
    ).rejects.toThrow();
  });
});
