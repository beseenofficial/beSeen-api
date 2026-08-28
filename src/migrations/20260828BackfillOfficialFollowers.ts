import User from '../models/User';
import Conversation from '../models/Conversation';
import TokenHolding from '../models/TokenHolding';
import { OFFICIAL_USER_USERNAME } from '../constant/user';
import getOrCreateUserToken from '../utils/token/getOrCreateUserToken';
import { canonicalParticipantPair } from '../utils/messenger/ensureConversation';

const backfillOfficialFollowers = async () => {
  const officialUser = await User.findOne({
    username: OFFICIAL_USER_USERNAME,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!officialUser) {
    return {
      officialAccountFound: false,
      eligibleUsers: 0,
      createdHoldings: 0,
      createdConversations: 0,
    };
  }

  const officialToken = await getOrCreateUserToken(officialUser._id);
  const users = await User.find({
    _id: { $ne: officialUser._id },
    status: 'active',
    deletedAt: null,
  })
    .select({ _id: 1 })
    .exec();

  if (users.length === 0) {
    return {
      officialAccountFound: true,
      eligibleUsers: 0,
      createdHoldings: 0,
      createdConversations: 0,
    };
  }

  const holdingResult = await TokenHolding.bulkWrite(
    users.map((user) => ({
      updateOne: {
        filter: { token: officialToken._id, holder: user._id },
        update: { $setOnInsert: { token: officialToken._id, holder: user._id } },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  const conversationResult = await Conversation.bulkWrite(
    users.map((user) => {
      const pair = canonicalParticipantPair(user._id, officialUser._id);
      return {
        updateOne: {
          filter: pair,
          update: { $setOnInsert: pair },
          upsert: true,
        },
      };
    }),
    { ordered: false },
  );

  return {
    officialAccountFound: true,
    eligibleUsers: users.length,
    createdHoldings: holdingResult.upsertedCount,
    createdConversations: conversationResult.upsertedCount,
  };
};

export default backfillOfficialFollowers;
