import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import registerUser from '../../src/utils/auth/registerUser';

vi.mock('../../src/utils/auth/registerUser', () => ({ default: vi.fn() }));

const registerUserMock = vi.mocked(registerUser);
const SIGNED_XDR = Buffer.alloc(64, 3).toString('base64');

const authResult = () => ({
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
  refreshTokenExpiresAt: new Date('2026-08-26T12:00:00.000Z'),
});

const regularBody = () => ({
  challengeId: '507f1f77bcf86cd799439099',
  signedTransactionXdr: SIGNED_XDR,
  profile: {
    username: '  New_User  ',
    displayName: 'New User',
    bio: 'BeSeen member',
    avatarUrl: 'https://cdn.beseen.app/avatar.webp',
    accountType: 'regular',
  },
});

const creatorBody = () => ({
  ...regularBody(),
  profile: {
    username: 'creator_user',
    displayName: 'Creator User',
    accountType: 'creator',
    creatorProfile: {
      headline: 'Visual storyteller',
      categories: [' Photography ', 'Art'],
      skills: ['Editing'],
      websiteUrl: 'https://creator.example',
      isAvailableForWork: true,
    },
  },
});

describe('POST /v1/auth/register', () => {
  beforeEach(() => registerUserMock.mockReset());

  it('creates a regular user from one signed SEP-10 challenge', async () => {
    registerUserMock.mockResolvedValue({
      ok: true,
      auth: authResult(),
      user: {
        id: '507f1f77bcf86cd799439011',
        walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        username: 'new_user',
        displayName: 'New User',
        bio: 'BeSeen member',
        avatarUrl: null,
        accountType: 'regular',
        creatorProfile: null,
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    const response = await request(app).post('/v1/auth/register').send(regularBody());

    expect(response.status).toBe(201);
    expect(response.body.result.user.username).toBe('new_user');
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: '507f1f77bcf86cd799439099',
        signedTransactionXdr: SIGNED_XDR,
        profile: expect.objectContaining({ username: 'new_user' }),
      }),
    );
  });

  it('normalizes creator-only profile data', async () => {
    registerUserMock.mockResolvedValue({
      ok: true,
      auth: authResult(),
      user: {
        id: '507f1f77bcf86cd799439012',
        walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        username: 'creator_user',
        displayName: 'Creator User',
        bio: '',
        avatarUrl: null,
        accountType: 'creator',
        creatorProfile: {
          headline: 'Visual storyteller',
          categories: ['photography', 'art'],
          skills: ['editing'],
          websiteUrl: 'https://creator.example',
          isAvailableForWork: true,
        },
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    expect((await request(app).post('/v1/auth/register').send(creatorBody())).status).toBe(201);
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          creatorProfile: expect.objectContaining({
            categories: ['photography', 'art'],
            skills: ['editing'],
          }),
        }),
      }),
    );
  });

  it('rejects missing or malformed SEP-10 input before database access', async () => {
    const missing = await request(app)
      .post('/v1/auth/register')
      .send({ profile: regularBody().profile });
    const malformed = await request(app)
      .post('/v1/auth/register')
      .send({ ...regularBody(), signedTransactionXdr: 'not-xdr' });

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('maps invalid challenges and username conflicts to stable errors', async () => {
    registerUserMock.mockResolvedValueOnce({
      ok: false,
      reason: 'invalid_challenge',
      attemptsRemaining: 4,
    });
    const invalid = await request(app).post('/v1/auth/register').send(regularBody());

    registerUserMock.mockResolvedValueOnce({ ok: false, reason: 'username_taken' });
    const conflict = await request(app).post('/v1/auth/register').send(regularBody());

    expect(invalid.status).toBe(401);
    expect(invalid.body.result).toEqual({
      code: 'INVALID_SEP10_CHALLENGE',
      attemptsRemaining: 4,
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.result.code).toBe('USERNAME_TAKEN');
  });
});
