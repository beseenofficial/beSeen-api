import User from '../../models/User';
import getContractBounty from './getContractBounty';
import MessageBounty from '../../models/MessageBounty';
import ContractBounty from '../../models/ContractBounty';
import settleContractBounties from './settleContractBounties';
import { CONTRACT_BOUNTY_SETTLEMENT_LEASE_MS } from '../../constant/contract';

const errorMessage = (error: unknown): string =>
  (error instanceof Error ? error.message : 'Unknown contract settlement failure').slice(0, 1_000);

const markForRetry = async (bountyId: unknown, error: unknown): Promise<void> => {
  await MessageBounty.updateOne(
    { _id: bountyId, settlementStatus: 'processing' },
    {
      $set: {
        settlementStatus: 'pending',
        settlementLeaseUntil: null,
        settlementLastError: errorMessage(error),
      },
    },
    { runValidators: true },
  ).exec();
};

const markFailed = async (bountyId: unknown, error: string): Promise<void> => {
  await MessageBounty.updateOne(
    { _id: bountyId, settlementStatus: 'processing' },
    {
      $set: {
        status: 'expired',
        settlementStatus: 'failed',
        settlementLeaseUntil: null,
        settlementLastError: error.slice(0, 1_000),
      },
    },
    { runValidators: true },
  ).exec();
};

const markConfirmed = async (
  bountyId: unknown,
  contractBountyId: string,
  transactionHash: string | null,
  now: Date,
): Promise<void> => {
  await ContractBounty.updateOne(
    { contractBountyId },
    {
      $set: {
        status: 'settled',
        settlementTransactionHash: transactionHash,
        settledAt: now,
      },
    },
    { runValidators: true },
  ).exec();

  await MessageBounty.updateOne(
    { _id: bountyId, settlementStatus: 'processing' },
    {
      $set: {
        status: 'claimed',
        fundingStatus: 'contract_settled',
        claimedAt: now,
        settlementStatus: 'confirmed',
        settlementLeaseUntil: null,
        settlementTransactionHash: transactionHash,
        settlementLastError: null,
      },
    },
    { runValidators: true },
  ).exec();
};

const processNextReplySettlement = async (): Promise<boolean> => {
  const now = new Date();

  const leaseUntil = new Date(now.getTime() + CONTRACT_BOUNTY_SETTLEMENT_LEASE_MS);

  const bounty = await MessageBounty.findOneAndUpdate(
    {
      contractBountyId: { $type: 'string' },
      status: 'claimable',
      fundingStatus: 'contract_locked',
      $or: [
        { settlementStatus: 'pending' },
        { settlementStatus: 'processing', settlementLeaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        settlementStatus: 'processing',
        settlementLeaseUntil: leaseUntil,
        settlementLastError: null,
      },
      $inc: { settlementAttempts: 1 },
    },
    { returnDocument: 'after', runValidators: true },
  ).exec();

  if (!bounty?.contractBountyId) {
    return false;
  }

  try {
    const [contractBounty, sponsor, beneficiary] = await Promise.all([
      getContractBounty(BigInt(bounty.contractBountyId)),
      User.findById(bounty.sponsor).select({ walletAddress: 1 }).exec(),
      User.findById(bounty.beneficiary).select({ walletAddress: 1 }).exec(),
    ]);

    if (!contractBounty) {
      await markForRetry(bounty._id, new Error('Registered bounty was not found on-chain'));
      return true;
    }

    if (!sponsor || !beneficiary) {
      await markFailed(bounty._id, 'Bounty participants are no longer available');
      return true;
    }

    if (
      contractBounty.sender !== sponsor.walletAddress ||
      contractBounty.recipient !== beneficiary.walletAddress ||
      contractBounty.amount !== bounty.amountUnits?.toString()
    ) {
      await markFailed(
        bounty._id,
        'On-chain bounty does not match its registered participants or amount',
      );
      return true;
    }

    if (contractBounty.status === 'settled') {
      await markConfirmed(bounty._id, bounty.contractBountyId, null, now);
      return true;
    }

    if (contractBounty.status === 'refunded') {
      await MessageBounty.updateOne(
        { _id: bounty._id, settlementStatus: 'processing' },
        {
          $set: {
            status: 'expired',
            fundingStatus: 'contract_refunded',
            settlementStatus: 'failed',
            settlementLeaseUntil: null,
            settlementLastError: 'On-chain bounty was already refunded',
          },
        },
        { runValidators: true },
      ).exec();
      return true;
    }

    const replyTimestampSeconds = BigInt(Math.floor((bounty.claimableAt ?? now).getTime() / 1_000));

    if (replyTimestampSeconds >= BigInt(contractBounty.deadline)) {
      await markFailed(bounty._id, 'Reply arrived at or after the on-chain bounty deadline');
      return true;
    }

    const settlement = await settleContractBounties([BigInt(bounty.contractBountyId)]);
    await markConfirmed(
      bounty._id,
      bounty.contractBountyId,
      settlement.transactionHash,
      new Date(),
    );
  } catch (error: unknown) {
    const refreshed = await getContractBounty(BigInt(bounty.contractBountyId)).catch(() => null);

    if (refreshed?.status === 'settled') {
      await markConfirmed(bounty._id, bounty.contractBountyId, null, new Date());
    } else if (refreshed && BigInt(refreshed.deadline) <= BigInt(Math.floor(Date.now() / 1_000))) {
      await markFailed(bounty._id, errorMessage(error));
    } else {
      await markForRetry(bounty._id, error);
    }
  }

  return true;
};

export default processNextReplySettlement;
