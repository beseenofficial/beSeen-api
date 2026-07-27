import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';

import env from './env';
import log from './logger';

const connectDatabase = async (): Promise<void> => {
  await mongoose.connect(env.DB_URI, {
    dbName: env.DB_NAME,
  });

  log.info({ database: env.DB_NAME }, 'Database connected');
};

const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  log.info('Database disconnected');
};

const withDatabaseTransaction = async <T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> => {
  return mongoose.connection.transaction(operation);
};

export { connectDatabase, disconnectDatabase, withDatabaseTransaction };
