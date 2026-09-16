import type { HydratedDocument } from 'mongoose';

import type {
  CONTRACT_BOUNTY_SOURCES,
  CONTRACT_BOUNTY_STATUSES,
  CONTRACT_BOUNTY_SETTLEMENT_STATUSES,
} from '../../constant/contract';

type ContractBountyStatus = (typeof CONTRACT_BOUNTY_STATUSES)[number];

type ContractBountySource = (typeof CONTRACT_BOUNTY_SOURCES)[number];

type ContractBountySettlementStatus = (typeof CONTRACT_BOUNTY_SETTLEMENT_STATUSES)[number];

interface IContractBounty {
  contractBountyId: string;
  sender: string;
  recipient: string;
  amount: string;
  deadline: string;
  status: ContractBountyStatus;
  observedVia: ContractBountySource;
  eventId: string | null;
  eventLedger: number | null;
  lockTransactionHash: string | null;
  settlementTransactionHash: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type ContractBountyDocument = HydratedDocument<IContractBounty>;

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

export type {
  ContractBountyData,
  ContractBountyDocument,
  ContractBountySettlementStatus,
  ContractBountySource,
  ContractBountyStatus,
  IContractBounty,
  ObservedContractBounty,
};
