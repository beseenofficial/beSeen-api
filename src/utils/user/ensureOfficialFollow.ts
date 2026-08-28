import type { ClientSession, Types } from 'mongoose';

import User from '../../models/User';
import TokenHolding from '../../models/TokenHolding';
import { OFFICIAL_USER_USERNAME } from '../../constant/user';
import getOrCreateUserToken from '../token/getOrCreateUserToken';
import ensureConversation from '../messenger/ensureConversation';

interface EnsureOfficialFollowResult {
  followed: boolean;
  holdingCreated: boolean;
  conversationCreated: boolean;
  reason?: 'official_account_unavailable' | 'official_account_self';
}

const ensureOfficialFollow = async (
  followerId: Types.ObjectId,
  session: ClientSession,
): Promise<EnsureOfficialFollowResult> => {
  const officialUser = await User.findOne({
    username: OFFICIAL_USER_USERNAME,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!officialUser) {
    return {
      followed: false,
      holdingCreated: false,
      conversationCreated: false,
      reason: 'official_account_unavailable',
    };
  }

  if (officialUser._id.equals(followerId)) {
    return {
      followed: false,
      holdingCreated: false,
      conversationCreated: false,
      reason: 'official_account_self',
    };
  }

  const officialToken = await getOrCreateUserToken(officialUser._id, session);
  const holdingResult = await TokenHolding.updateOne(
    { token: officialToken._id, holder: followerId },
    { $setOnInsert: { token: officialToken._id, holder: followerId } },
    { upsert: true, session },
  ).exec();
  const conversation = await ensureConversation(followerId, officialUser._id, session);

  return {
    followed: true,
    holdingCreated: holdingResult.upsertedCount === 1,
    conversationCreated: conversation.created,
  };
};

export default ensureOfficialFollow;
export type { EnsureOfficialFollowResult };
