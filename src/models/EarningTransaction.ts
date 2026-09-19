import { Schema, model } from 'mongoose';
import type { IEarningTransaction } from '../types/earning';

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const NON_NEGATIVE_INTEGER_PATTERN = /^(?:0|[1-9]\d*)$/;
const SIGNED_INTEGER_PATTERN = /^(?:0|-?[1-9]\d*)$/;
const TRANSACTION_HASH_PATTERN = /^[a-f\d]{64}$/;

const earningTransactionSchema = new Schema<IEarningTransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    messageBounty: {
      type: Schema.Types.ObjectId,
      ref: 'MessageBounty',
      default: null,
      immutable: true,
    },
    contractBountyId: {
      type: String,
      default: null,
      immutable: true,
      match: [POSITIVE_INTEGER_PATTERN, 'Contract bounty ID must be a positive integer'],
    },
    contractAuraTokenId: {
      type: String,
      default: null,
      immutable: true,
      match: [POSITIVE_INTEGER_PATTERN, 'Contract Aura token ID must be a positive integer'],
    },
    type: {
      type: String,
      enum: ['bounty_reply', 'aura_purchase', 'withdrawal'],
      required: true,
      immutable: true,
    },
    assetCode: {
      type: String,
      enum: ['USDC'],
      required: true,
      immutable: true,
    },
    grossAmountUnits: {
      type: String,
      required: true,
      immutable: true,
      match: [POSITIVE_INTEGER_PATTERN, 'Gross earning amount must be a positive integer'],
    },
    feeAmountUnits: {
      type: String,
      required: true,
      immutable: true,
      match: [NON_NEGATIVE_INTEGER_PATTERN, 'Earning fee must be a non-negative integer'],
    },
    netAmountUnits: {
      type: String,
      required: true,
      immutable: true,
      match: [SIGNED_INTEGER_PATTERN, 'Net transaction amount must be an integer'],
    },
    transactionHash: {
      type: String,
      required: true,
      immutable: true,
      lowercase: true,
      match: [TRANSACTION_HASH_PATTERN, 'Transaction hash must be a 64-character hex value'],
    },
    eventId: {
      type: String,
      required: true,
      immutable: true,
    },
    eventLedger: {
      type: Number,
      required: true,
      immutable: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Event ledger must be a safe integer',
      },
    },
    earnedAt: {
      type: Date,
      required: true,
      immutable: true,
    },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

earningTransactionSchema.index(
  { type: 1, contractBountyId: 1 },
  {
    unique: true,
    name: 'earning_transactions_bounty_unique',
    partialFilterExpression: { type: 'bounty_reply', contractBountyId: { $type: 'string' } },
  },
);
earningTransactionSchema.index(
  { type: 1, contractAuraTokenId: 1 },
  {
    unique: true,
    name: 'earning_transactions_aura_unique',
    partialFilterExpression: { type: 'aura_purchase', contractAuraTokenId: { $type: 'string' } },
  },
);
earningTransactionSchema.index(
  { user: 1, earnedAt: -1, _id: -1 },
  { name: 'earning_transactions_user_history' },
);
earningTransactionSchema.index(
  { eventId: 1 },
  { unique: true, name: 'earning_transactions_event_unique' },
);

const EarningTransaction = model<IEarningTransaction>(
  'EarningTransaction',
  earningTransactionSchema,
);

export default EarningTransaction;
