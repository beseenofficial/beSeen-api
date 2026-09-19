import stellarSdk from '../stellarSdk';
import type { ContractEvent } from '../../../types/contract/event';
import { recordWithdrawal } from '../../earning/recordContractFinancialEvent';
import type { WithdrawalEvent } from '../../../types/earning';

const asPositiveInteger = (value: unknown): string => {
  if (
    (typeof value !== 'bigint' && typeof value !== 'number' && typeof value !== 'string') ||
    !/^[1-9]\d*$/.test(value.toString())
  ) {
    throw new TypeError('Withdrawal amount is not a positive integer');
  }

  return value.toString();
};

const asAddress = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[CG][A-Z2-7]{55}$/.test(value)) {
    throw new TypeError('Withdrawal owner is not a Stellar address');
  }

  return value;
};

const decodeWithdrawalEvent = (ownerTopic: unknown, value: unknown): WithdrawalEvent => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Withdrawal event value must be a record');
  }

  return {
    owner: asAddress(ownerTopic),
    amountUnits: asPositiveInteger((value as Record<string, unknown>).amount),
  };
};

const handleWithdrawalEvent = async (event: ContractEvent): Promise<boolean> => {
  if (!event.topic[1]) {
    throw new TypeError(`Withdrawal event ${event.id} does not contain an owner topic`);
  }

  const withdrawal = decodeWithdrawalEvent(
    stellarSdk.scValToNative(event.topic[1]),
    stellarSdk.scValToNative(event.value),
  );

  return recordWithdrawal(
    withdrawal,
    { eventId: event.id, ledger: event.ledger, txHash: event.txHash },
    event.ledgerClosedAt,
  );
};

export { decodeWithdrawalEvent, handleWithdrawalEvent };
export default handleWithdrawalEvent;
