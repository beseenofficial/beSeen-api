import type { ClientSession, Types } from 'mongoose';

import User from '../../models/User';
import MessageBounty from '../../models/MessageBounty';
import type { MessageBountyDocument } from '../../models/MessageBounty';

const expireMessageBounty = async (
  bountyId: Types.ObjectId,
  now: Date,
  session: ClientSession,
): Promise<MessageBountyDocument | null> => {
  const fundedBounty = await MessageBounty.findOneAndUpdate(
    {
      _id: bountyId,
      status: 'offered',
      fundingStatus: 'reserved',
      expiresAt: { $lte: now },
    },
    { $set: { status: 'expired', fundingStatus: 'refunded' } },
    { returnDocument: 'after', runValidators: true, session },
  ).exec();

  if (fundedBounty) {
    if (fundedBounty.amountUnits === null) {
      throw new Error('Funded bounty is missing exact amount units');
    }

    const refundResult = await User.updateOne(
      { _id: fundedBounty.sponsor },
      { $inc: { demoUsdcBalanceUnits: fundedBounty.amountUnits } },
      { runValidators: true, session },
    ).exec();

    if (refundResult.matchedCount !== 1) {
      throw new Error('Bounty sponsor balance could not be refunded');
    }

    return fundedBounty;
  }

  return MessageBounty.findOneAndUpdate(
    {
      _id: bountyId,
      status: 'offered',
      fundingStatus: 'legacy',
      expiresAt: { $lte: now },
    },
    { $set: { status: 'expired' } },
    { returnDocument: 'after', runValidators: true, session },
  ).exec();
};

export default expireMessageBounty;
