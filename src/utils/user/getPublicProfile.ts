import User from '../../models/User';
import Message from '../../models/Message';
import Broadcast from '../../models/Broadcast';
import getUserVerification from './getUserVerification';
import type { GetPublicProfileResult } from '../../types/user';

const getPublicProfile = async (username: string): Promise<GetPublicProfileResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  const [broadcastCount, sentMessageCount, receivedMessageCount] = await Promise.all([
    Broadcast.countDocuments({
      creator: user._id,
      status: 'published',
    }).exec(),
    Message.countDocuments({ sender: user._id }).exec(),
    Message.countDocuments({ recipient: user._id }).exec(),
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
      createdAt: user.createdAt,
    },
  };
};

export default getPublicProfile;
