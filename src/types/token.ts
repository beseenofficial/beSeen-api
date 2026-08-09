type MyTokensResult =
  | {
      ok: true;
      tokens: Array<{
        id: string;
        owner: { id: string; username: string; avatar: string | null };
        createdAt: Date;
        acquiredAt: Date;
      }>;
    }
  | { ok: false; reason: 'account_unavailable' };

type GetUserTokenResult =
  | {
      ok: true;
      token: {
        id: string;
        owner: { id: string; username: string; avatar: string | null };
        createdAt: Date;
      };
    }
  | { ok: false; reason: 'user_not_found' };

type GetFollowerCountResult =
  | { ok: true; user: { id: string; username: string }; count: number }
  | { ok: false; reason: 'user_not_found' };

type PurchaseUserTokenResult =
  | {
      ok: true;
      created: boolean;
      holding: { tokenId: string; ownerId: string; ownerUsername: string; acquiredAt: Date };
      conversation: { id: string; created: boolean };
    }
  | { ok: false; reason: 'buyer_unavailable' | 'user_not_found' | 'own_token' };

export type { GetFollowerCountResult, GetUserTokenResult, MyTokensResult, PurchaseUserTokenResult };
