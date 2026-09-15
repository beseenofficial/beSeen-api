import app from './app';
import env from './env';
import log from './logger';
import type { Server } from 'node:http';
import { connectDatabase, disconnectDatabase } from './db';
import runDatabaseMigrations from './migrations/runDatabaseMigrations';
import {
  startContractBountySync,
  stopContractBountySync,
} from './utils/contract/contractBountySyncScheduler';
import {
  startDiscoverRankingScheduler,
  stopDiscoverRankingScheduler,
} from './utils/discover/discoverRankingScheduler';
import {
  startBroadcastDraftCleanup,
  stopBroadcastDraftCleanup,
} from './utils/broadcast/broadcastDraftCleanupScheduler';

let server: Server | undefined;

const shutdown = (signal: NodeJS.Signals): void => {
  log.info({ signal }, 'Shutdown started');
  stopBroadcastDraftCleanup();
  stopDiscoverRankingScheduler();
  stopContractBountySync();

  if (!server) {
    void disconnectDatabase().finally(() => process.exit(0));
    return;
  }

  server.close(() => {
    void disconnectDatabase()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        log.error({ error }, 'Graceful shutdown failed');
        process.exit(1);
      });
  });
};

const bootstrap = async (): Promise<void> => {
  await connectDatabase();
  await runDatabaseMigrations();
  startBroadcastDraftCleanup();
  startDiscoverRankingScheduler();
  startContractBountySync();

  server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, 'BeSeen API started');
  });

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

void bootstrap().catch((error: unknown) => {
  log.fatal({ error }, 'BeSeen API failed to start');
  process.exit(1);
});
