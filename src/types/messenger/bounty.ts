import type { ClientSession, Types } from 'mongoose';

import type { MessengerBountyStatus } from '../../constant/messenger';
import type { ContractBountySettlementStatus } from '../contract/bounty';

interface SerializedMessageBounty {
  id: string;
  contractBountyId: string;
  assetCode: string;
  amount: string;
  durationSeconds: number;
  status: MessengerBountyStatus;
  settlementStatus: ContractBountySettlementStatus;
  settlementTransactionHash: string | null;
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

export type { ResolveReplyBountyInput, SerializedMessageBounty };
