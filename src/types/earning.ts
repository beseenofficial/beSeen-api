import type { HydratedDocument, Types } from 'mongoose';

interface IEarningTransaction {
  user: Types.ObjectId;
  messageBounty: Types.ObjectId | null;
  contractBountyId: string | null;
  contractAuraTokenId: string | null;
  type: 'bounty_reply' | 'aura_purchase' | 'withdrawal';
  assetCode: 'USDC';
  grossAmountUnits: string;
  feeAmountUnits: string;
  netAmountUnits: string;
  transactionHash: string;
  eventId: string;
  eventLedger: number;
  earnedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type EarningTransactionDocument = HydratedDocument<IEarningTransaction>;

interface SerializedEarningTransaction {
  id: string;
  type: IEarningTransaction['type'];
  reason: 'Bounty reply reward' | 'Aura purchase earning' | 'Earnings withdrawal';
  contractBountyId: string | null;
  contractAuraTokenId: string | null;
  assetCode: 'USDC';
  amount: string;
  transactionHash: string;
  earnedAt: Date;
}

interface EarningTransactionPage {
  assetCode: 'USDC';
  totalAmount: string;
  items: SerializedEarningTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface AuraEarningEvent {
  contractAuraTokenId: string;
  subject: string;
  priceAmountUnits: string;
  feeAmountUnits: string;
}

interface WithdrawalEvent {
  owner: string;
  amountUnits: string;
}

export type {
  AuraEarningEvent,
  EarningTransactionDocument,
  EarningTransactionPage,
  IEarningTransaction,
  SerializedEarningTransaction,
  WithdrawalEvent,
};
