import mongoose, { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthChallenge from '../../src/models/AuthChallenge';
import CreatorProfile from '../../src/models/CreatorProfile';
import User from '../../src/models/User';
import createAuthSession from '../../src/utils/auth/createAuthSession';
import loginUser from '../../src/utils/auth/loginUser';
import verifySep53Signature from '../../src/utils/stellar/verifySep53Signature';

vi.mock('../../src/utils/auth/createAuthSession', () => ({
  default: vi.fn(),
}));
vi.mock('../../src/utils/stellar/verifySep53Signature', () => ({
  default: vi.fn(),
}));

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNATURE = Buffer.alloc(64, 3).toString('base64');
const databaseSession = {} as ClientSession;
const createAuthSessionMock = vi.mocked(createAuthSession);
const verifySignatureMock = vi.mocked(verifySep53Signature);

const body = {
  challengeId: new Types.ObjectId().toString(),
  signature: SIGNATURE,
};

const queryResult = <T>(value: T) => {
  const query = {
    session: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.session.mockReturnValue(query);
  return query;
};

const createChallenge = () =>
  new AuthChallenge({
    _id: new Types.ObjectId(body.challengeId),
    purpose: 'login',
    walletAddress: WALLET_ADDRESS,
    nonce: 'n'.repeat(43),
    message: 'Canonical login message',
    expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    purgeAt: new Date('2026-07-27T12:05:00.000Z'),
  });

const createUser = (accountType: 'regular' | 'creator' = 'regular') => {
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

describe('loginUser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:01:00.000Z'));
    createAuthSessionMock.mockReset();
    verifySignatureMock.mockReset();
    vi.spyOn(mongoose.connection, 'transaction').mockImplementation(async (operation) =>
      operation(databaseSession),
    );
    verifySignatureMock.mockReturnValue(true);
    createAuthSessionMock.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshTokenExpiresAt: new Date('2026-08-26T12:01:00.000Z'),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('verifies and atomically consumes a login challenge before creating a session', async () => {
    const challenge = createChallenge();
    const user = createUser();
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    const consumeSpy = vi
      .spyOn(AuthChallenge, 'findOneAndUpdate')
      .mockReturnValue(queryResult(challenge) as never);

    const result = await loginUser(body);

    expect(result).toMatchObject({
      ok: true,
      user: { username: 'regular_user', accountType: 'regular', creatorProfile: null },
      auth: { accessToken: 'access-token', refreshToken: 'refresh-token' },
    });
    expect(verifySignatureMock).toHaveBeenCalledWith(WALLET_ADDRESS, challenge.message, SIGNATURE);
    expect(consumeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: challenge._id, purpose: 'login', usedAt: null }),
      { $set: { usedAt: new Date('2026-07-27T12:01:00.000Z') } },
      { new: true, session: databaseSession },
    );
    expect(createAuthSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: user._id, role: 'user', accountType: 'regular' }),
      databaseSession,
    );
  });

  it('includes creator-only profile data in the shared login response', async () => {
    const challenge = createChallenge();
    const user = createUser('creator');
    const creatorProfile = new CreatorProfile({
      user: user._id,
      headline: 'Visual storyteller',
      categories: ['Photography'],
      skills: ['Editing'],
      isAvailableForWork: true,
    });
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(CreatorProfile, 'findOne').mockReturnValue(queryResult(creatorProfile) as never);
    vi.spyOn(AuthChallenge, 'findOneAndUpdate').mockReturnValue(queryResult(challenge) as never);

    const result = await loginUser(body);

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
  });

  it('counts invalid signatures without looking up the user or creating a session', async () => {
    const challenge = createChallenge();
    challenge.attempts = 1;
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);
    verifySignatureMock.mockReturnValue(false);
    const updateSpy = vi
      .spyOn(AuthChallenge, 'updateOne')
      .mockReturnValue(queryResult({ modifiedCount: 1 }) as never);
    const userSpy = vi.spyOn(User, 'findOne');

    const result = await loginUser(body);

    expect(result).toEqual({ ok: false, reason: 'invalid_signature', attemptsRemaining: 3 });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: challenge._id, usedAt: null }),
      { $inc: { attempts: 1 } },
      { session: databaseSession },
    );
    expect(userSpy).not.toHaveBeenCalled();
    expect(createAuthSessionMock).not.toHaveBeenCalled();
  });

  it('rejects replay of a consumed challenge before signature verification', async () => {
    const challenge = createChallenge();
    challenge.usedAt = new Date('2026-07-27T12:00:30.000Z');
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);

    const result = await loginUser(body);

    expect(result).toEqual({ ok: false, reason: 'challenge_already_used' });
    expect(verifySignatureMock).not.toHaveBeenCalled();
  });
});
