import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import addUserVerification from '../../src/migrations/20260828AddUserVerification';

describe('20260828AddUserVerification migration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('backfills nullable verification timestamps without overwriting existing values', async () => {
    const updateSpy = vi.spyOn(User.collection, 'updateMany').mockResolvedValue({
      matchedCount: 5,
      modifiedCount: 5,
    } as never);

    await expect(addUserVerification()).resolves.toEqual({
      matchedUsers: 5,
      modifiedUsers: 5,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      {
        $or: [
          { verificationGrantedAt: { $exists: false } },
          { verificationExpiresAt: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            verificationGrantedAt: { $ifNull: ['$verificationGrantedAt', null] },
            verificationExpiresAt: { $ifNull: ['$verificationExpiresAt', null] },
          },
        },
      ],
    );
  });
});
