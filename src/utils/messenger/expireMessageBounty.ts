import type { ClientSession, Types } from 'mongoose';
import MessageBounty from '../../models/MessageBounty';
import type { MessageBountyDocument } from '../../models/MessageBounty';

const expireMessageBounty = async (
  bountyId: Types.ObjectId,
  now: Date,
  session: ClientSession,
): Promise<MessageBountyDocument | null> => {
  return MessageBounty.findOneAndUpdate(
    {
      _id: bountyId,
      status: 'offered',
      fundingStatus: 'contract_locked',
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: 'expired',
        settlementStatus: 'failed',
        settlementLastError: 'Reply window expired before a valid reply',
      },
    },
    { returnDocument: 'after', runValidators: true, session },
  ).exec();
};

export default expireMessageBounty;
