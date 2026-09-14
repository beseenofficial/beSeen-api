import ContractSyncState from '../../models/ContractSyncState';
import MessageBounty from '../../models/MessageBounty';
import { CONTRACT_BOUNTY_SYNC_STATE_ID, CONTRACT_EVENT_PAGE_SIZE } from '../../constant/contract';
import type { ContractBountyData } from '../../types/contract/bounty';
import getContractBounty from './getContractBounty';
import getContractSyncConfig from './contractConfig';
import decodeContractBounty from './contractBountyCodec';
import upsertContractBounty from './upsertContractBounty';
import stellarSdk from './stellarSdk';

interface EventMetadata {
  eventId: string;
  ledger: number;
  txHash: string;
}

const decodeLockEvent = async (
  nativeValue: unknown,
  metadata: EventMetadata,
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

const syncBountyEvents = async (): Promise<{ processed: number; cursor: string }> => {
  const config = getContractSyncConfig();

  if (!config) {
    throw new Error('BeSeen contract synchronization is not configured');
  }

  const state = await ContractSyncState.findByIdAndUpdate(
    CONTRACT_BOUNTY_SYNC_STATE_ID,
    { $setOnInsert: { eventCursor: null, lastReconciledBountyId: '0' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  if (!state) {
    throw new Error('Contract synchronization state could not be created');
  }

  const rpcServer = new stellarSdk.rpc.Server(config.rpcUrl, {
    allowHttp: new URL(config.rpcUrl).protocol === 'http:',
  });
  const topic = stellarSdk.xdr.ScVal.scvSymbol('lock_bnty').toXDR('base64');
  const pagination = state.eventCursor
    ? { cursor: state.eventCursor }
    : { startLedger: config.startLedger };
  const response = await rpcServer.getEvents({
    filters: [
      {
        type: 'contract',
        contractIds: [config.contractId],
        topics: [[topic]],
      },
    ],
    ...pagination,
    limit: CONTRACT_EVENT_PAGE_SIZE,
  });

  let processed = 0;

  for (const event of response.events) {
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

  state.eventCursor = response.cursor;
  await state.save();

  return { processed, cursor: response.cursor };
};

export default syncBountyEvents;
