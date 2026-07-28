import mongoose, { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthChallenge from '../../src/models/AuthChallenge';
import CreatorProfile from '../../src/models/CreatorProfile';
import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import createAuthSession from '../../src/utils/auth/createAuthSession';
import registerUser from '../../src/utils/auth/registerUser';
import { verifySep10Challenge } from '../../src/utils/stellar/sep10Challenge';
import registerBodySchema from '../../src/validation/auth/register';

vi.mock('../../src/utils/auth/createAuthSession', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/stellar/sep10Challenge', () => ({
  isCanonicalBase64Xdr: (value: string) =>
    value.length > 0 && Buffer.from(value, 'base64').toString('base64') === value,
  verifySep10Challenge: vi.fn(),
}));

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');
const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');
const SIGNED_XDR = Buffer.alloc(64, 3).toString('base64');
const session = {} as ClientSession;
const challengeId = new Types.ObjectId();

const regularBody = registerBodySchema.parse({
  challengeId: challengeId.toString(),
  signedTransactionXdr: SIGNED_XDR,
  profile: { username: 'regular_user', displayName: 'Regular User', accountType: 'regular' },
});

const creatorBody = registerBodySchema.parse({
  ...regularBody,
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

const createChallenge = () =>
  new AuthChallenge({
    _id: challengeId,
    purpose: 'registration',
    walletAddress: WALLET_ADDRESS,
    nonce: 'n'.repeat(43),
    transactionXdr: 'AAAA',
    serverSigningPublicKey: WALLET_ADDRESS,
    stellarNetwork: 'testnet',
    authDomain: 'beseen.app',
    signingPublicKey: SIGNING_PUBLIC_KEY,
    encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
    derivationVersion: 1,
    expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    purgeAt: new Date('2026-07-27T12:05:00.000Z'),
  });

const queryResult = <T>(value: T) => {
  const query = { session: vi.fn(), exec: vi.fn().mockResolvedValue(value) };
  query.session.mockReturnValue(query);
  return query;
};

const mockAvailableRegistration = (challenge: InstanceType<typeof AuthChallenge>) => {
  vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);
  vi.spyOn(User, 'exists')
    .mockReturnValueOnce(queryResult(null) as never)
    .mockReturnValueOnce(queryResult(null) as never);
  vi.spyOn(UserKey, 'exists').mockReturnValue(queryResult(null) as never);
  return vi
    .spyOn(AuthChallenge, 'findOneAndUpdate')
    .mockReturnValue(queryResult(challenge) as never);
};

describe('registerUser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:01:00.000Z'));
    vi.mocked(verifySep10Challenge).mockReset().mockReturnValue(true);
    vi.mocked(createAuthSession)
      .mockReset()
      .mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: new Date('2026-08-26T12:01:00.000Z'),
      });
    vi.spyOn(mongoose.connection, 'transaction').mockImplementation(async (operation) =>
      operation(session),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('consumes the SEP-10 challenge and creates a regular user with bound keys', async () => {
    const challenge = createChallenge();
    const consumeSpy = mockAvailableRegistration(challenge);
    const userSaveSpy = vi.spyOn(User.prototype, 'save').mockImplementation(async function save() {
      this.createdAt = new Date('2026-07-27T12:01:00.000Z');
      return this;
    });
    vi.spyOn(UserKey.prototype, 'save').mockImplementation(async function save() {
      return this;
    });

    const result = await registerUser(regularBody);

    expect(result).toMatchObject({
      ok: true,
      user: { walletAddress: WALLET_ADDRESS, username: 'regular_user', creatorProfile: null },
    });
    expect(verifySep10Challenge).toHaveBeenCalledWith(
      expect.objectContaining({
        signedTransactionXdr: SIGNED_XDR,
        storedTransactionXdr: challenge.transactionXdr,
        walletAddress: WALLET_ADDRESS,
      }),
    );
    expect(consumeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: challenge._id, purpose: 'registration', usedAt: null }),
      { $set: { usedAt: new Date('2026-07-27T12:01:00.000Z') } },
      { new: true, session },
    );
    expect(userSaveSpy).toHaveBeenCalledWith({ session });
  });

  it('creates a creator profile in the same transaction', async () => {
    mockAvailableRegistration(createChallenge());
    vi.spyOn(User.prototype, 'save').mockImplementation(async function save() {
      this.createdAt = new Date('2026-07-27T12:01:00.000Z');
      return this;
    });
    vi.spyOn(UserKey.prototype, 'save').mockImplementation(async function save() {
      return this;
    });
    const creatorSaveSpy = vi
      .spyOn(CreatorProfile.prototype, 'save')
      .mockImplementation(async function save() {
        return this;
      });

    const result = await registerUser(creatorBody);
    expect(result).toMatchObject({
      ok: true,
      user: { accountType: 'creator', creatorProfile: { categories: ['photography'] } },
    });
    expect(creatorSaveSpy).toHaveBeenCalledWith({ session });
  });

  it('counts an invalid SEP-10 transaction before conflict checks', async () => {
    const challenge = createChallenge();
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);
    vi.mocked(verifySep10Challenge).mockReturnValue(false);
    vi.spyOn(AuthChallenge, 'updateOne').mockReturnValue(
      queryResult({ modifiedCount: 1 }) as never,
    );
    const userSpy = vi.spyOn(User, 'exists');

    const result = await registerUser(regularBody);
    expect(result).toEqual({ ok: false, reason: 'invalid_challenge', attemptsRemaining: 4 });
    expect(userSpy).not.toHaveBeenCalled();
  });

  it('returns username conflicts without consuming the challenge', async () => {
    const challenge = createChallenge();
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(queryResult(challenge) as never);
    vi.spyOn(User, 'exists')
      .mockReturnValueOnce(queryResult(null) as never)
      .mockReturnValueOnce(queryResult({ _id: new Types.ObjectId() }) as never);
    const consumeSpy = vi.spyOn(AuthChallenge, 'findOneAndUpdate');

    expect(await registerUser(regularBody)).toEqual({ ok: false, reason: 'username_taken' });
    expect(consumeSpy).not.toHaveBeenCalled();
  });
});
