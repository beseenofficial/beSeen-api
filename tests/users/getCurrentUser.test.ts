import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import getCurrentUser from '../../src/utils/user/getCurrentUser';

const queryResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('getCurrentUser', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the private demo USDC balance as an exact decimal string', async () => {
    const userId = new Types.ObjectId();
    const user = new User({
      _id: userId,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'alice',
      demoUsdcBalanceUnits: 105_000_001,
    });
    user.createdAt = new Date('2026-08-28T00:00:00.000Z');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);

    await expect(getCurrentUser(userId.toString())).resolves.toMatchObject({
      ok: true,
      user: {
        id: userId.toString(),
        demoUsdcBalance: '10.5000001',
      },
    });
  });
});
