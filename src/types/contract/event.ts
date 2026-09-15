interface ContractEventMetadata {
  eventId: string;
  ledger: number;
  txHash: string;
}

interface ContractEventSyncResult {
  processed: number;
  cursor: string;
}

export type { ContractEventMetadata, ContractEventSyncResult };
