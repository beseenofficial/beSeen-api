import stellarSdk from '../stellarSdk';
import AuraToken from '../../../models/AuraToken';
import { decodeAuraPurchasedEvent } from '../contractAuraCodec';
import confirmAuraPurchase from '../../aura/confirmAuraPurchase';
import type { ContractEvent } from '../../../types/contract/event';

const handleAuraPurchaseEvent = async (event: ContractEvent): Promise<boolean> => {
  const decoded = decodeAuraPurchasedEvent(stellarSdk.scValToNative(event.value));

  const registered = await AuraToken.exists({
    contractTokenId: decoded.contractTokenId,
    purchaseTransactionHash: event.txHash.toLowerCase(),
    status: { $ne: 'failed' },
  });

  if (!registered) {
    return false;
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

  return result.confirmed;
};

export { handleAuraPurchaseEvent };
export default handleAuraPurchaseEvent;
