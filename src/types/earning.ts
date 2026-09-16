import type { HydratedDocument, Types } from 'mongoose';

interface IEarningTransaction {
  user: Types.ObjectId;
  messageBounty: Types.ObjectId;
  contractBountyId: string;
  type: 'bounty_reply';
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
  type: 'bounty_reply';
  reason: 'Bounty reply reward';
  contractBountyId: string;
  assetCode: 'USDC';
  amount: string;
  transactionHash: string;
  earnedAt: Date;
}

export type { EarningTransactionDocument, IEarningTransaction, SerializedEarningTransaction };
