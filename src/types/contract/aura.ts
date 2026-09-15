interface ContractAuraData {
  contractTokenId: string;
  owner: string;
  subject: string;
}

interface ObservedAuraPurchase extends ContractAuraData {
  buyer: string;
  price?: string;
  fee?: string;
  transactionHash?: string;
  eventId?: string;
  eventLedger?: number;
}

export type { ContractAuraData, ObservedAuraPurchase };
