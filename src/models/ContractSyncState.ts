import { Schema, model } from 'mongoose';
import type { IContractSyncState } from '../types/contract/sync';

const contractSyncStateSchema = new Schema<IContractSyncState>(
  {
    _id: {
      type: String,
      required: true,
    },
    eventCursor: {
      type: String,
      default: null,
    },
    auraEventCursor: {
      type: String,
      default: null,
    },
    lastReconciledBountyId: {
      type: String,
      required: true,
      default: '0',
      match: [/^(?:0|[1-9]\d*)$/, 'Last reconciled bounty ID must be an unsigned integer'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: 'throw',
  },
);

const ContractSyncState = model<IContractSyncState>('ContractSyncState', contractSyncStateSchema);

export default ContractSyncState;
