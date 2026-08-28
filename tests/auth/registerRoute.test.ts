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
  keys: {
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
        avatar: 'https://cdn.beseen.fi/avatar.webp',
        bio: null,
        verification: { isVerified: false, grantedAt: null, expiresAt: null },
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
      avatar: 'https://cdn.beseen.fi/avatar.webp',
      bio: null,
      verification: { isVerified: false, grantedAt: null, expiresAt: null },
      createdAt: '2026-07-27T12:00:00.000Z',
    });
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: WALLET, username: 'new_user' }),
      undefined,
    );
  });

  it('accepts the existing registration payload plus an avatar file', async () => {
    registerUserMock.mockResolvedValue({
      ok: false,
      reason: 'wallet_not_verified_by_blux',
    });

    const response = await request(app)
      .post('/v1/auth/register')
      .field('payload', JSON.stringify(validBody()))
      .attach('avatar', Buffer.from('image bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(403);
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: WALLET, username: 'new_user' }),
      expect.objectContaining({ fieldname: 'avatar', originalname: 'avatar.png' }),
    );
  });

  it('ignores bio during registration so it can only be set through profile editing', async () => {
    registerUserMock.mockResolvedValue({
      ok: false,
      reason: 'wallet_not_verified_by_blux',
    });

    const response = await request(app)
      .post('/v1/auth/register')
      .send({ ...validBody(), bio: 'Set this later' });

    expect(response.status).toBe(403);
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ bio: expect.anything() }),
      undefined,
    );
  });

  it('accepts multipart registration without an avatar file', async () => {
    registerUserMock.mockResolvedValue({
      ok: false,
      reason: 'wallet_not_verified_by_blux',
    });

    const response = await request(app)
      .post('/v1/auth/register')
      .field('payload', JSON.stringify(validBody()));

    expect(response.status).toBe(403);
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: WALLET, username: 'new_user' }),
      undefined,
    );
  });

  it('rejects an oversized avatar before calling the registration service', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .field('payload', JSON.stringify(validBody()))
      .attach('avatar', Buffer.alloc(5_242_881), {
        filename: 'too-large.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(413);
    expect(response.body.result).toEqual({
      code: 'AVATAR_TOO_LARGE',
      maxBytes: 5_242_880,
    });
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('rejects malformed multipart payload JSON', async () => {
    const response = await request(app)
      .post('/v1/auth/register')
      .field('payload', '{invalid')
      .attach('avatar', Buffer.from('image bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('ignores unknown top-level client fields instead of rejecting registration', async () => {
    registerUserMock.mockResolvedValue({
      ok: false,
      reason: 'wallet_not_verified_by_blux',
    });

    const response = await request(app)
      .post('/v1/auth/register')
      .send({
        ...validBody(),
        avatar: null,
        accountType: 'creator',
        category: 'ignored',
      });

    expect(response.status).toBe(403);
    expect(registerUserMock).toHaveBeenCalledWith(
      {
        walletAddress: WALLET,
        username: 'new_user',
        keys: validBody().keys,
      },
      undefined,
    );
  });

  it('rejects a client-supplied derivation version', async () => {
    const requestBody = validBody();

    const response = await request(app)
      .post('/v1/auth/register')
      .send({
        ...requestBody,
        keys: { ...requestBody.keys, derivationVersion: 1 },
      });

    expect(response.status).toBe(400);
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('maps registration conflicts', async () => {
    registerUserMock.mockResolvedValue({ ok: false, reason: 'username_taken' });
    const conflict = await request(app).post('/v1/auth/register').send(validBody());

    expect(conflict.status).toBe(409);
    expect(conflict.body.result.code).toBe('USERNAME_TAKEN');
  });

  it('returns a stable error when BLUX does not recognize the wallet', async () => {
    registerUserMock.mockResolvedValue({ ok: false, reason: 'wallet_not_verified_by_blux' });

    const response = await request(app).post('/v1/auth/register').send(validBody());

    expect(response.status).toBe(403);
    expect(response.body.result.code).toBe('WALLET_NOT_VERIFIED_BY_BLUX');
  });
});
