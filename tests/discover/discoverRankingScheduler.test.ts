import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DISCOVER_RANKING_INTERVAL_MS } from '../../src/constant/discover';
import recalculateDiscoverRankings from '../../src/utils/discover/recalculateDiscoverRankings';
import {
  runDiscoverRankingUpdate,
  startDiscoverRankingScheduler,
  stopDiscoverRankingScheduler,
} from '../../src/utils/discover/discoverRankingScheduler';

vi.mock('../../src/utils/discover/recalculateDiscoverRankings', () => ({ default: vi.fn() }));

vi.mock('../../src/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const recalculateDiscoverRankingsMock = vi.mocked(recalculateDiscoverRankings);

describe('Discover ranking scheduler', () => {
  beforeEach(() => {
    recalculateDiscoverRankingsMock.mockReset();
  });

  afterEach(() => {
    stopDiscoverRankingScheduler();
    vi.useRealTimers();
  });

  it('skips a concurrent ranking run while the current run is unfinished', async () => {
    let finishRanking: (() => void) | undefined;

    recalculateDiscoverRankingsMock.mockReturnValue(
      new Promise((resolve) => {
        finishRanking = () =>
          resolve({
            processedUsers: 1,
            matchedUsers: 1,
            modifiedUsers: 1,
            calculatedAt: new Date(),
            durationMs: 1,
          });
      }),
    );

    const firstRun = runDiscoverRankingUpdate();

    const concurrentRun = runDiscoverRankingUpdate();

    expect(recalculateDiscoverRankingsMock).toHaveBeenCalledTimes(1);

    finishRanking?.();

    await Promise.all([firstRun, concurrentRun]);
  });

  it('runs immediately and then every thirty minutes', async () => {
    vi.useFakeTimers();

    recalculateDiscoverRankingsMock.mockResolvedValue({
      processedUsers: 0,
      matchedUsers: 0,
      modifiedUsers: 0,
      calculatedAt: new Date(),
      durationMs: 1,
    });

    startDiscoverRankingScheduler();

    expect(recalculateDiscoverRankingsMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(DISCOVER_RANKING_INTERVAL_MS);

    expect(recalculateDiscoverRankingsMock).toHaveBeenCalledTimes(2);
  });
});
