import User from '../../models/User';
import UserKey from '../../models/UserKey';
import AuraFollow from '../../models/AuraFollow';
import type { BroadcastAudienceMember } from '../../types/broadcast';

const resolveBroadcastAudience = async (creatorId: string): Promise<BroadcastAudienceMember[]> => {
  const follows = await AuraFollow.find({ subject: creatorId }).sort({ _id: 1 }).exec();
  if (follows.length === 0) {
    return [];
  }

  const users = await User.find({
    _id: { $in: follows.map((follow) => follow.follower), $ne: creatorId },
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
            accessMode: 'aura',
            auraTokenId:
              follows.find((follow) => follow.follower.equals(user._id))?.firstContractTokenId ??
              null,
          },
        ]
      : [];
  });
};

export default resolveBroadcastAudience;
