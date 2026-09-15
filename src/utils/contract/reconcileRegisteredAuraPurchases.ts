import AuraToken from '../../models/AuraToken';
import getContractAura from './getContractAura';
import confirmAuraPurchase from '../aura/confirmAuraPurchase';
import type { AuraReconciliationResult } from '../../types/contract/reconciliation';

const AURA_RECONCILIATION_BATCH_SIZE = 25;

const reconcileRegisteredAuraPurchases = async (): Promise<AuraReconciliationResult> => {
  const registrations = await AuraToken.find({ status: 'pending' })
    .sort({ createdAt: 1, _id: 1 })
    .limit(AURA_RECONCILIATION_BATCH_SIZE)
    .exec();

  let notFound = 0;
  let confirmed = 0;

  for (const registration of registrations) {
    const aura = await getContractAura(BigInt(registration.contractTokenId));

    if (!aura) {
      notFound += 1;
      continue;
    }

    const result = await confirmAuraPurchase({ ...aura, buyer: aura.owner }, 'reconciliation');

    if (result.confirmed) {
      confirmed += 1;
    }
  }

  return { checked: registrations.length, confirmed, notFound };
};

export default reconcileRegisteredAuraPurchases;
