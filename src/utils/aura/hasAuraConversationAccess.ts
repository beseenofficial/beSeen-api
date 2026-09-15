import type { ClientSession, Types } from 'mongoose';

import AuraFollow from '../../models/AuraFollow';

const hasAuraConversationAccess = async (
  firstUserId: Types.ObjectId,
  secondUserId: Types.ObjectId,
  session?: ClientSession,
): Promise<boolean> => {
  const query = AuraFollow.exists({
    $or: [
      { follower: firstUserId, subject: secondUserId },
      { follower: secondUserId, subject: firstUserId },
    ],
  });
  if (session) {
    query.session(session);
  }
  return Boolean(await query.exec());
};

export default hasAuraConversationAccess;
