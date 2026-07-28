import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthChallenge from '../../src/models/AuthChallenge';
import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import createRegistrationChallenge from '../../src/utils/auth/createRegistrationChallenge';
import type { RegistrationChallengeBody } from '../../src/validation/auth/registrationChallenge';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');
const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');

const body: RegistrationChallengeBody = {
  walletAddress: WALLET_ADDRESS,
  keys: {
    derivationVersion: 1,
    signing: {
      algorithm: 'Ed25519',
      publicKey: SIGNING_PUBLIC_KEY,
    },
    encryption: {
      algorithm: 'X25519',
      publicKey: ENCRYPTION_PUBLIC_KEY,
    },
  },
};

describe('createRegistrationChallenge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('builds and persists a five-minute key-binding challenge', async () => {
    vi.spyOn(User, 'exists').mockResolvedValue(null);
    vi.spyOn(UserKey, 'exists').mockResolvedValue(null);

    const challengeId = new Types.ObjectId();
    const createSpy = vi.spyOn(AuthChallenge, 'create').mockImplementation(async (input) => {
      const challenge = new AuthChallenge(input);
      challenge._id = challengeId;
      return challenge as never;
    });

    const result = await createRegistrationChallenge(body);

    expect(result).toMatchObject({
      ok: true,
      challengeId: challengeId.toString(),
      expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'registration',
        walletAddress: WALLET_ADDRESS,
        signingPublicKey: SIGNING_PUBLIC_KEY,
        encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
        derivationVersion: 1,
        expiresAt: new Date('2026-07-27T12:05:00.000Z'),
        purgeAt: new Date('2026-07-27T12:05:00.000Z'),
      }),
    );

    if (result.ok) {
      expect(result.transactionXdr).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.networkPassphrase).toBeTruthy();
      expect(result.serverSigningPublicKey).toMatch(/^G[A-Z2-7]{55}$/);
      expect(result.homeDomain).toBeTruthy();
    }
  });

  it('stops when the wallet is already registered', async () => {
    vi.spyOn(User, 'exists').mockResolvedValue({ _id: new Types.ObjectId() });
    const userKeySpy = vi.spyOn(UserKey, 'exists');
    const createSpy = vi.spyOn(AuthChallenge, 'create');

    const result = await createRegistrationChallenge(body);

    expect(result).toEqual({ ok: false, reason: 'wallet_already_registered' });
    expect(userKeySpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('stops when either BeSeen public key is already registered', async () => {
    vi.spyOn(User, 'exists').mockResolvedValue(null);
    vi.spyOn(UserKey, 'exists').mockResolvedValue({ _id: new Types.ObjectId() });
    const createSpy = vi.spyOn(AuthChallenge, 'create');

    const result = await createRegistrationChallenge(body);

    expect(result).toEqual({ ok: false, reason: 'public_key_already_registered' });
    expect(createSpy).not.toHaveBeenCalled();
  });
});
