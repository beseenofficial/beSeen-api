import mongoose, { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthChallenge from '../../src/models/AuthChallenge';
import CreatorProfile from '../../src/models/CreatorProfile';
import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import createAuthSession from '../../src/utils/auth/createAuthSession';
import registerUser from '../../src/utils/auth/registerUser';
import { hashRegistrationToken } from '../../src/utils/auth/registrationToken';
import verifySep53Signature from '../../src/utils/stellar/verifySep53Signature';
import registerBodySchema from '../../src/validation/auth/register';

vi.mock('../../src/utils/auth/createAuthSession', () => ({
  default: vi.fn(),
}));
vi.mock('../../src/utils/stellar/verifySep53Signature', () => ({
  default: vi.fn(),
}));

const createAuthSessionMock = vi.mocked(createAuthSession);
const verifySep53SignatureMock = vi.mocked(verifySep53Signature);

const REGISTRATION_TOKEN = 'r'.repeat(43);
const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');
const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');
const STELLAR_SIGNATURE = Buffer.alloc(64, 3).toString('base64');
const session = {} as ClientSession;

const regularBody = registerBodySchema.parse({
  registrationToken: REGISTRATION_TOKEN,
  profile: {
    username: 'regular_user',
    displayName: 'Regular User',
    accountType: 'regular',
  },
});

const creatorBody = registerBodySchema.parse({
  registrationToken: REGISTRATION_TOKEN,
  profile: {
    username: 'creator_user',
    displayName: 'Creator User',
    accountType: 'creator',
    creatorProfile: {
      headline: 'Visual storyteller',
      categories: ['Photography'],
      skills: ['Editing'],
      websiteUrl: 'https://creator.example',
      isAvailableForWork: true,
    },
  },
});

const directBody = registerBodySchema.parse({
  challengeId: new Types.ObjectId().toString(),
  signature: STELLAR_SIGNATURE,
  profile: {
    username: 'direct_user',
    displayName: 'Direct User',
    accountType: 'regular',
  },
});

const createChallenge = () =>
  new AuthChallenge({
    _id: new Types.ObjectId(),
    purpose: 'registration',
    walletAddress: WALLET_ADDRESS,
    nonce: 'n'.repeat(43),
    message: 'Canonical registration message',
    signingPublicKey: SIGNING_PUBLIC_KEY,
    encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
    derivationVersion: 1,
    expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    purgeAt: new Date('2026-07-27T12:10:00.000Z'),
    usedAt: new Date('2026-07-27T12:00:00.000Z'),
    registrationTokenHash: hashRegistrationToken(REGISTRATION_TOKEN),
    registrationTokenExpiresAt: new Date('2026-07-27T12:10:00.000Z'),
  });

const mockQueryResult = <T>(value: T) => {
  const query = {
    select: vi.fn(),
    session: vi.fn(),
    exec: vi.fn().mockResolvedValue(value),
  };
  query.select.mockReturnValue(query);
  query.session.mockReturnValue(query);
  return query;
};

const mockTransaction = () => {
  vi.spyOn(mongoose.connection, 'transaction').mockImplementation(async (operation) => {
    return operation(session);
  });
};

const mockAvailableRegistration = (challenge: InstanceType<typeof AuthChallenge>) => {
  vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(mockQueryResult(challenge) as never);
  vi.spyOn(User, 'exists')
    .mockReturnValueOnce(mockQueryResult(null) as never)
    .mockReturnValueOnce(mockQueryResult(null) as never);
  vi.spyOn(UserKey, 'exists').mockReturnValue(mockQueryResult(null) as never);
  return vi
    .spyOn(AuthChallenge, 'findOneAndUpdate')
    .mockReturnValue(mockQueryResult(challenge) as never);
};

describe('registerUser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:01:00.000Z'));
    mockTransaction();
    verifySep53SignatureMock.mockReturnValue(true);
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

  it('atomically consumes the token and creates a regular user with its keys', async () => {
    const challenge = createChallenge();
    const consumeSpy = mockAvailableRegistration(challenge);
    const userSaveSpy = vi
      .spyOn(User.prototype, 'save')
      .mockImplementation(async function saveUser() {
        this.createdAt = new Date('2026-07-27T12:01:00.000Z');
        return this;
      });
    const userKeySaveSpy = vi
      .spyOn(UserKey.prototype, 'save')
      .mockImplementation(async function saveUserKey() {
        return this;
      });
    const creatorSaveSpy = vi.spyOn(CreatorProfile.prototype, 'save');

    const result = await registerUser(regularBody);

    expect(result).toMatchObject({
      ok: true,
      auth: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
      user: {
        walletAddress: WALLET_ADDRESS,
        username: 'regular_user',
        accountType: 'regular',
        creatorProfile: null,
      },
    });
    expect(consumeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        registrationTokenHash: hashRegistrationToken(REGISTRATION_TOKEN),
        registrationTokenUsedAt: null,
      }),
      { $set: { registrationTokenUsedAt: new Date('2026-07-27T12:01:00.000Z') } },
      { new: true, session },
    );
    expect(userSaveSpy).toHaveBeenCalledWith({ session });
    expect(userKeySaveSpy).toHaveBeenCalledWith({ session });
    expect(creatorSaveSpy).not.toHaveBeenCalled();
    expect(createAuthSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ accountType: 'regular', role: 'user' }),
      session,
    );
    expect(consumeSpy.mock.invocationCallOrder[0]).toBeLessThan(
      userSaveSpy.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('creates a creator profile in the same transaction', async () => {
    mockAvailableRegistration(createChallenge());
    vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      this.createdAt = new Date('2026-07-27T12:01:00.000Z');
      return this;
    });
    vi.spyOn(UserKey.prototype, 'save').mockImplementation(async function saveUserKey() {
      return this;
    });
    const creatorSaveSpy = vi
      .spyOn(CreatorProfile.prototype, 'save')
      .mockImplementation(async function saveCreatorProfile() {
        return this;
      });

    const result = await registerUser(creatorBody);

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

  it('verifies and consumes a signed challenge without a temporary registration token', async () => {
    const challenge = createChallenge();
    challenge.usedAt = null;
    challenge.expiresAt = new Date('2026-07-27T12:05:00.000Z');
    const consumeSpy = mockAvailableRegistration(challenge);
    vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      this.createdAt = new Date('2026-07-27T12:01:00.000Z');
      return this;
    });
    vi.spyOn(UserKey.prototype, 'save').mockImplementation(async function saveUserKey() {
      return this;
    });

    const result = await registerUser({ ...directBody, challengeId: challenge._id.toString() });

    expect(result.ok).toBe(true);
    expect(verifySep53SignatureMock).toHaveBeenCalledWith(
      WALLET_ADDRESS,
      challenge.message,
      STELLAR_SIGNATURE,
    );
    expect(consumeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: challenge._id,
        purpose: 'registration',
        usedAt: null,
      }),
      { $set: { usedAt: new Date('2026-07-27T12:01:00.000Z') } },
      { new: true, session },
    );
  });

  it('rejects invalid tokens before checking profile conflicts', async () => {
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(mockQueryResult(null) as never);
    const userExistsSpy = vi.spyOn(User, 'exists');

    const result = await registerUser(regularBody);

    expect(result).toEqual({ ok: false, reason: 'registration_token_invalid' });
    expect(userExistsSpy).not.toHaveBeenCalled();
  });

  it('returns username conflicts without consuming the token', async () => {
    const challenge = createChallenge();
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(mockQueryResult(challenge) as never);
    vi.spyOn(User, 'exists')
      .mockReturnValueOnce(mockQueryResult(null) as never)
      .mockReturnValueOnce(mockQueryResult({ _id: new Types.ObjectId() }) as never);
    const consumeSpy = vi.spyOn(AuthChallenge, 'findOneAndUpdate');

    const result = await registerUser(regularBody);

    expect(result).toEqual({ ok: false, reason: 'username_taken' });
    expect(consumeSpy).not.toHaveBeenCalled();
  });
});
