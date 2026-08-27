import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import UserActivityDay from '../../src/models/UserActivityDay';

describe('UserActivityDay model', () => {
  it('stores a non-negative daily activity duration and declares supporting indexes', async () => {
    const activity = new UserActivityDay({
      user: new Types.ObjectId(),
      day: new Date('2026-08-27T00:00:00.000Z'),
      activeSeconds: 60,
    });

    await activity.validate();
    expect(activity.activeSeconds).toBe(60);
    expect(UserActivityDay.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { user: 1, day: 1 },
          expect.objectContaining({ unique: true, name: 'user_activity_days_user_day_unique' }),
        ],
      ]),
    );
  });
});
