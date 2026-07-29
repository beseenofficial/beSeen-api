import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withDatabaseTransaction } from '../../src/db';
import AuthSession from '../../src/models/AuthSession';
import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import UserToken from '../../src/models/UserToken';
import registerUser from '../../src/utils/auth/registerUser';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));

const WALLET = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const transactionMock = vi.mocked(withDatabaseTransaction);
let savedDerivationVersion: number | undefined;
const body = {
  walletAddress: WALLET,
  username: 'sample_user',
  avatar: null,
  keys: {
    signing: {
      algorithm: 'Ed25519' as const,
      publicKey: Buffer.alloc(32, 1).toString('base64'),
    },
    encryption: {
      algorithm: 'X25519' as const,
      publicKey: Buffer.alloc(32, 2).toString('base64'),
    },
  },
};

const existsResult = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('registerUser', () => {
  beforeEach(() => {
    savedDerivationVersion = undefined;
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation({} as never));
    vi.spyOn(User, 'exists').mockReturnValue(existsResult(null) as never);
    vi.spyOn(UserKey, 'exists').mockReturnValue(existsResult(null) as never);
    vi.spyOn(User.prototype, 'save').mockImplementation(async function saveUser() {
      this.createdAt = new Date('2026-07-29T00:00:00.000Z');
      return this;
    });
    vi.spyOn(UserKey.prototype, 'save').mockImplementation(async function saveUserKey() {
      savedDerivationVersion = this.derivationVersion;
      return this;
    });
    vi.spyOn(UserToken.prototype, 'save').mockImplementation(async function saveUserToken() {
      return this;
    });
    vi.spyOn(AuthSession.prototype, 'save').mockImplementation(async function saveSession() {
      return this;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('stores the format-validated client-declared wallet and public keys', async () => {
    const result = await registerUser(body);

    expect(result).toMatchObject({
      ok: true,
      user: { username: 'sample_user', avatar: null },
      auth: { tokenType: 'Bearer' },
    });
    expect(UserKey.prototype.save).toHaveBeenCalledOnce();
    expect(UserToken.prototype.save).toHaveBeenCalledOnce();
    expect(savedDerivationVersion).toBe(1);
  });
});
