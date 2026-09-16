import User from '../models/User';
import MessageBounty from '../models/MessageBounty';

const removeDemoUsdc = async () => {
  const [userResult, amountResult, bountyResult] = await Promise.all([
    User.collection.updateMany(
      { demoUsdcBalanceUnits: { $exists: true } },
      { $unset: { demoUsdcBalanceUnits: '' } },
    ),
    MessageBounty.collection.updateMany(
      {
        contractBountyId: { $type: 'string' },
        amountUnits: { $type: 'number' },
      },
      [{ $set: { amountUnits: { $toString: '$amountUnits' } } }],
    ),
    MessageBounty.collection.deleteMany({
      $or: [{ contractBountyId: null }, { contractBountyId: { $exists: false } }],
    }),
  ]);

  return {
    matchedUsers: userResult.matchedCount,
    removedUserBalances: userResult.modifiedCount,
    migratedContractAmounts: amountResult.modifiedCount,
    removedDemoBounties: bountyResult.deletedCount,
  };
};

export default removeDemoUsdc;
