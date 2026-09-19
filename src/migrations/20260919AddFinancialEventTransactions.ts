import EarningTransaction from '../models/EarningTransaction';

const addFinancialEventTransactions = async (): Promise<{
  droppedIndexes: number;
  ensuredIndexes: number;
}> => {
  const indexes = await EarningTransaction.collection.indexes();
  const existingBountyIndex = indexes.find(
    (index) => index.name === 'earning_transactions_bounty_unique',
  );
  const bountyIndexNeedsReplacement =
    existingBountyIndex !== undefined && existingBountyIndex.partialFilterExpression === undefined;

  if (bountyIndexNeedsReplacement) {
    await EarningTransaction.collection.dropIndex('earning_transactions_bounty_unique');
  }

  await EarningTransaction.collection.createIndex(
    { type: 1, contractBountyId: 1 },
    {
      unique: true,
      name: 'earning_transactions_bounty_unique',
      partialFilterExpression: { type: 'bounty_reply', contractBountyId: { $type: 'string' } },
    },
  );
  await EarningTransaction.collection.createIndex(
    { type: 1, contractAuraTokenId: 1 },
    {
      unique: true,
      name: 'earning_transactions_aura_unique',
      partialFilterExpression: {
        type: 'aura_purchase',
        contractAuraTokenId: { $type: 'string' },
      },
    },
  );

  return {
    droppedIndexes: bountyIndexNeedsReplacement ? 1 : 0,
    ensuredIndexes: 2,
  };
};

export default addFinancialEventTransactions;
