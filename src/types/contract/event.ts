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
}

type ContractEventHandler = (event: ContractEvent) => Promise<boolean>;

export type {
  ContractEvent,
  ContractEventHandler,
  ContractEventMetadata,
  ContractEventSyncResult,
  ContractEventsSyncResult,
};
