import log from '../logger';
import addDiscoverRanking from './20260811AddDiscoverRanking';
import addUserActivity from './20260827AddUserActivity';
import addPublicProfileMessageStats from './20260828AddPublicProfileMessageStats';

const runDatabaseMigrations = async (): Promise<void> => {
  const discover = await addDiscoverRanking();
  const activity = await addUserActivity();
  const publicProfileMessageStats = await addPublicProfileMessageStats();

  log.info({ discover, activity, publicProfileMessageStats }, 'Database migrations completed');
};

export default runDatabaseMigrations;
