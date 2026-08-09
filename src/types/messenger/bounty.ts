import type { ClientSession, Types } from 'mongoose';

import type { MessengerBountyStatus } from '../../constant/messenger';

interface SerializedMessageBounty {
  id: string;
  assetCode: string;
  amount: string;
  durationSeconds: number;
  status: MessengerBountyStatus;
  expiresAt: Date;
  replyMessageId: string | null;
  claimableAt: Date | null;
  claimedAt: Date | null;
}

interface ResolveReplyBountyInput {
  conversationId: Types.ObjectId;
  replyToMessageId: string;
  replyMessageId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  repliedAt: Date;
  session: ClientSession;
}

type ClaimMessageBountyFailureReason =
  'account_unavailable' | 'bounty_not_found' | 'bounty_not_claimable' | 'bounty_expired';

type ClaimMessageBountyResult =
  | { ok: true; bounty: SerializedMessageBounty; claimedNow: boolean }
  | { ok: false; reason: ClaimMessageBountyFailureReason };

export type {
  ClaimMessageBountyFailureReason,
  ClaimMessageBountyResult,
  ResolveReplyBountyInput,
  SerializedMessageBounty,
};
