import User from '../../models/User';
import UserActivityDay from '../../models/UserActivityDay';
import { withDatabaseTransaction } from '../../db';
import type { RecordUserActivityResult } from '../../types/user';
import {
  USER_ACTIVITY_HEARTBEAT_MAX_CREDIT_SECONDS,
  USER_ACTIVITY_HEARTBEAT_MIN_INTERVAL_SECONDS,
} from '../../constant/activity';

const utcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const recordUserActivity = async (
  userId: string,
  now = new Date(),
): Promise<RecordUserActivityResult> =>
  withDatabaseTransaction(async (session) => {
    const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null })
      .select({ _id: 1, lastActivityHeartbeatAt: 1 })
      .session(session)
      .exec();

    if (!user) {
      return { ok: false, reason: 'account_unavailable' };
    }

    const previous = user.lastActivityHeartbeatAt;
    const elapsedSeconds = previous
      ? Math.max(0, Math.floor((now.getTime() - previous.getTime()) / 1_000))
      : 0;
    const creditedSeconds =
      elapsedSeconds >= USER_ACTIVITY_HEARTBEAT_MIN_INTERVAL_SECONDS &&
      elapsedSeconds <= USER_ACTIVITY_HEARTBEAT_MAX_CREDIT_SECONDS
        ? elapsedSeconds
        : 0;
    const advanceHeartbeat = !previous || elapsedSeconds >= USER_ACTIVITY_HEARTBEAT_MIN_INTERVAL_SECONDS;

    await User.updateOne(
      { _id: user._id, status: 'active', deletedAt: null },
      {
        $set: {
          lastActiveAt: now,
          ...(advanceHeartbeat ? { lastActivityHeartbeatAt: now } : {}),
        },
      },
      { session },
    ).exec();

    if (creditedSeconds > 0) {
      await UserActivityDay.updateOne(
        { user: user._id, day: utcDay(now) },
        { $inc: { activeSeconds: creditedSeconds } },
        { upsert: true, session },
      ).exec();
    }

    return {
      ok: true,
      activity: { creditedSeconds, lastActiveAt: now, isOnline: true },
    };
  });

export default recordUserActivity;
