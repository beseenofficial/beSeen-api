import stellarSdk from '../stellarSdk';
import AuraToken from '../../../models/AuraToken';
import fetchContractEvents from './fetchContractEvents';
import { decodeAuraPurchasedEvent } from '../contractAuraCodec';
import confirmAuraPurchase from '../../aura/confirmAuraPurchase';
import ContractSyncState from '../../../models/ContractSyncState';
import { CONTRACT_AURA_SYNC_STATE_ID } from '../../../constant/contract';
import type { ContractEventSyncResult } from '../../../types/contract/event';

const syncAuraPurchaseEvents = async (): Promise<ContractEventSyncResult> => {
  const state = await ContractSyncState.findByIdAndUpdate(
    CONTRACT_AURA_SYNC_STATE_ID,
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

  const topic = stellarSdk.xdr.ScVal.scvSymbol('buy_aura').toXDR('base64');

  const batch = await fetchContractEvents(topic, state.lastProcessedLedger ?? null);

  let processed = 0;
  for (const event of batch.events) {
    if (!event.inSuccessfulContractCall) {
      continue;
    }

    const decoded = decodeAuraPurchasedEvent(stellarSdk.scValToNative(event.value));

    const registered = await AuraToken.exists({
      contractTokenId: decoded.contractTokenId,
      purchaseTransactionHash: event.txHash.toLowerCase(),
      status: { $ne: 'failed' },
    });

    if (!registered) {
      continue;
    }

    const result = await confirmAuraPurchase(
      {
        ...decoded,
        transactionHash: event.txHash,
        eventId: event.id,
        eventLedger: event.ledger,
      },
      'event',
    );

    if (result.confirmed) {
      processed += 1;
    }
  }

  if (batch.lastProcessedLedger !== null) {
    state.lastProcessedLedger = batch.lastProcessedLedger;
    state.auraEventCursor = null;
    await state.save();
  }

  return { processed, lastProcessedLedger: batch.lastProcessedLedger };
};

export default syncAuraPurchaseEvents;
