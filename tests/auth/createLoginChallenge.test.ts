import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthChallenge from '../../src/models/AuthChallenge';
import User from '../../src/models/User';
import createLoginChallenge from '../../src/utils/auth/createLoginChallenge';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('createLoginChallenge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates a five-minute challenge for an active account', async () => {
    vi.spyOn(User, 'exists').mockResolvedValue({ _id: new Types.ObjectId() });
    const challengeId = new Types.ObjectId();
    const createSpy = vi.spyOn(AuthChallenge, 'create').mockImplementation(async (input) => {
      const challenge = new AuthChallenge(input);
      challenge._id = challengeId;
      return challenge as never;
    });

    const result = await createLoginChallenge({ walletAddress: WALLET_ADDRESS });

    expect(result).toMatchObject({
      ok: true,
      challengeId: challengeId.toString(),
      expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'login',
        walletAddress: WALLET_ADDRESS,
        expiresAt: new Date('2026-07-27T12:05:00.000Z'),
        purgeAt: new Date('2026-07-27T12:05:00.000Z'),
      }),
    );
    if (result.ok) {
      expect(result.message).toContain('BeSeen Login\nVersion: 1');
      expect(result.message).toContain(`Account: ${WALLET_ADDRESS}`);
    }
  });

  it('does not create a challenge for an unavailable account', async () => {
    vi.spyOn(User, 'exists').mockResolvedValue(null);
    const createSpy = vi.spyOn(AuthChallenge, 'create');

    const result = await createLoginChallenge({ walletAddress: WALLET_ADDRESS });

    expect(result).toEqual({ ok: false, reason: 'account_unavailable' });
    expect(createSpy).not.toHaveBeenCalled();
  });
});
