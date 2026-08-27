import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserActivityDay from '../../src/models/UserActivityDay';
import { withDatabaseTransaction } from '../../src/db';
import recordUserActivity from '../../src/utils/user/recordUserActivity';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);
const userId = new Types.ObjectId();
const NOW = new Date('2026-08-27T12:00:00.000Z');

const userQuery = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const writeResult = () => ({ exec: vi.fn().mockResolvedValue({ modifiedCount: 1 }) });

describe('recordUserActivity', () => {
  beforeEach(() => {
    transactionMock.mockImplementation(async (operation) => operation({} as never));
    vi.spyOn(User, 'updateOne').mockReturnValue(writeResult() as never);
    vi.spyOn(UserActivityDay, 'updateOne').mockReturnValue(writeResult() as never);
  });

  afterEach(() => vi.restoreAllMocks());

  it('anchors the first heartbeat without inventing active time', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(
      userQuery({ _id: userId, lastActivityHeartbeatAt: null }) as never,
    );

    await expect(recordUserActivity(userId.toString(), NOW)).resolves.toMatchObject({
      ok: true,
      activity: { creditedSeconds: 0, lastActiveAt: NOW, isOnline: true },
    });
    expect(UserActivityDay.updateOne).not.toHaveBeenCalled();
  });

  it('credits a plausible consecutive heartbeat into the UTC daily bucket', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(
      userQuery({
        _id: userId,
        lastActivityHeartbeatAt: new Date(NOW.getTime() - 60_000),
      }) as never,
    );

    await expect(recordUserActivity(userId.toString(), NOW)).resolves.toMatchObject({
      ok: true,
      activity: { creditedSeconds: 60 },
    });
    expect(UserActivityDay.updateOne).toHaveBeenCalledWith(
      { user: userId, day: new Date('2026-08-27T00:00:00.000Z') },
      { $inc: { activeSeconds: 60 } },
      expect.objectContaining({ upsert: true }),
    );
  });

  it('does not credit an implausibly large heartbeat gap', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(
      userQuery({
        _id: userId,
        lastActivityHeartbeatAt: new Date(NOW.getTime() - 10 * 60_000),
      }) as never,
    );

    await expect(recordUserActivity(userId.toString(), NOW)).resolves.toMatchObject({
      ok: true,
      activity: { creditedSeconds: 0 },
    });
    expect(UserActivityDay.updateOne).not.toHaveBeenCalled();
  });
});
