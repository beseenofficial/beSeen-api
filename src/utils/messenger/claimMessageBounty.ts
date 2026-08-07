import type { ClientSession } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import MessageBounty from '../../models/MessageBounty';
import User from '../../models/User';
import serializeMessageBounty from './serializeMessageBounty';
import type { SerializedMessageBounty } from './serializeMessageBounty';

type ClaimMessageBountyFailureReason =
  'account_unavailable' | 'bounty_not_found' | 'bounty_not_claimable' | 'bounty_expired';

type ClaimMessageBountyResult =
  | { ok: true; bounty: SerializedMessageBounty; claimedNow: boolean }
  | { ok: false; reason: ClaimMessageBountyFailureReason };

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
    bounty = await MessageBounty.findOneAndUpdate(
      {
        _id: bounty._id,
        beneficiary: beneficiary._id,
        status: 'offered',
        expiresAt: { $lte: now },
      },
      { $set: { status: 'expired' } },
      { new: true, session },
    ).exec();

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

  const claimedBounty = await MessageBounty.findOneAndUpdate(
    {
      _id: bounty._id,
      beneficiary: beneficiary._id,
      status: 'claimable',
    },
    { $set: { status: 'claimed', claimedAt: now } },
    { new: true, runValidators: true, session },
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
export type { ClaimMessageBountyFailureReason, ClaimMessageBountyResult };
