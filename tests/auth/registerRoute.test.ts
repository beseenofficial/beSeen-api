import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import registerUser from '../../src/utils/auth/registerUser';

vi.mock('../../src/utils/auth/registerUser', () => ({ default: vi.fn() }));

const WALLET = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const registerUserMock = vi.mocked(registerUser);
const validBody = () => ({
  walletAddress: WALLET.toLowerCase(),
  username: '  New_User  ',
  avatar: 'https://cdn.beseen.app/avatar.webp',
  keys: {
    derivationVersion: 1,
    signing: { algorithm: 'Ed25519', publicKey: Buffer.alloc(32, 1).toString('base64') },
    encryption: { algorithm: 'X25519', publicKey: Buffer.alloc(32, 2).toString('base64') },
  },
});

describe('POST /v1/auth/register', () => {
  beforeEach(() => registerUserMock.mockReset());

  it('registers the minimal user in one request', async () => {
    registerUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        username: 'new_user',
        avatar: 'https://cdn.beseen.app/avatar.webp',
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
      auth: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: new Date('2026-08-26T12:00:00.000Z'),
      },
    });

    const response = await request(app).post('/v1/auth/register').send(validBody());
    expect(response.status).toBe(201);
    expect(response.body.result.user).toEqual({
      id: '507f1f77bcf86cd799439011',
      username: 'new_user',
      avatar: 'https://cdn.beseen.app/avatar.webp',
      createdAt: '2026-07-27T12:00:00.000Z',
    });
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: WALLET, username: 'new_user' }),
    );
  });

  it('rejects removed profile fields before service access', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .send({ ...validBody(), accountType: 'creator' });
    expect(response.status).toBe(400);
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('maps registration conflicts', async () => {
    registerUserMock.mockResolvedValue({ ok: false, reason: 'username_taken' });
    const conflict = await request(app).post('/v1/auth/register').send(validBody());

    expect(conflict.status).toBe(409);
    expect(conflict.body.result.code).toBe('USERNAME_TAKEN');
  });
});
