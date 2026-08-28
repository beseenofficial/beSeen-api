import log from '../logger';
import addDiscoverRanking from './20260811AddDiscoverRanking';
import addUserActivity from './20260827AddUserActivity';
import addPublicProfileMessageStats from './20260828AddPublicProfileMessageStats';
import addUserBio from './20260828AddUserBio';

const runDatabaseMigrations = async (): Promise<void> => {
  const discover = await addDiscoverRanking();
  const activity = await addUserActivity();
  const publicProfileMessageStats = await addPublicProfileMessageStats();
  const userBio = await addUserBio();

  log.info(
    { discover, activity, publicProfileMessageStats, userBio },
    'Database migrations completed',
  );
};

export default runDatabaseMigrations;
