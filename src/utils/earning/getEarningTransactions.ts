import { Types } from 'mongoose';
import EarningTransaction from '../../models/EarningTransaction';
import formatUsdcUnits from './usdcUnits';
import type { EarningsQuery } from '../../validation/user/earnings';
import type { SerializedEarningTransaction } from '../../types/earning';

interface EarningTransactionPage {
  assetCode: 'USDC';
  totalAmount: string;
  items: SerializedEarningTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

const getEarningTransactions = async (
  userId: string,
  query: EarningsQuery,
): Promise<EarningTransactionPage> => {
  const match: Record<string, unknown> = { user: new Types.ObjectId(userId) };

  if (query.before) {
    match._id = { $lt: new Types.ObjectId(query.before) };
  }

  const [rows, totals] = await Promise.all([
    EarningTransaction.find(match)
      .sort({ _id: -1 })
      .limit(query.limit + 1)
      .exec(),
    EarningTransaction.aggregate<{ totalUnits: { toString(): string } }>([
      { $match: { user: new Types.ObjectId(userId) } },
      { $group: { _id: null, totalUnits: { $sum: { $toDecimal: '$netAmountUnits' } } } },
    ]).exec(),
  ]);

  const totalUnits = totals[0]?.totalUnits.toString() ?? '0';

  if (!/^\d+$/.test(totalUnits)) {
    throw new Error('Stored earning total is not an integer');
  }

  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

  const items = pageRows.map((row) => ({
    id: row._id.toString(),
    type: row.type,
    reason: 'Bounty reply reward' as const,
    contractBountyId: row.contractBountyId,
    assetCode: row.assetCode,
    amount: formatUsdcUnits(row.netAmountUnits),
    transactionHash: row.transactionHash,
    earnedAt: row.earnedAt,
  }));

  return {
    assetCode: 'USDC',
    totalAmount: formatUsdcUnits(totalUnits),
    items,
    nextCursor: hasMore ? (pageRows.at(-1)?._id.toString() ?? null) : null,
    hasMore,
  };
};

export default getEarningTransactions;
