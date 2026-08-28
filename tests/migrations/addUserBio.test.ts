import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import addUserBio from '../../src/migrations/20260828AddUserBio';

describe('20260828AddUserBio migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('backfills only users that do not have the optional bio field', async () => {
    const updateSpy = vi.spyOn(User.collection, 'updateMany').mockResolvedValue({
      matchedCount: 4,
      modifiedCount: 4,
    } as never);

    await expect(addUserBio()).resolves.toEqual({ matchedUsers: 4, modifiedUsers: 4 });
    expect(updateSpy).toHaveBeenCalledWith({ bio: { $exists: false } }, { $set: { bio: null } });
  });
});
