import { generateKeyPairSync, sign } from 'node:crypto';

import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import AuthProof from '../../src/models/AuthProof';
import { withDatabaseTransaction } from '../../src/db';
import AuthSession from '../../src/models/AuthSession';
import loginUser from '../../src/utils/auth/loginUser';
import buildLoginProofMessage from '../../src/utils/auth/buildLoginProofMessage';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));

const WALLET = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const REQUEST_ID = '2f2b1762-f0f5-4b1b-8acd-70afcf043365';

const NOW = new Date('2026-07-28T12:00:00.000Z');

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

const transactionMock = vi.mocked(withDatabaseTransaction);

const { privateKey, publicKey } = generateKeyPairSync('ed25519');

const rawPublicKey = publicKey
  .export({ type: 'spki', format: 'der' })
  .subarray(-32)
  .toString('base64');

const signedBody = (issuedAt = NOW.toISOString()) => {
  const unsigned = {
    walletAddress: WALLET,
    requestId: REQUEST_ID,
    issuedAt,
  };

  return {
    ...unsigned,
    signature: sign(
      null,
      Buffer.from(buildLoginProofMessage(unsigned), 'utf8'),
      privateKey,
    ).toString('base64'),
  };
};

describe('loginUser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation({} as never));

    const user = new User({
      _id: new Types.ObjectId(),
      walletAddress: WALLET,
      username: 'sample_user',
      avatar: null,
      createdAt: NOW,
    });
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.spyOn(UserKey, 'findOne').mockReturnValue(
      queryResult({ user: user._id, signingPublicKey: rawPublicKey }) as never,
    );
    vi.spyOn(AuthProof.prototype, 'save').mockResolvedValue(undefined as never);
    vi.spyOn(AuthSession.prototype, 'save').mockImplementation(async function saveSession() {
      return this;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('accepts a fresh proof signed by the stored derived key', async () => {
    const result = await loginUser(signedBody());

    expect(result).toMatchObject({
      ok: true,
      user: { username: 'sample_user', avatar: null },
      auth: { tokenType: 'Bearer' },
    });
    expect(AuthProof.prototype.save).toHaveBeenCalledOnce();
  });

  it('rejects an invalid signature before starting a transaction', async () => {
    const result = await loginUser({
      ...signedBody(),
      signature: Buffer.alloc(64, 1).toString('base64'),
    });

    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects stale proofs before reading the account', async () => {
    const result = await loginUser(signedBody('2026-07-28T11:54:59.000Z'));

    expect(result).toEqual({ ok: false, reason: 'proof_expired' });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('maps the unique proof constraint to a replay error', async () => {
    const duplicateError = Object.assign(new Error('duplicate proof'), { code: 11_000 });
    transactionMock.mockRejectedValueOnce(duplicateError);

    await expect(loginUser(signedBody())).resolves.toEqual({
      ok: false,
      reason: 'proof_replayed',
    });
  });
});
