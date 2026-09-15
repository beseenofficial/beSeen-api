import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import AuraFollow from '../../src/models/AuraFollow';
import AuraToken from '../../src/models/AuraToken';

const buyer = new Types.ObjectId();
const subject = new Types.ObjectId();
const buyerAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL7NV';
const subjectAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('Aura models', () => {
  it('stores a pending on-chain purchase registration with a global token ID', async () => {
    const token = new AuraToken({
      contractTokenId: '42',
      buyer,
      subject,
      buyerAddress,
      subjectAddress,
      purchaseTransactionHash: 'a'.repeat(64),
    });

    await expect(token.validate()).resolves.toBeUndefined();
    expect(token.status).toBe('pending');
    expect(token.confirmedAt).toBeNull();
    expect(AuraToken.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { contractTokenId: 1 },
          expect.objectContaining({ unique: true, name: 'aura_tokens_contract_token_id_unique' }),
        ],
      ]),
    );
  });

  it('defines one Aura follow per buyer and subject regardless of purchase count', async () => {
    const follow = new AuraFollow({ follower: buyer, subject, firstContractTokenId: '42' });
    await expect(follow.validate()).resolves.toBeUndefined();
    expect(AuraFollow.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { follower: 1, subject: 1 },
          expect.objectContaining({ unique: true, name: 'aura_follows_follower_subject_unique' }),
        ],
      ]),
    );
  });
});
