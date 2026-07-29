import TokenHolding from '../../models/TokenHolding';
import User from '../../models/User';
import getOrCreateUserToken from './getOrCreateUserToken';

type PurchaseUserTokenResult =
  | {
      ok: true;
      created: boolean;
      holding: { tokenId: string; ownerId: string; ownerUsername: string; acquiredAt: Date };
    }
  | { ok: false; reason: 'buyer_unavailable' | 'user_not_found' | 'own_token' };

const purchaseUserToken = async (
  buyerId: string,
  ownerUsername: string,
): Promise<PurchaseUserTokenResult> => {
  const [buyer, owner] = await Promise.all([
    User.findOne({ _id: buyerId, status: 'active', deletedAt: null }).exec(),
    User.findOne({ username: ownerUsername, status: 'active', deletedAt: null }).exec(),
  ]);

  if (!buyer) return { ok: false, reason: 'buyer_unavailable' };
  if (!owner) return { ok: false, reason: 'user_not_found' };
  if (buyer._id.equals(owner._id)) return { ok: false, reason: 'own_token' };

  const token = await getOrCreateUserToken(owner._id);
  const writeResult = await TokenHolding.updateOne(
    { token: token._id, holder: buyer._id },
    { $setOnInsert: { token: token._id, holder: buyer._id } },
    { upsert: true },
  ).exec();
  const holding = await TokenHolding.findOne({ token: token._id, holder: buyer._id }).exec();

  if (!holding) throw new Error('Token holding could not be created');

  return {
    ok: true,
    created: writeResult.upsertedCount === 1,
    holding: {
      tokenId: token._id.toString(),
      ownerId: owner._id.toString(),
      ownerUsername: owner.username,
      acquiredAt: holding.createdAt,
    },
  };
};

export default purchaseUserToken;
export type { PurchaseUserTokenResult };
