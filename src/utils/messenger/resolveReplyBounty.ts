import type { ClientSession, Types } from 'mongoose';

import MessageBounty from '../../models/MessageBounty';
import type { MessageBountyDocument } from '../../models/MessageBounty';

interface ResolveReplyBountyInput {
  conversationId: Types.ObjectId;
  replyToMessageId: string;
  replyMessageId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  repliedAt: Date;
  session: ClientSession;
}

const resolveReplyBounty = async (
  input: ResolveReplyBountyInput,
): Promise<MessageBountyDocument | null> => {
  const claimableBounty = await MessageBounty.findOneAndUpdate(
    {
      message: input.replyToMessageId,
      conversation: input.conversationId,
      beneficiary: input.senderId,
      sponsor: input.recipientId,
      status: 'offered',
      expiresAt: { $gt: input.repliedAt },
    },
    {
      $set: {
        status: 'claimable',
        replyMessage: input.replyMessageId,
        claimableAt: input.repliedAt,
      },
    },
    { new: true, runValidators: true, session: input.session },
  ).exec();

  if (claimableBounty) {
    return claimableBounty;
  }

  await MessageBounty.updateOne(
    {
      message: input.replyToMessageId,
      conversation: input.conversationId,
      beneficiary: input.senderId,
      sponsor: input.recipientId,
      status: 'offered',
      expiresAt: { $lte: input.repliedAt },
    },
    { $set: { status: 'expired' } },
    { session: input.session },
  ).exec();

  return null;
};

export default resolveReplyBounty;
export type { ResolveReplyBountyInput };
