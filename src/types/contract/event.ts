import type { rpc } from '@stellar/stellar-sdk' with { 'resolution-mode': 'import' };

interface ContractEventMetadata {
  eventId: string;
  ledger: number;
  txHash: string;
}

interface ContractEventSyncResult {
  processed: number;
  lastProcessedLedger: number | null;
}

type ContractEvent = rpc.Api.EventResponse;

interface ContractEventsSyncResult extends ContractEventSyncResult {
  bounties: number;
  auras: number;
  earnings: number;
  withdrawals: number;
}

type ContractEventHandler = (event: ContractEvent) => Promise<boolean>;

type ContractEventKind = 'bounties' | 'auras' | 'earnings' | 'withdrawals';

interface ContractEventDefinition {
  kind: ContractEventKind;
  symbol: string;
  handle: ContractEventHandler;
}

export type {
  ContractEvent,
  ContractEventDefinition,
  ContractEventHandler,
  ContractEventKind,
  ContractEventMetadata,
  ContractEventSyncResult,
  ContractEventsSyncResult,
};
