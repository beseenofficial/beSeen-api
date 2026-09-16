interface ContractSyncConfig {
  rpcUrl: string;
  contractId: string;
  sourceAccount: string;
  startLedger: number;
  eventLedgerBatchSize: number;
}

interface ContractSettlementConfig extends ContractSyncConfig {
  verifierSecret: string;
}

export type { ContractSettlementConfig, ContractSyncConfig };
