import { Schema, model } from 'mongoose';
import type { IContractBounty } from '../types/contract/bounty';
import { CONTRACT_BOUNTY_SOURCES, CONTRACT_BOUNTY_STATUSES } from '../constant/contract';

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

const NON_NEGATIVE_INTEGER_PATTERN = /^(?:0|[1-9]\d*)$/;

const STELLAR_ADDRESS_PATTERN = /^[CG][A-Z2-7]{55}$/;

const TRANSACTION_HASH_PATTERN = /^[a-f\d]{64}$/;

const contractBountySchema = new Schema<IContractBounty>(
  {
    contractBountyId: {
      type: String,
      required: true,
      immutable: true,
      match: [POSITIVE_INTEGER_PATTERN, 'Contract bounty ID must be a positive integer'],
    },
    sender: {
      type: String,
      required: true,
      uppercase: true,
      immutable: true,
      match: [STELLAR_ADDRESS_PATTERN, 'Contract bounty sender must be a Stellar address'],
    },
    recipient: {
      type: String,
      required: true,
      uppercase: true,
      immutable: true,
      match: [STELLAR_ADDRESS_PATTERN, 'Contract bounty recipient must be a Stellar address'],
    },
    amount: {
      type: String,
      required: true,
      immutable: true,
      match: [POSITIVE_INTEGER_PATTERN, 'Contract bounty amount must be a positive integer'],
    },
    deadline: {
      type: String,
      required: true,
      immutable: true,
      match: [NON_NEGATIVE_INTEGER_PATTERN, 'Contract bounty deadline must be an unsigned integer'],
    },
    status: {
      type: String,
      enum: CONTRACT_BOUNTY_STATUSES,
      required: true,
    },
    observedVia: {
      type: String,
      enum: CONTRACT_BOUNTY_SOURCES,
      required: true,
    },
    eventId: {
      type: String,
      default: null,
    },
    eventLedger: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: (value: number | null) => value === null || Number.isSafeInteger(value),
        message: 'Contract bounty event ledger must be a safe integer',
      },
    },
    lockTransactionHash: {
      type: String,
      default: null,
      lowercase: true,
      match: [TRANSACTION_HASH_PATTERN, 'Lock transaction hash must be a 64-character hex value'],
    },
    settlementTransactionHash: {
      type: String,
      default: null,
      lowercase: true,
      match: [
        TRANSACTION_HASH_PATTERN,
        'Settlement transaction hash must be a 64-character hex value',
      ],
    },
    settledAt: {
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

contractBountySchema.index(
  { contractBountyId: 1 },
  { unique: true, name: 'contract_bounties_contract_id_unique' },
);
contractBountySchema.index(
  { status: 1, deadline: 1 },
  { name: 'contract_bounties_status_deadline' },
);

const ContractBounty = model<IContractBounty>('ContractBounty', contractBountySchema);

export default ContractBounty;
