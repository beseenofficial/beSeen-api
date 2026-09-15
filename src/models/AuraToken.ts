import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import isPositiveU64String from '../utils/contract/isPositiveU64String';

const AURA_TOKEN_STATUSES = ['pending', 'confirmed', 'failed'] as const;
const AURA_CONFIRMATION_SOURCES = ['event', 'reconciliation'] as const;

type AuraTokenStatus = (typeof AURA_TOKEN_STATUSES)[number];
type AuraConfirmationSource = (typeof AURA_CONFIRMATION_SOURCES)[number];

interface IAuraToken {
  contractTokenId: string;
  buyer: Types.ObjectId;
  subject: Types.ObjectId;
  buyerAddress: string;
  subjectAddress: string;
  purchaseTransactionHash: string;
  status: AuraTokenStatus;
  confirmationSource: AuraConfirmationSource | null;
  eventId: string | null;
  eventLedger: number | null;
  confirmedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type AuraTokenDocument = HydratedDocument<IAuraToken>;

const auraTokenSchema = new Schema<IAuraToken>(
  {
    contractTokenId: {
      type: String,
      required: true,
      immutable: true,
      validate: {
        validator: isPositiveU64String,
        message: 'Aura token ID must be a positive u64 integer',
      },
    },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    subject: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    buyerAddress: {
      type: String,
      required: true,
      immutable: true,
      uppercase: true,
      match: [/^G[A-Z2-7]{55}$/, 'Aura buyer must be a Stellar G address'],
    },
    subjectAddress: {
      type: String,
      required: true,
      immutable: true,
      uppercase: true,
      match: [/^G[A-Z2-7]{55}$/, 'Aura subject must be a Stellar G address'],
    },
    purchaseTransactionHash: {
      type: String,
      required: true,
      immutable: true,
      lowercase: true,
      match: [/^[a-f\d]{64}$/, 'Aura purchase transaction hash must be 64-character hex'],
    },
    status: { type: String, enum: AURA_TOKEN_STATUSES, required: true, default: 'pending' },
    confirmationSource: { type: String, enum: AURA_CONFIRMATION_SOURCES, default: null },
    eventId: { type: String, default: null },
    eventLedger: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value: number | null) => value === null || Number.isSafeInteger(value),
        message: 'Aura event ledger must be a safe integer',
      },
    },
    confirmedAt: { type: Date, default: null },
    failureReason: { type: String, default: null, maxlength: 1_000 },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

auraTokenSchema.index(
  { contractTokenId: 1 },
  { unique: true, name: 'aura_tokens_contract_token_id_unique' },
);
auraTokenSchema.index({ status: 1, createdAt: 1 }, { name: 'aura_tokens_confirmation_queue' });
auraTokenSchema.index(
  { buyer: 1, subject: 1, status: 1 },
  { name: 'aura_tokens_buyer_subject_status' },
);

const AuraToken = model<IAuraToken>('AuraToken', auraTokenSchema);

export default AuraToken;
export { AURA_CONFIRMATION_SOURCES, AURA_TOKEN_STATUSES };
export type { AuraConfirmationSource, AuraTokenDocument, AuraTokenStatus, IAuraToken };
