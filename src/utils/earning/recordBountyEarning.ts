import User from '../../models/User';
import MessageBounty from '../../models/MessageBounty';
import ContractBounty from '../../models/ContractBounty';
import EarningTransaction from '../../models/EarningTransaction';
import { withDatabaseTransaction } from '../../db';
import type { ContractEventMetadata } from '../../types/contract/event';

interface SettledBountyEvent {
  contractBountyId: string;
  sender: string;
  recipient: string;
  amountUnits: string;
  feeAmountUnits: string;
}

const recordBountyEarning = async (
  settled: SettledBountyEvent,
  metadata: ContractEventMetadata,
): Promise<boolean> =>
  withDatabaseTransaction(async (session) => {
    const bounty = await MessageBounty.findOne({
      contractBountyId: settled.contractBountyId,
    })
      .session(session)
      .exec();

    if (!bounty) {
      return false;
    }

    const [sponsor, beneficiary] = await Promise.all([
      User.findById(bounty.sponsor).select({ walletAddress: 1 }).session(session).exec(),
      User.findById(bounty.beneficiary).select({ walletAddress: 1 }).session(session).exec(),
    ]);

    if (!sponsor || !beneficiary) {
      throw new Error(`Participants for bounty ${settled.contractBountyId} were not found`);
    }

    if (
      sponsor.walletAddress !== settled.sender ||
      beneficiary.walletAddress !== settled.recipient ||
      bounty.amountUnits !== settled.amountUnits
    ) {
      throw new Error(`Settlement event for bounty ${settled.contractBountyId} does not match`);
    }

    const grossAmount = BigInt(settled.amountUnits);
    const feeAmount = BigInt(settled.feeAmountUnits);

    if (grossAmount <= 0n || feeAmount < 0n || feeAmount > grossAmount) {
      throw new Error(`Settlement amounts for bounty ${settled.contractBountyId} are invalid`);
    }

    const now = new Date();
    const transactionHash = metadata.txHash.toLowerCase();

    await EarningTransaction.findOneAndUpdate(
      { type: 'bounty_reply', contractBountyId: settled.contractBountyId },
      {
        $setOnInsert: {
          user: bounty.beneficiary,
          messageBounty: bounty._id,
          contractBountyId: settled.contractBountyId,
          type: 'bounty_reply',
          assetCode: 'USDC',
          grossAmountUnits: settled.amountUnits,
          feeAmountUnits: settled.feeAmountUnits,
          netAmountUnits: (grossAmount - feeAmount).toString(),
          transactionHash,
          eventId: metadata.eventId,
          eventLedger: metadata.ledger,
          earnedAt: bounty.claimedAt ?? now,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true, session },
    ).exec();

    await ContractBounty.updateOne(
      { contractBountyId: settled.contractBountyId },
      {
        $set: {
          status: 'settled',
          settlementTransactionHash: transactionHash,
          settledAt: bounty.claimedAt ?? now,
        },
      },
      { runValidators: true, session },
    ).exec();

    await MessageBounty.updateOne(
      { _id: bounty._id },
      {
        $set: {
          status: 'claimed',
          fundingStatus: 'contract_settled',
          settlementStatus: 'confirmed',
          settlementLeaseUntil: null,
          settlementTransactionHash: transactionHash,
          settlementLastError: null,
          claimedAt: bounty.claimedAt ?? now,
        },
      },
      { runValidators: true, session },
    ).exec();

    return true;
  });

export default recordBountyEarning;
export type { SettledBountyEvent };
