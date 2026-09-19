import log from '../logger';
import addUserBio from './20260828AddUserBio';
import removeDemoUsdc from './20260915RemoveDemoUsdc';
import addUserActivity from './20260827AddUserActivity';
import addDiscoverRanking from './20260811AddDiscoverRanking';
import addUserVerification from './20260828AddUserVerification';
import verifyOfficialBeseenUser from './20260828VerifyOfficialBeseenUser';
import replaceDemoTokensWithAura from './20260915ReplaceDemoTokensWithAura';
import addPublicProfileMessageStats from './20260828AddPublicProfileMessageStats';
import addAvailableBountySummaryIndex from './20260919AddAvailableBountySummaryIndex';
import addFinancialEventTransactions from './20260919AddFinancialEventTransactions';

const runDatabaseMigrations = async (): Promise<void> => {
  const discover = await addDiscoverRanking();

  const activity = await addUserActivity();

  const publicProfileMessageStats = await addPublicProfileMessageStats();

  const userBio = await addUserBio();

  const userVerification = await addUserVerification();

  const officialUserVerification = await verifyOfficialBeseenUser();

  const auraSocialGraph = await replaceDemoTokensWithAura();

  const removedDemoUsdc = await removeDemoUsdc();

  const availableBountySummary = await addAvailableBountySummaryIndex();
  const financialEventTransactions = await addFinancialEventTransactions();

  log.info(
    {
      discover,
      activity,
      publicProfileMessageStats,
      userBio,
      userVerification,
      officialUserVerification,
      auraSocialGraph,
      removedDemoUsdc,
      availableBountySummary,
      financialEventTransactions,
    },
    'Database migrations completed',
  );
};

export default runDatabaseMigrations;
