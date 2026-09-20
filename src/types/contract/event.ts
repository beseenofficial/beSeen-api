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
  /**
   * Extra topic segments the contract indexes after the event symbol. Stellar
   * RPC matches a topic filter segment by segment and requires the matcher to
   * have the same length as the event's topics, so an indexed event needs a
   * wildcard for each of these.
   */
  indexedTopics?: number;
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
