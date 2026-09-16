import User from '../../models/User';
import MessageBounty from '../../models/MessageBounty';
import ContractBounty from '../../models/ContractBounty';
import type { ContractBountyDocument } from '../../types/contract/bounty';
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
): Promise<ContractBountyDocument | null> => {
  const registration = await MessageBounty.findOne({
    contractBountyId: observed.contractBountyId,
    fundingStatus: 'contract_locked',
    settlementStatus: { $ne: 'failed' },
  })
    .select({ sponsor: 1, beneficiary: 1, amountUnits: 1 })
    .lean()
    .exec();

  if (!registration || registration.amountUnits === null) {
    return null;
  }

  const [sponsor, beneficiary] = await Promise.all([
    User.findById(registration.sponsor).select({ walletAddress: 1 }).lean().exec(),
    User.findById(registration.beneficiary).select({ walletAddress: 1 }).lean().exec(),
  ]);

  if (
    !sponsor ||
    !beneficiary ||
    sponsor.walletAddress !== observed.sender ||
    beneficiary.walletAddress !== observed.recipient ||
    registration.amountUnits.toString() !== observed.amount
  ) {
    await MessageBounty.updateOne(
      { _id: registration._id, fundingStatus: 'contract_locked' },
      {
        $set: {
          status: 'expired',
          settlementStatus: 'failed',
          settlementLeaseUntil: null,
          settlementLastError:
            'On-chain bounty does not match its registered participants or amount',
        },
      },
      { runValidators: true },
    ).exec();
    return null;
  }

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
