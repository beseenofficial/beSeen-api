import log from '../logger';
import { connectDatabase, disconnectDatabase } from '../db';
import addDiscoverRanking from './20260811AddDiscoverRanking';

const runMigrations = async (): Promise<void> => {
  await connectDatabase();

  try {
    const result = await addDiscoverRanking();

    log.info(result, 'Database migrations completed');
  } finally {
    await disconnectDatabase();
  }
};

void runMigrations().catch((error: unknown) => {
  log.fatal({ error }, 'Database migration failed');
  process.exitCode = 1;
});
