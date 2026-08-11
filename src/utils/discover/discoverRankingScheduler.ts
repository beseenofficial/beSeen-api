import log from '../../logger';
import { DISCOVER_RANKING_INTERVAL_MS } from '../../constant/discover';
import recalculateDiscoverRankings from './recalculateDiscoverRankings';

let rankingTimer: NodeJS.Timeout | undefined;

let rankingRunning = false;

const runDiscoverRankingUpdate = async (): Promise<void> => {
  if (rankingRunning) {
    return;
  }

  rankingRunning = true;

  try {
    const result = await recalculateDiscoverRankings();

    log.info(result, 'Discover rankings recalculated');
  } catch (error: unknown) {
    log.error({ error }, 'Discover ranking recalculation failed');
  } finally {
    rankingRunning = false;
  }
};

const startDiscoverRankingScheduler = (): void => {
  if (rankingTimer) {
    return;
  }

  void runDiscoverRankingUpdate();

  rankingTimer = setInterval(() => void runDiscoverRankingUpdate(), DISCOVER_RANKING_INTERVAL_MS);
  rankingTimer.unref();
};

const stopDiscoverRankingScheduler = (): void => {
  if (rankingTimer) {
    clearInterval(rankingTimer);
    rankingTimer = undefined;
  }
};

export { runDiscoverRankingUpdate, startDiscoverRankingScheduler, stopDiscoverRankingScheduler };
