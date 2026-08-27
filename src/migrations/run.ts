import log from '../logger';
import { connectDatabase, disconnectDatabase } from '../db';
import runDatabaseMigrations from './runDatabaseMigrations';

const runMigrations = async (): Promise<void> => {
  await connectDatabase();

  try {
    await runDatabaseMigrations();
  } finally {
    await disconnectDatabase();
  }
};

void runMigrations().catch((error: unknown) => {
  log.fatal({ error }, 'Database migration failed');
  process.exitCode = 1;
});
