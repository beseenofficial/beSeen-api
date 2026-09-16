import type { HydratedDocument } from 'mongoose';

interface IContractSyncState {
  _id: string;
  eventCursor: string | null;
  auraEventCursor: string | null;
  lastProcessedLedger: number | null;
  lastReconciledBountyId: string;
  createdAt: Date;
  updatedAt: Date;
}

type ContractSyncStateDocument = HydratedDocument<IContractSyncState>;

export type { ContractSyncStateDocument, IContractSyncState };
