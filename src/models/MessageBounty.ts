import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import type { MessengerBountyFundingStatus, MessengerBountyStatus } from '../constant/messenger';
import {
  MESSENGER_BOUNTY_AMOUNT_PATTERN,
  MESSENGER_BOUNTY_ASSET_CODE_PATTERN,
  MESSENGER_BOUNTY_MAX_DURATION_SECONDS,
  MESSENGER_BOUNTY_MIN_DURATION_SECONDS,
  MESSENGER_BOUNTY_STATUSES,
  MESSENGER_BOUNTY_FUNDING_STATUSES,
} from '../constant/messenger';

interface IMessageBounty {
  message: Types.ObjectId;
  conversation: Types.ObjectId;
  sponsor: Types.ObjectId;
  beneficiary: Types.ObjectId;
  assetCode: string;
  amount: string;
  amountUnits: number | null;
  fundingStatus: MessengerBountyFundingStatus;
  durationSeconds: number;
  status: MessengerBountyStatus;
  expiresAt: Date;
  replyMessage: Types.ObjectId | null;
  claimableAt: Date | null;
  claimedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type MessageBountyDocument = HydratedDocument<IMessageBounty>;

const messageBountySchema = new Schema<IMessageBounty>(
  {
    message: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      immutable: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      immutable: true,
    },
    sponsor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    beneficiary: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    assetCode: {
      type: String,
      required: true,
      immutable: true,
      match: [MESSENGER_BOUNTY_ASSET_CODE_PATTERN, 'Bounty asset code is invalid'],
    },
    amount: {
      type: String,
      required: true,
      immutable: true,
      match: [MESSENGER_BOUNTY_AMOUNT_PATTERN, 'Bounty amount must be a canonical decimal string'],
      validate: {
        validator: (value: string) => Number(value) > 0,
        message: 'Bounty amount must be greater than zero',
      },
    },
    amountUnits: {
      type: Number,
      default: null,
      immutable: true,
      min: 1,
      validate: {
        validator: (value: number | null) => value === null || Number.isSafeInteger(value),
        message: 'Bounty amount units must be a safe integer',
      },
    },
    fundingStatus: {
      type: String,
      enum: MESSENGER_BOUNTY_FUNDING_STATUSES,
      default: 'legacy',
      required: true,
    },
    durationSeconds: {
      type: Number,
      required: true,
      immutable: true,
      min: MESSENGER_BOUNTY_MIN_DURATION_SECONDS,
      max: MESSENGER_BOUNTY_MAX_DURATION_SECONDS,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Bounty duration must be a safe integer',
      },
    },
    status: {
      type: String,
      enum: MESSENGER_BOUNTY_STATUSES,
      default: 'offered',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    replyMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    claimableAt: {
      type: Date,
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

messageBountySchema.pre('validate', function validateBountyParticipants() {
  if (!this.sponsor || !this.beneficiary) {
    return;
  }

  if (this.sponsor.equals(this.beneficiary)) {
    this.invalidate('beneficiary', 'A bounty requires different sponsor and beneficiary users');
  }

  if (this.fundingStatus !== 'legacy' && this.amountUnits === null) {
    this.invalidate('amountUnits', 'Funded bounties require exact amount units');
  }

  const validFundingStatus =
    (this.status === 'claimed' && ['legacy', 'paid'].includes(this.fundingStatus)) ||
    (this.status === 'expired' && ['legacy', 'refunded'].includes(this.fundingStatus)) ||
    (['offered', 'claimable'].includes(this.status) &&
      ['legacy', 'reserved'].includes(this.fundingStatus));

  if (!validFundingStatus) {
    this.invalidate('fundingStatus', 'Bounty funding status does not match its lifecycle status');
  }
});

messageBountySchema.index(
  { message: 1 },
  { unique: true, name: 'message_bounties_message_unique' },
);
messageBountySchema.index(
  { beneficiary: 1, status: 1, expiresAt: 1 },
  { name: 'message_bounties_beneficiary_status_expiry' },
);
messageBountySchema.index(
  { sponsor: 1, status: 1, _id: -1 },
  { name: 'message_bounties_sponsor_status' },
);
messageBountySchema.index({ status: 1, expiresAt: 1 }, { name: 'message_bounties_status_expiry' });
messageBountySchema.index(
  { status: 1, beneficiary: 1, claimedAt: -1 },
  { name: 'message_bounties_claimed_beneficiary' },
);

const MessageBounty = model<IMessageBounty>('MessageBounty', messageBountySchema);

export default MessageBounty;
export type { IMessageBounty, MessageBountyDocument };
