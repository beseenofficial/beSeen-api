import User from '../models/User';
import MessageBounty from '../models/MessageBounty';
import { DEMO_USDC_DEFAULT_BALANCE_UNITS } from '../constant/messenger';

const addDemoUsdcBalances = async () => {
  const [userResult, bountyResult] = await Promise.all([
    User.collection.updateMany(
      { demoUsdcBalanceUnits: { $exists: false } },
      { $set: { demoUsdcBalanceUnits: DEMO_USDC_DEFAULT_BALANCE_UNITS } },
    ),
    MessageBounty.collection.updateMany(
      {
        $or: [{ amountUnits: { $exists: false } }, { fundingStatus: { $exists: false } }],
      },
      [
        {
          $set: {
            amountUnits: { $ifNull: ['$amountUnits', null] },
            fundingStatus: { $ifNull: ['$fundingStatus', 'legacy'] },
          },
        },
      ],
    ),
  ]);

  return {
    matchedUsers: userResult.matchedCount,
    modifiedUsers: userResult.modifiedCount,
    matchedLegacyBounties: bountyResult.matchedCount,
    modifiedLegacyBounties: bountyResult.modifiedCount,
  };
};

export default addDemoUsdcBalances;
