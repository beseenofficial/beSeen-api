import getContractBounty from './getContractBounty';
import MessageBounty from '../../models/MessageBounty';
import ContractBounty from '../../models/ContractBounty';
import upsertContractBounty from './upsertContractBounty';
import ContractSyncState from '../../models/ContractSyncState';
import { CONTRACT_BOUNTY_SYNC_STATE_ID } from '../../constant/contract';
import type { BountySequenceReconciliationResult } from '../../types/contract/reconciliation';

const MAX_ALREADY_OBSERVED_ADVANCES = 1_000;

const reconcileNextContractBounty = async (): Promise<BountySequenceReconciliationResult> => {
  const state = await ContractSyncState.findByIdAndUpdate(
    CONTRACT_BOUNTY_SYNC_STATE_ID,
    { $setOnInsert: { eventCursor: null, lastReconciledBountyId: '0' } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  if (!state) {
    throw new Error('Contract synchronization state could not be created');
  }

  let lastReconciledId = BigInt(state.lastReconciledBountyId);
  let advancedAcrossObserved = 0;

  while (advancedAcrossObserved < MAX_ALREADY_OBSERVED_ADVANCES) {
    const nextId = lastReconciledId + 1n;

    const alreadyObserved = await ContractBounty.exists({ contractBountyId: nextId.toString() });

    if (!alreadyObserved) {
      break;
    }

    lastReconciledId = nextId;
    advancedAcrossObserved += 1;
  }

  if (state.lastReconciledBountyId !== lastReconciledId.toString()) {
    state.lastReconciledBountyId = lastReconciledId.toString();
    await state.save();
  }

  const nextId = lastReconciledId + 1n;

  const bounty = await getContractBounty(nextId);

  if (!bounty) {
    return {
      checkedBountyId: nextId.toString(),
      found: false,
      registered: false,
      advancedAcrossObserved,
    };
  }

  const registered = Boolean(
    await MessageBounty.exists({
      contractBountyId: bounty.contractBountyId,
      fundingStatus: 'contract_locked',
      settlementStatus: { $ne: 'failed' },
    }),
  );

  if (registered) {
    await upsertContractBounty({ ...bounty, observedVia: 'reconciliation' });
  }

  state.lastReconciledBountyId = nextId.toString();
  await state.save();

  return {
    checkedBountyId: nextId.toString(),
    found: true,
    registered,
    advancedAcrossObserved,
  };
};

export default reconcileNextContractBounty;
