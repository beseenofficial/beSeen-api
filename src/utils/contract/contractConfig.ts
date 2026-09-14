import env from '../../env';

interface ContractSyncConfig {
  rpcUrl: string;
  contractId: string;
  sourceAccount: string;
  startLedger: number;
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

export default getContractSyncConfig;
export type { ContractSyncConfig };
