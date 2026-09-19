interface AuraPriceParams {
  basePrice: bigint;
  increment: bigint;
}

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

type DecodedAuraPurchasedEvent = ObservedAuraPurchase & {
  price: string;
  fee: string;
};

export type { AuraPriceParams, ContractAuraData, DecodedAuraPurchasedEvent, ObservedAuraPurchase };
