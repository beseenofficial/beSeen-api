import stellarSdk from '../stellarSdk';
import AuraToken from '../../../models/AuraToken';
import { decodeAuraPurchasedEvent } from '../contractAuraCodec';
import confirmAuraPurchase from '../../aura/confirmAuraPurchase';
import type { ContractEvent } from '../../../types/contract/event';
import { recordAuraEarning } from '../../earning/recordContractFinancialEvent';

const handleAuraPurchaseEvent = async (event: ContractEvent): Promise<boolean> => {
  const decoded = decodeAuraPurchasedEvent(stellarSdk.scValToNative(event.value));

  const [registered, earningRecorded] = await Promise.all([
    AuraToken.exists({
      contractTokenId: decoded.contractTokenId,
      purchaseTransactionHash: event.txHash.toLowerCase(),
      status: { $ne: 'failed' },
    }),
    recordAuraEarning(
      {
        contractAuraTokenId: decoded.contractTokenId,
        subject: decoded.subject,
        priceAmountUnits: decoded.price,
        feeAmountUnits: decoded.fee,
      },
      { eventId: event.id, ledger: event.ledger, txHash: event.txHash },
      event.ledgerClosedAt,
    ),
  ]);

  if (!registered) {
    return earningRecorded;
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

  return result.confirmed || earningRecorded;
};

export { handleAuraPurchaseEvent };
export default handleAuraPurchaseEvent;
