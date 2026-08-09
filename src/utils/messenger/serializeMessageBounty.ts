import type { MessageBountyDocument } from '../../models/MessageBounty';
import type { SerializedMessageBounty } from '../../types/messenger/bounty';

const serializeMessageBounty = (bounty: MessageBountyDocument): SerializedMessageBounty => ({
  id: bounty._id.toString(),
  assetCode: bounty.assetCode,
  amount: bounty.amount,
  durationSeconds: bounty.durationSeconds,
  status: bounty.status,
  expiresAt: bounty.expiresAt,
  replyMessageId: bounty.replyMessage?.toString() ?? null,
  claimableAt: bounty.claimableAt,
  claimedAt: bounty.claimedAt,
});

export default serializeMessageBounty;
