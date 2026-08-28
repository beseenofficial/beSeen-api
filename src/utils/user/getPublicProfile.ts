import User from '../../models/User';
import Message from '../../models/Message';
import Broadcast from '../../models/Broadcast';
import MessageBounty from '../../models/MessageBounty';
import getUserVerification from './getUserVerification';
import type { GetPublicProfileResult } from '../../types/user';

const getPublicProfile = async (username: string): Promise<GetPublicProfileResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  const [broadcastCount, sentMessageCount, receivedMessageCount, bountyTotals] = await Promise.all([
    Broadcast.countDocuments({
      creator: user._id,
      status: 'published',
    }).exec(),
    Message.countDocuments({ sender: user._id }).exec(),
    Message.countDocuments({ recipient: user._id }).exec(),
    MessageBounty.aggregate<{ total: string }>([
      {
        $match: {
          beneficiary: user._id,
          status: 'claimed',
          assetCode: 'USDC',
        },
      },
      { $group: { _id: null, total: { $sum: { $toDecimal: '$amount' } } } },
      { $project: { _id: 0, total: { $toString: '$total' } } },
    ]).exec(),
  ]);

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      verification: getUserVerification(user),
      broadcastCount,
      sentMessageCount,
      receivedMessageCount,
      messageCount: sentMessageCount + receivedMessageCount,
      totalBountyReceivedUsdc: bountyTotals[0]?.total ?? '0',
      createdAt: user.createdAt,
    },
  };
};

export default getPublicProfile;
