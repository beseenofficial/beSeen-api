import log from '../logger';
import addDiscoverRanking from './20260811AddDiscoverRanking';
import addUserActivity from './20260827AddUserActivity';

const runDatabaseMigrations = async (): Promise<void> => {
  const discover = await addDiscoverRanking();
  const activity = await addUserActivity();

  log.info({ discover, activity }, 'Database migrations completed');
};

export default runDatabaseMigrations;
