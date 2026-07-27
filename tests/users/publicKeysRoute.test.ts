import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import getPublicUserKeys from '../../src/utils/user/getPublicUserKeys';

vi.mock('../../src/utils/user/getPublicUserKeys', () => ({
  default: vi.fn(),
}));

const getPublicUserKeysMock = vi.mocked(getPublicUserKeys);

describe('GET /v1/users/:username/keys', () => {
  beforeEach(() => {
    getPublicUserKeysMock.mockReset();
  });

  it('returns only active public keys without authentication or wallet data', async () => {
    getPublicUserKeysMock.mockResolvedValue({
      ok: true,
      user: { id: '507f1f77bcf86cd799439011', username: 'recipient_user' },
      keys: {
        derivationVersion: 1,
        signing: { algorithm: 'Ed25519', publicKey: Buffer.alloc(32, 1).toString('base64') },
        encryption: { algorithm: 'X25519', publicKey: Buffer.alloc(32, 2).toString('base64') },
      },
    });

    const response = await request(app).get('/v1/users/Recipient_User/keys');

    expect(response.status).toBe(200);
    expect(response.body.result).not.toHaveProperty('walletAddress');
    expect(response.body.result.keys).toMatchObject({
      derivationVersion: 1,
      signing: { algorithm: 'Ed25519' },
      encryption: { algorithm: 'X25519' },
    });
    expect(getPublicUserKeysMock).toHaveBeenCalledWith('recipient_user');
  });

  it('returns stable not-found errors', async () => {
    getPublicUserKeysMock.mockResolvedValue({ ok: false, reason: 'active_keys_not_found' });

    const response = await request(app).get('/v1/users/recipient_user/keys');

    expect(response.status).toBe(404);
    expect(response.body.result.code).toBe('ACTIVE_KEYS_NOT_FOUND');
  });
});
