import ContractBounty from '../../models/ContractBounty';
import type { ContractBountyDocument } from '../../models/ContractBounty';
import type { ObservedContractBounty } from '../../types/contract/bounty';

const assertSameImmutableData = (
  stored: ContractBountyDocument,
  observed: ObservedContractBounty,
): void => {
  if (
    stored.sender !== observed.sender ||
    stored.recipient !== observed.recipient ||
    stored.amount !== observed.amount ||
    stored.deadline !== observed.deadline
  ) {
    throw new Error(`Conflicting on-chain data for bounty ${observed.contractBountyId}`);
  }
};

const upsertContractBounty = async (
  observed: ObservedContractBounty,
): Promise<ContractBountyDocument> => {
  const setMetadata: Record<string, unknown> = {};

  if (observed.eventId !== undefined) {
    setMetadata.eventId = observed.eventId;
  }
  if (observed.eventLedger !== undefined) {
    setMetadata.eventLedger = observed.eventLedger;
  }
  if (observed.lockTransactionHash !== undefined) {
    setMetadata.lockTransactionHash = observed.lockTransactionHash.toLowerCase();
  }

  const stored = await ContractBounty.findOneAndUpdate(
    { contractBountyId: observed.contractBountyId },
    {
      $setOnInsert: {
        contractBountyId: observed.contractBountyId,
        sender: observed.sender,
        recipient: observed.recipient,
        amount: observed.amount,
        deadline: observed.deadline,
        status: observed.status,
        observedVia: observed.observedVia,
      },
      ...(Object.keys(setMetadata).length > 0 ? { $set: setMetadata } : {}),
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  if (!stored) {
    throw new Error(`Contract bounty ${observed.contractBountyId} could not be stored`);
  }

  assertSameImmutableData(stored, observed);

  if (stored.status !== observed.status && observed.observedVia === 'reconciliation') {
    stored.status = observed.status;
    stored.observedVia = 'reconciliation';
    await stored.save();
  }

  return stored;
};

export default upsertContractBounty;
