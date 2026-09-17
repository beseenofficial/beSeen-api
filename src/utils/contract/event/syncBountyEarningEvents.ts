import stellarSdk from '../stellarSdk';
import recordBountyEarning from '../../earning/recordBountyEarning';
import type { ContractEvent } from '../../../types/contract/event';
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

const handleBountyEarningEvent = async (event: ContractEvent): Promise<boolean> => {
  const settled = decodeBountySettledEvent(stellarSdk.scValToNative(event.value));

  return recordBountyEarning(settled, {
    eventId: event.id,
    ledger: event.ledger,
    txHash: event.txHash,
  });
};

export { decodeBountySettledEvent, handleBountyEarningEvent };
export default handleBountyEarningEvent;
