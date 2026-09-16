import stellarSdk from '../stellarSdk';
import getContractBounty from '../getContractBounty';
import fetchContractEvents from './fetchContractEvents';
import decodeContractBounty from '../contractBountyCodec';
import MessageBounty from '../../../models/MessageBounty';
import upsertContractBounty from '../upsertContractBounty';
import ContractSyncState from '../../../models/ContractSyncState';
import type { ContractBountyData } from '../../../types/contract/bounty';
import { CONTRACT_BOUNTY_SYNC_STATE_ID } from '../../../constant/contract';
import type { ContractEventMetadata, ContractEventSyncResult } from '../../../types/contract/event';

const decodeLockEvent = async (
  nativeValue: unknown,
  metadata: ContractEventMetadata,
): Promise<ContractBountyData> => {
  try {
    const value = nativeValue as Record<string, unknown>;

    return decodeContractBounty({
      id: value.bounty_id,
      sender: value.sender,
      recipient: value.recipient,
      amount: value.amount,
      deadline: value.deadline,
      status: 0,
    });
  } catch (decodeError: unknown) {
    const partial = nativeValue as { bounty_id?: unknown } | null;

    const idValue = partial?.bounty_id;

    if (
      (typeof idValue !== 'bigint' && typeof idValue !== 'number' && typeof idValue !== 'string') ||
      !/^[1-9]\d*$/.test(idValue.toString())
    ) {
      throw decodeError;
    }

    const fetched = await getContractBounty(BigInt(idValue.toString()));

    if (!fetched) {
      throw new Error(`Bounty ${idValue.toString()} from event ${metadata.eventId} was not found`, {
        cause: decodeError,
      });
    }

    return fetched;
  }
};

const syncBountyLockEvents = async (): Promise<ContractEventSyncResult> => {
  const state = await ContractSyncState.findByIdAndUpdate(
    CONTRACT_BOUNTY_SYNC_STATE_ID,
    {
      $setOnInsert: {
        eventCursor: null,
        auraEventCursor: null,
        lastProcessedLedger: null,
        lastReconciledBountyId: '0',
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  if (!state) {
    throw new Error('Contract synchronization state could not be created');
  }

  const topic = stellarSdk.xdr.ScVal.scvSymbol('lock_bnty').toXDR('base64');

  const batch = await fetchContractEvents('bounty-locks', topic, state.lastProcessedLedger ?? null);

  let processed = 0;

  for (const event of batch.events) {
    if (!event.inSuccessfulContractCall) {
      continue;
    }

    const nativeValue = stellarSdk.scValToNative(event.value) as { bounty_id?: unknown };

    const eventBountyId = nativeValue.bounty_id;

    if (
      (typeof eventBountyId !== 'bigint' &&
        typeof eventBountyId !== 'number' &&
        typeof eventBountyId !== 'string') ||
      !/^[1-9]\d*$/.test(eventBountyId.toString())
    ) {
      throw new TypeError(`Lock event ${event.id} does not contain a valid bounty ID`);
    }

    const registered = await MessageBounty.exists({
      contractBountyId: eventBountyId.toString(),
      fundingStatus: 'contract_locked',
      settlementStatus: { $ne: 'failed' },
    });

    if (!registered) {
      continue;
    }

    const bounty = await decodeLockEvent(nativeValue, {
      eventId: event.id,
      ledger: event.ledger,
      txHash: event.txHash,
    });

    await upsertContractBounty({
      ...bounty,
      observedVia: 'event',
      eventId: event.id,
      eventLedger: event.ledger,
      lockTransactionHash: event.txHash,
    });
    processed += 1;
  }

  if (batch.lastProcessedLedger !== null) {
    state.lastProcessedLedger = batch.lastProcessedLedger;
    state.eventCursor = null;
    await state.save();
  }

  return { processed, lastProcessedLedger: batch.lastProcessedLedger };
};

export default syncBountyLockEvents;
