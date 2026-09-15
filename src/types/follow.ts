type GetFollowCountsResult =
  | {
      ok: true;
      user: { id: string; username: string };
      followerCount: number;
      followingCount: number;
    }
  | { ok: false; reason: 'user_not_found' };

export type { GetFollowCountsResult };
