import type { ClientSession } from 'mongoose';

import User from '../../models/User';
import { withDatabaseTransaction } from '../../db';
import MessageBounty from '../../models/MessageBounty';
import serializeMessageBounty from './serializeMessageBounty';
import type { ClaimMessageBountyResult } from '../../types/messenger/bounty';
import expireMessageBounty from './expireMessageBounty';

const claimMessageBountyInTransaction = async (
  beneficiaryId: string,
  bountyId: string,
  now: Date,
  session: ClientSession,
): Promise<ClaimMessageBountyResult> => {
  const beneficiary = await User.findOne({
    _id: beneficiaryId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!beneficiary) {
    return { ok: false, reason: 'account_unavailable' };
  }

  let bounty = await MessageBounty.findOne({
    _id: bountyId,
    beneficiary: beneficiary._id,
  })
    .session(session)
    .exec();

  if (!bounty) {
    return { ok: false, reason: 'bounty_not_found' };
  }

  if (bounty.status === 'offered' && bounty.expiresAt.getTime() <= now.getTime()) {
    bounty = await expireMessageBounty(bounty._id, now, session);

    if (!bounty) {
      return { ok: false, reason: 'bounty_not_claimable' };
    }
  }

  if (bounty.status === 'expired') {
    return { ok: false, reason: 'bounty_expired' };
  }

  if (bounty.status === 'offered') {
    return { ok: false, reason: 'bounty_not_claimable' };
  }

  if (bounty.status === 'claimed') {
    return { ok: true, bounty: serializeMessageBounty(bounty), claimedNow: false };
  }

  const fundedClaim = bounty.fundingStatus === 'reserved';

  if (fundedClaim && bounty.amountUnits === null) {
    throw new Error('Funded bounty is missing exact amount units');
  }

  const claimedBounty = await MessageBounty.findOneAndUpdate(
    {
      _id: bounty._id,
      beneficiary: beneficiary._id,
      status: 'claimable',
      fundingStatus: fundedClaim ? 'reserved' : 'legacy',
    },
    {
      $set: {
        status: 'claimed',
        claimedAt: now,
        fundingStatus: fundedClaim ? 'paid' : 'legacy',
      },
    },
    { returnDocument: 'after', runValidators: true, session },
  ).exec();

  if (!claimedBounty) {
    const alreadyClaimed = await MessageBounty.findOne({
      _id: bounty._id,
      beneficiary: beneficiary._id,
      status: 'claimed',
    })
      .session(session)
      .exec();

    if (alreadyClaimed) {
      return {
        ok: true,
        bounty: serializeMessageBounty(alreadyClaimed),
        claimedNow: false,
      };
    }

    return { ok: false, reason: 'bounty_not_claimable' };
  }

  if (fundedClaim) {
    const creditResult = await User.updateOne(
      { _id: beneficiary._id, status: 'active', deletedAt: null },
      { $inc: { demoUsdcBalanceUnits: bounty.amountUnits! } },
      { runValidators: true, session },
    ).exec();

    if (creditResult.matchedCount !== 1) {
      throw new Error('Bounty beneficiary balance could not be credited');
    }
  }

  return {
    ok: true,
    bounty: serializeMessageBounty(claimedBounty),
    claimedNow: true,
  };
};

const claimMessageBounty = async (
  beneficiaryId: string,
  bountyId: string,
): Promise<ClaimMessageBountyResult> =>
  withDatabaseTransaction((session) =>
    claimMessageBountyInTransaction(beneficiaryId, bountyId, new Date(), session),
  );

export default claimMessageBounty;
