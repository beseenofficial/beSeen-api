import { Types } from 'mongoose';
import User from '../../src/models/User';
import { afterEach, describe, expect, it, vi } from 'vitest';
import getCurrentUser from '../../src/utils/user/getCurrentUser';
import getContractAuraPrices from '../../src/utils/contract/getContractAuraPrices';

vi.mock('../../src/utils/contract/getContractAuraPrices', () => ({ default: vi.fn() }));

const getContractAuraPricesMock = vi.mocked(getContractAuraPrices);

const queryResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('getCurrentUser', () => {
  afterEach(() => {
    getContractAuraPricesMock.mockReset();
    vi.restoreAllMocks();
  });

  it('returns the current user with the on-chain Aura price', async () => {
    const userId = new Types.ObjectId();

    const user = new User({
      _id: userId,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'alice',
    });

    user.createdAt = new Date('2026-08-28T00:00:00.000Z');

    getContractAuraPricesMock.mockResolvedValue(new Map([[user.walletAddress, '10000000']]));

    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);

    await expect(getCurrentUser(userId.toString())).resolves.toMatchObject({
      ok: true,
      user: {
        id: userId.toString(),
        auraPrice: '10000000',
      },
    });
    expect(getContractAuraPricesMock).toHaveBeenCalledWith([user.walletAddress]);
  });
});
