import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MAX_AUTH_CHALLENGE_ATTEMPTS } from '../../src/constant/auth';
import AuthChallenge from '../../src/models/AuthChallenge';
import verifyRegistrationChallenge from '../../src/utils/auth/verifyRegistrationChallenge';

const keypair = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9));
const message = 'Canonical BeSeen registration message';
const validSignature = keypair.signMessage(message).toString('base64');
const challengeId = '507f1f77bcf86cd799439011';

const createChallenge = (overrides: Record<string, unknown> = {}) => {
  return new AuthChallenge({
    _id: challengeId,
    purpose: 'registration',
    walletAddress: keypair.publicKey(),
    nonce: 'n'.repeat(43),
    message,
    signingPublicKey: Buffer.alloc(32, 1).toString('base64'),
    encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
    derivationVersion: 1,
    expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    purgeAt: new Date('2026-07-27T12:05:00.000Z'),
    ...overrides,
  });
};

const mockQueryResult = <T>(value: T) => ({
  exec: vi.fn().mockResolvedValue(value),
});

describe('verifyRegistrationChallenge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('atomically consumes a valid challenge and returns a short-lived token', async () => {
    const challenge = createChallenge();
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(mockQueryResult(challenge) as never);
    const consumeSpy = vi
      .spyOn(AuthChallenge, 'findOneAndUpdate')
      .mockReturnValue(mockQueryResult(challenge) as never);

    const result = await verifyRegistrationChallenge({
      challengeId,
      signature: validSignature,
    });

    expect(result).toMatchObject({
      ok: true,
      expiresAt: new Date('2026-07-27T12:10:00.000Z'),
    });

    if (result.ok) {
      expect(result.registrationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(consumeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: challenge._id,
          usedAt: null,
          expiresAt: { $gt: new Date('2026-07-27T12:00:00.000Z') },
        }),
        expect.objectContaining({
          $set: expect.objectContaining({
            registrationTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            registrationTokenExpiresAt: new Date('2026-07-27T12:10:00.000Z'),
            purgeAt: new Date('2026-07-27T12:10:00.000Z'),
          }),
        }),
        { new: true },
      );

      const update = consumeSpy.mock.calls[0]?.[1] as {
        $set: { registrationTokenHash: string };
      };
      expect(update.$set.registrationTokenHash).not.toContain(result.registrationToken);
    }
  });

  it('increments attempts after an invalid signature', async () => {
    const challenge = createChallenge({ attempts: 2 });
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(mockQueryResult(challenge) as never);
    const updateSpy = vi
      .spyOn(AuthChallenge, 'updateOne')
      .mockReturnValue(mockQueryResult({ acknowledged: true }) as never);

    const result = await verifyRegistrationChallenge({
      challengeId,
      signature: Buffer.alloc(64).toString('base64'),
    });

    expect(result).toEqual({
      ok: false,
      reason: 'invalid_signature',
      attemptsRemaining: 2,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ attempts: { $lt: MAX_AUTH_CHALLENGE_ATTEMPTS } }),
      { $inc: { attempts: 1 } },
    );
  });

  it('rejects expired, used, and exhausted challenges before verification', async () => {
    const states = [
      {
        challenge: createChallenge({ expiresAt: new Date('2026-07-27T11:59:59.000Z') }),
        reason: 'challenge_expired',
      },
      {
        challenge: createChallenge({ usedAt: new Date('2026-07-27T11:59:00.000Z') }),
        reason: 'challenge_already_used',
      },
      {
        challenge: createChallenge({ attempts: MAX_AUTH_CHALLENGE_ATTEMPTS }),
        reason: 'attempts_exceeded',
      },
    ] as const;

    for (const state of states) {
      vi.spyOn(AuthChallenge, 'findOne').mockReturnValueOnce(
        mockQueryResult(state.challenge) as never,
      );

      await expect(
        verifyRegistrationChallenge({ challengeId, signature: validSignature }),
      ).resolves.toEqual({ ok: false, reason: state.reason });
    }
  });

  it('returns not found for unknown challenge IDs', async () => {
    vi.spyOn(AuthChallenge, 'findOne').mockReturnValue(mockQueryResult(null) as never);

    await expect(
      verifyRegistrationChallenge({ challengeId, signature: validSignature }),
    ).resolves.toEqual({ ok: false, reason: 'challenge_not_found' });
  });
});
