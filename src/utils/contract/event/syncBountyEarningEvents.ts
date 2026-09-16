import stellarSdk from '../stellarSdk';
import fetchContractEvents from './fetchContractEvents';
import ContractSyncState from '../../../models/ContractSyncState';
import recordBountyEarning from '../../earning/recordBountyEarning';
import { CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID } from '../../../constant/contract';
import type { ContractEventSyncResult } from '../../../types/contract/event';
import type { SettledBountyEvent } from '../../earning/recordBountyEarning';

const asUnsignedInteger = (value: unknown, field: string, positive = false): string => {
  if (
    (typeof value !== 'bigint' && typeof value !== 'number' && typeof value !== 'string') ||
    !/^(?:0|[1-9]\d*)$/.test(value.toString())
  ) {
    throw new TypeError(`Bounty settlement ${field} is not an unsigned integer`);
  }

  const parsed = BigInt(value.toString());
  if (parsed < (positive ? 1n : 0n)) {
    throw new RangeError(`Bounty settlement ${field} is outside its valid range`);
  }

  return parsed.toString();
};

const asAddress = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^[CG][A-Z2-7]{55}$/.test(value)) {
    throw new TypeError(`Bounty settlement ${field} is not a Stellar address`);
  }

  return value;
};

const decodeBountySettledEvent = (value: unknown): SettledBountyEvent => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Bounty settlement event must be a record');
  }

  const record = value as Record<string, unknown>;

  return {
    contractBountyId: asUnsignedInteger(record.bounty_id, 'bounty ID', true),
    sender: asAddress(record.sender, 'sender'),
    recipient: asAddress(record.recipient, 'recipient'),
    amountUnits: asUnsignedInteger(record.amount, 'amount', true),
    feeAmountUnits: asUnsignedInteger(record.fee, 'fee'),
  };
};

const syncBountyEarningEvents = async (): Promise<ContractEventSyncResult> => {
  const state = await ContractSyncState.findByIdAndUpdate(
    CONTRACT_BOUNTY_EARNING_SYNC_STATE_ID,
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
    throw new Error('Bounty earning synchronization state could not be created');
  }

  const topic = stellarSdk.xdr.ScVal.scvSymbol('pay_bnty').toXDR('base64');
  const batch = await fetchContractEvents(
    'bounty-earnings',
    topic,
    state.lastProcessedLedger ?? null,
  );

  let processed = 0;

  for (const event of batch.events) {
    if (!event.inSuccessfulContractCall) {
      continue;
    }

    const settled = decodeBountySettledEvent(stellarSdk.scValToNative(event.value));
    const recorded = await recordBountyEarning(settled, {
      eventId: event.id,
      ledger: event.ledger,
      txHash: event.txHash,
    });

    if (recorded) {
      processed += 1;
    }
  }

  if (batch.lastProcessedLedger !== null) {
    state.lastProcessedLedger = batch.lastProcessedLedger;
    state.eventCursor = null;
    await state.save();
  }

  return { processed, lastProcessedLedger: batch.lastProcessedLedger };
};

export { decodeBountySettledEvent };
export default syncBountyEarningEvents;
