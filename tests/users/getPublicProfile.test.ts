import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CreatorProfile from '../../src/models/CreatorProfile';
import User from '../../src/models/User';
import getPublicProfile from '../../src/utils/user/getPublicProfile';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('getPublicProfile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns public creator data without exposing the wallet address', async () => {
    const user = new User({
      _id: new Types.ObjectId(),
      walletAddress: WALLET_ADDRESS,
      username: 'creator_user',
      displayName: 'Creator User',
      accountType: 'creator',
    });
    user.createdAt = new Date('2026-07-01T12:00:00.000Z');
    const creatorProfile = new CreatorProfile({
      user: user._id,
      headline: 'Visual storyteller',
      categories: ['Photography'],
      skills: ['Editing'],
      isAvailableForWork: true,
    });
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(CreatorProfile, 'findOne').mockReturnValue(queryResult(creatorProfile) as never);

    const result = await getPublicProfile('creator_user');

    expect(result).toMatchObject({
      ok: true,
      user: {
        username: 'creator_user',
        accountType: 'creator',
        creatorProfile: {
          headline: 'Visual storyteller',
          categories: ['photography'],
          skills: ['editing'],
        },
      },
    });
    if (result.ok) expect(result.user).not.toHaveProperty('walletAddress');
  });

  it('does not expose unavailable accounts', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);

    const result = await getPublicProfile('missing_user');

    expect(result).toEqual({ ok: false, reason: 'user_not_found' });
  });
});
