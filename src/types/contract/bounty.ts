import type { ContractBountySource, ContractBountyStatus } from '../../constant/contract';

interface ContractBountyData {
  contractBountyId: string;
  sender: string;
  recipient: string;
  amount: string;
  deadline: string;
  status: ContractBountyStatus;
}

interface ObservedContractBounty extends ContractBountyData {
  observedVia: ContractBountySource;
  eventId?: string;
  eventLedger?: number;
  lockTransactionHash?: string;
}

export type { ContractBountyData, ObservedContractBounty };
