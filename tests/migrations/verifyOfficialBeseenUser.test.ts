import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import verifyOfficialBeseenUser from '../../src/migrations/20260828VerifyOfficialBeseenUser';

const grantedAt = new Date('2026-08-28T12:00:00.000Z');
const expiresAt = new Date('2036-08-28T12:00:00.000Z');

describe('20260828VerifyOfficialBeseenUser migration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(grantedAt);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('grants the official account one fixed ten-year verification period', async () => {
    const updateSpy = vi.spyOn(User.collection, 'updateOne').mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    } as never);

    await expect(verifyOfficialBeseenUser()).resolves.toEqual({
      matchedUsers: 1,
      modifiedUsers: 1,
      username: 'beseenfi',
      grantedAt,
      expiresAt,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      {
        username: 'beseenfi',
        verificationGrantedAt: null,
        verificationExpiresAt: null,
      },
      {
        $set: {
          verificationGrantedAt: grantedAt,
          verificationExpiresAt: expiresAt,
        },
      },
    );
  });

  it('does not extend or overwrite an existing verification period', async () => {
    vi.spyOn(User.collection, 'updateOne').mockResolvedValue({
      matchedCount: 0,
      modifiedCount: 0,
    } as never);

    await expect(verifyOfficialBeseenUser()).resolves.toEqual({
      matchedUsers: 0,
      modifiedUsers: 0,
      username: 'beseenfi',
      grantedAt: null,
      expiresAt: null,
    });
  });
});
