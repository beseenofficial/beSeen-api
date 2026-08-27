import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserActivityDay from '../../src/models/UserActivityDay';
import addUserActivity from '../../src/migrations/20260827AddUserActivity';

describe('20260827AddUserActivity migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('backfills nullable activity timestamps and creates daily activity indexes', async () => {
    const updateSpy = vi.spyOn(User.collection, 'updateMany').mockResolvedValue({
      matchedCount: 2,
      modifiedCount: 2,
    } as never);
    const indexSpy = vi.spyOn(UserActivityDay.collection, 'createIndex').mockResolvedValue('index');

    await expect(addUserActivity()).resolves.toEqual({
      matchedUsers: 2,
      modifiedUsers: 2,
      ensuredIndexes: 2,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      {
        $or: [
          { lastActiveAt: { $exists: false } },
          { lastActivityHeartbeatAt: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            lastActiveAt: { $ifNull: ['$lastActiveAt', null] },
            lastActivityHeartbeatAt: { $ifNull: ['$lastActivityHeartbeatAt', null] },
          },
        },
      ],
    );
    expect(indexSpy).toHaveBeenCalledTimes(2);
  });
});
