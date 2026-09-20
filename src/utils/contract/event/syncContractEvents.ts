import stellarSdk from '../stellarSdk';
import fetchContractEvents from './fetchContractEvents';
import { handleWithdrawalEvent } from './syncWithdrawalEvents';
import { handleBountyLockEvent } from './syncBountyLockEvents';
import ContractSyncState from '../../../models/ContractSyncState';
import { handleAuraPurchaseEvent } from './syncAuraPurchaseEvents';
import { handleBountyEarningEvent } from './syncBountyEarningEvents';
import type {
  ContractEventDefinition,
  ContractEventKind,
  ContractEventsSyncResult,
} from '../../../types/contract/event';
import {
  CONTRACT_AURA_SYNC_STATE_ID,
  CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
  CONTRACT_BOUNTY_SYNC_STATE_ID,
  CONTRACT_FINANCIAL_SYNC_STATE_ID,
} from '../../../constant/contract';

const EVENT_DEFINITIONS: readonly ContractEventDefinition[] = [
  { kind: 'bounties', symbol: 'lock_bnty', handle: handleBountyLockEvent },
  { kind: 'auras', symbol: 'buy_aura', handle: handleAuraPurchaseEvent },
  { kind: 'earnings', symbol: 'pay_bnty', handle: handleBountyEarningEvent },
  { kind: 'withdrawals', symbol: 'withdraw', indexedTopics: 1, handle: handleWithdrawalEvent },
];

const topicSymbol = (definition: ContractEventDefinition): string =>
  stellarSdk.xdr.ScVal.scvSymbol(definition.symbol).toXDR('base64');

const topicMatcher = (definition: ContractEventDefinition): string[] => [
  topicSymbol(definition),
  ...Array.from({ length: definition.indexedTopics ?? 0 }, () => '*'),
];

const SYNC_STATE_IDS = [
  CONTRACT_BOUNTY_SYNC_STATE_ID,
  CONTRACT_AURA_SYNC_STATE_ID,
  CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
  CONTRACT_FINANCIAL_SYNC_STATE_ID,
] as const;

const getSyncStates = async () => {
  const states = await Promise.all(
    SYNC_STATE_IDS.map((id) =>
      ContractSyncState.findByIdAndUpdate(
        id,
        {
          $setOnInsert: {
            eventCursor: null,
            auraEventCursor: null,
            lastProcessedLedger: null,
            lastReconciledBountyId: '0',
          },
        },
        { upsert: true, returnDocument: 'after', runValidators: true },
      ).exec(),
    ),
  );

  if (states.some((state) => !state)) {
    throw new Error('Contract event synchronization states could not be created');
  }

  return states.filter((state) => state !== null);
};

const getSharedCheckpoint = (lastProcessedLedgers: readonly (number | null)[]): number | null => {
  if (lastProcessedLedgers.some((ledger) => ledger === null)) {
    return null;
  }

  return Math.min(...lastProcessedLedgers.filter((ledger) => ledger !== null));
};

const syncContractEvents = async (): Promise<ContractEventsSyncResult> => {
  const states = await getSyncStates();
  const lastProcessedLedger = getSharedCheckpoint(
    states.map((state) => state.lastProcessedLedger ?? null),
  );

  const definitionsByTopic = new Map(
    EVENT_DEFINITIONS.map((definition) => [topicSymbol(definition), definition]),
  );

  const batch = await fetchContractEvents(
    'contract-events',
    EVENT_DEFINITIONS.map(topicMatcher),
    lastProcessedLedger,
  );

  const processed: Record<ContractEventKind, number> = {
    bounties: 0,
    auras: 0,
    earnings: 0,
    withdrawals: 0,
  };

  for (const event of batch.events) {
    if (!event.inSuccessfulContractCall) {
      continue;
    }

    const topic = event.topic[0]?.toXDR('base64');
    const definition = topic ? definitionsByTopic.get(topic) : undefined;

    if (!definition) {
      throw new Error(`Contract event ${event.id} has an unsupported topic`);
    }

    if (await definition.handle(event)) {
      processed[definition.kind] += 1;
    }
  }

  if (batch.lastProcessedLedger !== null) {
    await Promise.all(
      states.map((state) => {
        state.lastProcessedLedger = batch.lastProcessedLedger;
        state.eventCursor = null;
        state.auraEventCursor = null;
        return state.save();
      }),
    );
  }

  return {
    ...processed,
    processed: processed.bounties + processed.auras + processed.earnings + processed.withdrawals,
    lastProcessedLedger: batch.lastProcessedLedger,
  };
};

export { EVENT_DEFINITIONS, getSharedCheckpoint, topicMatcher };
export default syncContractEvents;
