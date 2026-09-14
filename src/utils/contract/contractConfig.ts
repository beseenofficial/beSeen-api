import env from '../../env';

interface ContractSyncConfig {
  rpcUrl: string;
  contractId: string;
  sourceAccount: string;
  startLedger: number;
}

interface ContractSettlementConfig extends ContractSyncConfig {
  verifierSecret: string;
}

const getContractSyncConfig = (): ContractSyncConfig | null => {
  if (
    !env.STELLAR_RPC_URL ||
    !env.BESEEN_CONTRACT_ID ||
    !env.BESEEN_RPC_SOURCE_ACCOUNT ||
    env.BESEEN_CONTRACT_START_LEDGER === undefined
  ) {
    return null;
  }

  return {
    rpcUrl: env.STELLAR_RPC_URL,
    contractId: env.BESEEN_CONTRACT_ID,
    sourceAccount: env.BESEEN_RPC_SOURCE_ACCOUNT,
    startLedger: env.BESEEN_CONTRACT_START_LEDGER,
  };
};

const getContractSettlementConfig = (): ContractSettlementConfig | null => {
  const syncConfig = getContractSyncConfig();

  if (!syncConfig || !env.BESEEN_VERIFIER_SECRET) {
    return null;
  }

  return { ...syncConfig, verifierSecret: env.BESEEN_VERIFIER_SECRET };
};

export { getContractSettlementConfig };
export default getContractSyncConfig;
export type { ContractSettlementConfig, ContractSyncConfig };
