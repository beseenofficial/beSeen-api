import log from '../logger';
import addUserBio from './20260828AddUserBio';
import addUserActivity from './20260827AddUserActivity';
import addDiscoverRanking from './20260811AddDiscoverRanking';
import addDemoUsdcBalances from './20260828AddDemoUsdcBalances';
import addUserVerification from './20260828AddUserVerification';
import verifyOfficialBeseenUser from './20260828VerifyOfficialBeseenUser';
import replaceDemoTokensWithAura from './20260915ReplaceDemoTokensWithAura';
import addPublicProfileMessageStats from './20260828AddPublicProfileMessageStats';

const runDatabaseMigrations = async (): Promise<void> => {
  const discover = await addDiscoverRanking();

  const activity = await addUserActivity();

  const publicProfileMessageStats = await addPublicProfileMessageStats();

  const userBio = await addUserBio();

  const userVerification = await addUserVerification();

  const officialUserVerification = await verifyOfficialBeseenUser();

  const auraSocialGraph = await replaceDemoTokensWithAura();

  const demoUsdcBalances = await addDemoUsdcBalances();

  log.info(
    {
      discover,
      activity,
      publicProfileMessageStats,
      userBio,
      userVerification,
      officialUserVerification,
      auraSocialGraph,
      demoUsdcBalances,
    },
    'Database migrations completed',
  );
};

export default runDatabaseMigrations;
