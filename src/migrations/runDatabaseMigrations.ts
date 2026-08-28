import log from '../logger';
import addUserBio from './20260828AddUserBio';
import addUserActivity from './20260827AddUserActivity';
import addDiscoverRanking from './20260811AddDiscoverRanking';
import addUserVerification from './20260828AddUserVerification';
import verifyOfficialBeseenUser from './20260828VerifyOfficialBeseenUser';
import addPublicProfileMessageStats from './20260828AddPublicProfileMessageStats';

const runDatabaseMigrations = async (): Promise<void> => {
  const discover = await addDiscoverRanking();
  const activity = await addUserActivity();
  const publicProfileMessageStats = await addPublicProfileMessageStats();
  const userBio = await addUserBio();
  const userVerification = await addUserVerification();
  const officialUserVerification = await verifyOfficialBeseenUser();

  log.info(
    {
      discover,
      activity,
      publicProfileMessageStats,
      userBio,
      userVerification,
      officialUserVerification,
    },
    'Database migrations completed',
  );
};

export default runDatabaseMigrations;
