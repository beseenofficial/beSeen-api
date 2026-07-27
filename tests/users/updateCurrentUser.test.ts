import mongoose, { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import CreatorProfile from '../../src/models/CreatorProfile';
import User from '../../src/models/User';
import updateCurrentUser from '../../src/utils/user/updateCurrentUser';
import updateProfileBodySchema from '../../src/validation/user/updateProfile';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const session = {} as ClientSession;

const queryResult = <T>(value: T) => {
  const query = {
    session: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.session.mockReturnValue(query);
  return query;
};

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

describe('updateCurrentUser', () => {
  beforeEach(() => {
    vi.spyOn(mongoose.connection, 'transaction').mockImplementation(async (operation) =>
      operation(session),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates only the supplied common profile fields', async () => {
    const user = createUser('regular');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    const saveSpy = vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      return this;
    });

    const result = await updateCurrentUser(
      user._id.toString(),
      updateProfileBodySchema.parse({ displayName: 'Updated Name', bio: 'Updated bio' }),
    );

    expect(result).toMatchObject({
      ok: true,
      user: {
        username: 'regular_user',
        displayName: 'Updated Name',
        bio: 'Updated bio',
        accountType: 'regular',
      },
    });
    expect(saveSpy).toHaveBeenCalledWith({ session });
  });

  it('promotes a regular account by creating a complete creator profile atomically', async () => {
    const user = createUser('regular');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      return this;
    });
    const creatorSaveSpy = vi
      .spyOn(CreatorProfile.prototype, 'save')
      .mockImplementation(async function saveCreatorProfile() {
        return this;
      });
    const body = updateProfileBodySchema.parse({
      accountType: 'creator',
      creatorProfile: {
        headline: 'Visual storyteller',
        categories: ['Photography'],
        skills: ['Editing'],
        websiteUrl: 'https://creator.example',
        isAvailableForWork: true,
      },
    });

    const result = await updateCurrentUser(user._id.toString(), body);

    expect(result).toMatchObject({
      ok: true,
      user: {
        accountType: 'creator',
        creatorProfile: {
          headline: 'Visual storyteller',
          categories: ['photography'],
          skills: ['editing'],
          isAvailableForWork: true,
        },
      },
    });
    expect(creatorSaveSpy).toHaveBeenCalledWith({ session });
  });

  it('updates only supplied creator fields for an existing creator', async () => {
    const user = createUser('creator');
    const creatorProfile = new CreatorProfile({
      user: user._id,
      headline: 'Old headline',
      categories: ['Photography'],
      skills: ['Editing'],
      isAvailableForWork: false,
    });
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      return this;
    });
    vi.spyOn(CreatorProfile, 'findOne').mockReturnValue(queryResult(creatorProfile) as never);
    const creatorSaveSpy = vi
      .spyOn(CreatorProfile.prototype, 'save')
      .mockImplementation(async function saveCreatorProfile() {
        return this;
      });

    const result = await updateCurrentUser(
      user._id.toString(),
      updateProfileBodySchema.parse({
        creatorProfile: { headline: 'New headline', isAvailableForWork: true },
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      user: {
        creatorProfile: {
          headline: 'New headline',
          categories: ['photography'],
          skills: ['editing'],
          isAvailableForWork: true,
        },
      },
    });
    expect(creatorSaveSpy).toHaveBeenCalledWith({ session });
  });

  it('demotes a creator and removes creator-only data in the same transaction', async () => {
    const user = createUser('creator');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      return this;
    });
    const deleteSpy = vi
      .spyOn(CreatorProfile, 'deleteOne')
      .mockReturnValue(queryResult({ deletedCount: 1 }) as never);

    const result = await updateCurrentUser(
      user._id.toString(),
      updateProfileBodySchema.parse({ accountType: 'regular' }),
    );

    expect(result).toMatchObject({
      ok: true,
      user: { accountType: 'regular', creatorProfile: null },
    });
    expect(deleteSpy).toHaveBeenCalledWith({ user: user._id });
  });

  it('rejects creator fields on a regular account when no promotion was requested', async () => {
    const user = createUser('regular');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    const saveSpy = vi.spyOn(User.prototype, 'save');

    const result = await updateCurrentUser(
      user._id.toString(),
      updateProfileBodySchema.parse({ creatorProfile: { headline: 'Not allowed' } }),
    );

    expect(result).toEqual({ ok: false, reason: 'creator_profile_not_allowed' });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('requires a complete creator profile only for an actual regular-to-creator promotion', async () => {
    const user = createUser('regular');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);

    const result = await updateCurrentUser(
      user._id.toString(),
      updateProfileBodySchema.parse({
        accountType: 'creator',
        creatorProfile: { headline: 'Incomplete' },
      }),
    );

    expect(result).toEqual({ ok: false, reason: 'creator_profile_required' });
  });
});
