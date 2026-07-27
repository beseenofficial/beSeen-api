import env from '../../env';
import log from '../../logger';
import cleanupExpiredBroadcastDrafts from './cleanupExpiredBroadcastDrafts';

let cleanupTimer: NodeJS.Timeout | undefined;
let cleanupRunning = false;

const runCleanup = async (): Promise<void> => {
  if (cleanupRunning) {
    return;
  }

  cleanupRunning = true;

  try {
    const result = await cleanupExpiredBroadcastDrafts();

    if (result.expiredDraftCount > 0 || result.deletedDraftCount > 0) {
      log.info(result, 'Expired broadcast drafts cleaned');
    }
  } catch (error: unknown) {
    log.error({ error }, 'Broadcast draft cleanup failed');
  } finally {
    cleanupRunning = false;
  }
};

const startBroadcastDraftCleanup = (): void => {
  if (cleanupTimer) {
    return;
  }

  void runCleanup();
  cleanupTimer = setInterval(
    () => void runCleanup(),
    env.BROADCAST_CLEANUP_INTERVAL_SECONDS * 1_000,
  );
  cleanupTimer.unref();
};

const stopBroadcastDraftCleanup = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
  }
};

export { startBroadcastDraftCleanup, stopBroadcastDraftCleanup };
