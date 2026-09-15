import stellarSdk from '../stellarSdk';
import AuraToken from '../../../models/AuraToken';
import getContractSyncConfig from '../contractConfig';
import { decodeAuraPurchasedEvent } from '../contractAuraCodec';
import confirmAuraPurchase from '../../aura/confirmAuraPurchase';
import ContractSyncState from '../../../models/ContractSyncState';
import type { ContractEventSyncResult } from '../../../types/contract/event';
import { CONTRACT_AURA_SYNC_STATE_ID, CONTRACT_EVENT_PAGE_SIZE } from '../../../constant/contract';

const syncAuraPurchaseEvents = async (): Promise<ContractEventSyncResult> => {
  const config = getContractSyncConfig();

  if (!config) {
    throw new Error('BeSeen contract synchronization is not configured');
  }

  const state = await ContractSyncState.findByIdAndUpdate(
    CONTRACT_AURA_SYNC_STATE_ID,
    {
      $setOnInsert: {
        eventCursor: null,
        auraEventCursor: null,
        lastReconciledBountyId: '0',
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  if (!state) {
    throw new Error('Contract synchronization state could not be created');
  }

  const rpcServer = new stellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: new URL(config.rpcUrl).protocol === 'http:',
  });

  const topic = stellarSdk.xdr.ScVal.scvSymbol('buy_aura').toXDR('base64');

  const pagination = state.auraEventCursor
    ? { cursor: state.auraEventCursor }
    : { startLedger: config.startLedger };

  const response = await rpcServer.getEvents({
    filters: [{ type: 'contract', contractIds: [config.contractId], topics: [[topic]] }],
    ...pagination,
    limit: CONTRACT_EVENT_PAGE_SIZE,
  });

  let processed = 0;
  for (const event of response.events) {
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

  state.auraEventCursor = response.cursor;
  await state.save();

  return { processed, cursor: response.cursor };
};

export default syncAuraPurchaseEvents;
