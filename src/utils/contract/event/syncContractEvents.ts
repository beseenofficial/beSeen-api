import stellarSdk from '../stellarSdk';
import fetchContractEvents from './fetchContractEvents';
import ContractSyncState from '../../../models/ContractSyncState';
import { handleAuraPurchaseEvent } from './syncAuraPurchaseEvents';
import { handleBountyLockEvent } from './syncBountyLockEvents';
import { handleBountyEarningEvent } from './syncBountyEarningEvents';
import type { ContractEventHandler, ContractEventsSyncResult } from '../../../types/contract/event';
import {
  CONTRACT_AURA_SYNC_STATE_ID,
  CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
  CONTRACT_BOUNTY_SYNC_STATE_ID,
} from '../../../constant/contract';

type EventKind = 'bounties' | 'auras' | 'earnings';

interface EventDefinition {
  kind: EventKind;
  symbol: string;
  handle: ContractEventHandler;
}

const EVENT_DEFINITIONS: readonly EventDefinition[] = [
  { kind: 'bounties', symbol: 'lock_bnty', handle: handleBountyLockEvent },
  { kind: 'auras', symbol: 'buy_aura', handle: handleAuraPurchaseEvent },
  { kind: 'earnings', symbol: 'pay_bnty', handle: handleBountyEarningEvent },
];

const SYNC_STATE_IDS = [
  CONTRACT_BOUNTY_SYNC_STATE_ID,
  CONTRACT_AURA_SYNC_STATE_ID,
  CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
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
    EVENT_DEFINITIONS.map((definition) => [
      stellarSdk.xdr.ScVal.scvSymbol(definition.symbol).toXDR('base64'),
      definition,
    ]),
  );

  const batch = await fetchContractEvents(
    'contract-events',
    [...definitionsByTopic.keys()],
    lastProcessedLedger,
  );

  const processed: Record<EventKind, number> = {
    bounties: 0,
    auras: 0,
    earnings: 0,
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
    processed: processed.bounties + processed.auras + processed.earnings,
    lastProcessedLedger: batch.lastProcessedLedger,
  };
};

export { EVENT_DEFINITIONS, getSharedCheckpoint };
export default syncContractEvents;
