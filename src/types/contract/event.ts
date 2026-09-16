interface ContractEventMetadata {
  eventId: string;
  ledger: number;
  txHash: string;
}

interface ContractEventSyncResult {
  processed: number;
  lastProcessedLedger: number | null;
}

export type { ContractEventMetadata, ContractEventSyncResult };
