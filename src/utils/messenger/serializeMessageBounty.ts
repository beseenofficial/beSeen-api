import type { MessengerBountyStatus } from '../../constant/messenger';
import type { MessageBountyDocument } from '../../models/MessageBounty';

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
export type { SerializedMessageBounty };
