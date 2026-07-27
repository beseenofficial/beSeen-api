import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import CreatorProfile from '../../src/models/CreatorProfile';
import User from '../../src/models/User';
import getCurrentUser from '../../src/utils/user/getCurrentUser';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

const createUser = (accountType: 'regular' | 'creator') => {
  const user = new User({
    _id: new Types.ObjectId(),
    walletAddress: WALLET_ADDRESS,
    username: `${accountType}_user`,
    displayName: `${accountType} user`,
    accountType,
  });
  user.createdAt = new Date('2026-07-01T12:00:00.000Z');
  return user;
};

describe('getCurrentUser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a regular profile without querying creator data', async () => {
    const user = createUser('regular');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    const creatorSpy = vi.spyOn(CreatorProfile, 'findOne');

    const result = await getCurrentUser(user._id.toString());

    expect(result).toMatchObject({
      ok: true,
      user: { username: 'regular_user', accountType: 'regular', creatorProfile: null },
    });
    expect(creatorSpy).not.toHaveBeenCalled();
  });

  it('returns the joined creator profile for creator accounts', async () => {
    const user = createUser('creator');
    const creatorProfile = new CreatorProfile({
      user: user._id,
      headline: 'Visual storyteller',
      categories: ['Photography'],
      skills: ['Editing'],
      websiteUrl: 'https://creator.example',
      isAvailableForWork: true,
    });
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(CreatorProfile, 'findOne').mockReturnValue(queryResult(creatorProfile) as never);

    const result = await getCurrentUser(user._id.toString());

    expect(result).toMatchObject({
      ok: true,
      user: {
        accountType: 'creator',
        creatorProfile: {
          headline: 'Visual storyteller',
          categories: ['photography'],
          skills: ['editing'],
          websiteUrl: 'https://creator.example',
          isAvailableForWork: true,
        },
      },
    });
  });

  it('rejects missing, inactive, or deleted accounts', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);

    const result = await getCurrentUser(new Types.ObjectId().toString());

    expect(result).toEqual({ ok: false, reason: 'account_unavailable' });
  });
});
