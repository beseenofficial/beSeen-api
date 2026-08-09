import type { ClientSession } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import TokenHolding from '../../models/TokenHolding';
import User from '../../models/User';
import ensureConversation from '../messenger/ensureConversation';
import getOrCreateUserToken from './getOrCreateUserToken';

type PurchaseUserTokenResult =
  | {
      ok: true;
      created: boolean;
      holding: { tokenId: string; ownerId: string; ownerUsername: string; acquiredAt: Date };
      conversation: { id: string; created: boolean };
    }
  | { ok: false; reason: 'buyer_unavailable' | 'user_not_found' | 'own_token' };

const purchaseUserTokenInTransaction = async (
  buyerId: string,
  ownerUsername: string,
  session: ClientSession,
): Promise<PurchaseUserTokenResult> => {
  const buyer = await User.findOne({
    _id: buyerId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();
  const owner = await User.findOne({
    username: ownerUsername,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!buyer) {
    return { ok: false, reason: 'buyer_unavailable' };
  }

  if (!owner) {
    return { ok: false, reason: 'user_not_found' };
  }

  if (buyer._id.equals(owner._id)) {
    return { ok: false, reason: 'own_token' };
  }

  const token = await getOrCreateUserToken(owner._id, session);
  const writeResult = await TokenHolding.updateOne(
    { token: token._id, holder: buyer._id },
    { $setOnInsert: { token: token._id, holder: buyer._id } },
    { upsert: true, session },
  ).exec();

  const holding = await TokenHolding.findOne({ token: token._id, holder: buyer._id })
    .session(session)
    .exec();
    
  const ensuredConversation = await ensureConversation(buyer._id, owner._id, session);

  if (!holding) {
    throw new Error('Token holding could not be created');
  }

  return {
    ok: true,
    created: writeResult.upsertedCount === 1,
    holding: {
      tokenId: token._id.toString(),
      ownerId: owner._id.toString(),
      ownerUsername: owner.username,
      acquiredAt: holding.createdAt,
    },
    conversation: {
      id: ensuredConversation.conversation._id.toString(),
      created: ensuredConversation.created,
    },
  };
};

const purchaseUserToken = async (
  buyerId: string,
  ownerUsername: string,
): Promise<PurchaseUserTokenResult> =>
  withDatabaseTransaction((session) =>
    purchaseUserTokenInTransaction(buyerId, ownerUsername, session),
  );

export default purchaseUserToken;
export type { PurchaseUserTokenResult };
