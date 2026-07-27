import User from '../../models/User';
import UserKey from '../../models/UserKey';

interface BroadcastAudienceMember {
  recipientId: string;
  username: string;
  keyVersion: number;
  encryptionPublicKey: string;
}

const resolveBroadcastAudience = async (creatorId: string): Promise<BroadcastAudienceMember[]> => {
  // Temporary MVP resolver: every active user with an active encryption key is eligible.
  // The token-holder resolver will replace only this function when membership is implemented.
  const users = await User.find({
    _id: { $ne: creatorId },
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
          },
        ]
      : [];
  });
};

export default resolveBroadcastAudience;
export type { BroadcastAudienceMember };
