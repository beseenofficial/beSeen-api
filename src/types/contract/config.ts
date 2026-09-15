interface ContractSyncConfig {
  rpcUrl: string;
  contractId: string;
  sourceAccount: string;
  startLedger: number;
}

interface ContractSettlementConfig extends ContractSyncConfig {
  verifierSecret: string;
}

export type { ContractSettlementConfig, ContractSyncConfig };
