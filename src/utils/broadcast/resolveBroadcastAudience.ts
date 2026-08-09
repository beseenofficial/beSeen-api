import { Types } from 'mongoose';

import User from '../../models/User';
import UserKey from '../../models/UserKey';
import TokenHolding from '../../models/TokenHolding';
import getOrCreateUserToken from '../token/getOrCreateUserToken';
import type { BroadcastAudienceMember } from '../../types/broadcast';

const resolveBroadcastAudience = async (creatorId: string): Promise<BroadcastAudienceMember[]> => {
  const token = await getOrCreateUserToken(new Types.ObjectId(creatorId));

  const holdings = await TokenHolding.find({ token: token._id }).sort({ _id: 1 }).exec();
  if (holdings.length === 0) {
    return [];
  }

  const users = await User.find({
    _id: { $in: holdings.map((holding) => holding.holder), $ne: creatorId },
    status: 'active',
    deletedAt: null,
  })
    .sort({ _id: 1 })
    .exec();

  if (users.length === 0) {
    return [];
  }

  const keys = await UserKey.find({
    user: { $in: users.map((user) => user._id) },
    status: 'active',
    revokedAt: null,
  }).exec();

  const keysByUserId = new Map(keys.map((key) => [key.user.toString(), key]));

  return users.flatMap((user) => {
    const key = keysByUserId.get(user._id.toString());

    return key
      ? [
          {
            recipientId: user._id.toString(),
            username: user.username,
            keyVersion: key.derivationVersion,
            encryptionPublicKey: key.encryptionPublicKey,
            accessMode: 'token',
            tokenId: token._id.toString(),
          },
        ]
      : [];
  });
};

export default resolveBroadcastAudience;
