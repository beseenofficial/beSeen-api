import User from '../../models/User';
import EarningTransaction from '../../models/EarningTransaction';
import type { ContractEventMetadata } from '../../types/contract/event';
import type { AuraEarningEvent, WithdrawalEvent } from '../../types/earning';

const eventDate = (ledgerClosedAt: string): Date => {
  const occurredAt = new Date(ledgerClosedAt);

  if (Number.isNaN(occurredAt.getTime())) {
    throw new TypeError('Contract event ledger close time is invalid');
  }

  return occurredAt;
};

const recordAuraEarning = async (
  aura: AuraEarningEvent,
  metadata: ContractEventMetadata,
  ledgerClosedAt: string,
): Promise<boolean> => {
  const user = await User.findOne({ walletAddress: aura.subject }).select({ _id: 1 }).lean().exec();

  if (!user) {
    return false;
  }

  const price = BigInt(aura.priceAmountUnits);
  const fee = BigInt(aura.feeAmountUnits);

  if (price <= 0n || fee < 0n || fee > price) {
    throw new RangeError(`Aura purchase amounts for token ${aura.contractAuraTokenId} are invalid`);
  }

  await EarningTransaction.findOneAndUpdate(
    { type: 'aura_purchase', contractAuraTokenId: aura.contractAuraTokenId },
    {
      $setOnInsert: {
        user: user._id,
        messageBounty: null,
        contractBountyId: null,
        contractAuraTokenId: aura.contractAuraTokenId,
        type: 'aura_purchase',
        assetCode: 'USDC',
        grossAmountUnits: aura.priceAmountUnits,
        feeAmountUnits: aura.feeAmountUnits,
        netAmountUnits: (price - fee).toString(),
        transactionHash: metadata.txHash.toLowerCase(),
        eventId: metadata.eventId,
        eventLedger: metadata.ledger,
        earnedAt: eventDate(ledgerClosedAt),
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  return true;
};

const recordWithdrawal = async (
  withdrawal: WithdrawalEvent,
  metadata: ContractEventMetadata,
  ledgerClosedAt: string,
): Promise<boolean> => {
  const user = await User.findOne({ walletAddress: withdrawal.owner })
    .select({ _id: 1 })
    .lean()
    .exec();

  if (!user) {
    return false;
  }

  const amount = BigInt(withdrawal.amountUnits);

  if (amount <= 0n) {
    throw new RangeError('Withdrawal amount must be positive');
  }

  await EarningTransaction.findOneAndUpdate(
    { eventId: metadata.eventId },
    {
      $setOnInsert: {
        user: user._id,
        messageBounty: null,
        contractBountyId: null,
        contractAuraTokenId: null,
        type: 'withdrawal',
        assetCode: 'USDC',
        grossAmountUnits: withdrawal.amountUnits,
        feeAmountUnits: '0',
        netAmountUnits: (-amount).toString(),
        transactionHash: metadata.txHash.toLowerCase(),
        eventId: metadata.eventId,
        eventLedger: metadata.ledger,
        earnedAt: eventDate(ledgerClosedAt),
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).exec();

  return true;
};

export { recordAuraEarning, recordWithdrawal };
