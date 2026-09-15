import getContractBounty from './getContractBounty';
import MessageBounty from '../../models/MessageBounty';
import ContractBounty from '../../models/ContractBounty';
import upsertContractBounty from './upsertContractBounty';
import type { BountyReconciliationResult, UnmirroredBounty } from '../../types/contract/reconciliation';

const REGISTERED_RECONCILIATION_BATCH_SIZE = 25;

const reconcileRegisteredContractBounties = async (): Promise<BountyReconciliationResult> => {
  const registrations = await MessageBounty.aggregate<UnmirroredBounty>([
    {
      $match: {
        contractBountyId: { $type: 'string' },
        fundingStatus: 'contract_locked',
        settlementStatus: { $ne: 'failed' },
      },
    },
    {
      $lookup: {
        from: ContractBounty.collection.name,
        localField: 'contractBountyId',
        foreignField: 'contractBountyId',
        as: 'contractBounty',
      },
    },
    { $match: { contractBounty: { $size: 0 } } },
    { $sort: { createdAt: 1, _id: 1 } },
    { $limit: REGISTERED_RECONCILIATION_BATCH_SIZE },
    { $project: { _id: 0, contractBountyId: 1 } },
  ]).exec();

  let synchronized = 0;
  let notFound = 0;

  for (const registration of registrations) {
    const bounty = await getContractBounty(BigInt(registration.contractBountyId));

    if (!bounty) {
      notFound += 1;
      continue;
    }

    await upsertContractBounty({ ...bounty, observedVia: 'reconciliation' });
    synchronized += 1;
  }

  return { checked: registrations.length, synchronized, notFound };
};

export default reconcileRegisteredContractBounties;
