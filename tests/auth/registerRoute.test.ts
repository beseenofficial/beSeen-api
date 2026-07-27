import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import registerUser from '../../src/utils/auth/registerUser';

vi.mock('../../src/utils/auth/registerUser', () => ({
  default: vi.fn(),
}));

const registerUserMock = vi.mocked(registerUser);

const regularBody = () => ({
  registrationToken: 't'.repeat(43),
  profile: {
    username: '  New_User  ',
    displayName: 'New User',
    bio: 'BeSeen member',
    avatarUrl: 'https://cdn.beseen.app/avatar.webp',
    accountType: 'regular',
  },
});

const creatorBody = () => ({
  registrationToken: 'c'.repeat(43),
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
  beforeEach(() => {
    registerUserMock.mockReset();
  });

  it('creates a regular user with normalized profile data', async () => {
    registerUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        username: 'new_user',
        displayName: 'New User',
        bio: 'BeSeen member',
        avatarUrl: 'https://cdn.beseen.app/avatar.webp',
        accountType: 'regular',
        creatorProfile: null,
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    const response = await request(app).post('/v1/auth/register').send(regularBody());

    expect(response.status).toBe(201);
    expect(response.body.result.user).toMatchObject({
      username: 'new_user',
      accountType: 'regular',
      creatorProfile: null,
      createdAt: '2026-07-27T12:00:00.000Z',
    });
    expect(registerUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ username: 'new_user', bio: 'BeSeen member' }),
      }),
    );
  });

  it('normalizes and forwards creator-only profile data', async () => {
    registerUserMock.mockResolvedValue({
      ok: true,
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

    const response = await request(app).post('/v1/auth/register').send(creatorBody());

    expect(response.status).toBe(201);
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

  it('rejects missing creator profiles and reserved usernames before database access', async () => {
    const missingCreatorProfile = creatorBody();
    Reflect.deleteProperty(missingCreatorProfile.profile, 'creatorProfile');

    const creatorResponse = await request(app)
      .post('/v1/auth/register')
      .send(missingCreatorProfile);
    const reservedResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        ...regularBody(),
        profile: { ...regularBody().profile, username: 'admin' },
      });

    expect(creatorResponse.status).toBe(400);
    expect(creatorResponse.body.result.issues).toContainEqual({
      path: 'profile.creatorProfile',
      message: 'Creator profile is required for creator accounts',
    });
    expect(reservedResponse.status).toBe(400);
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('maps invalid tokens and profile conflicts to stable errors', async () => {
    registerUserMock.mockResolvedValueOnce({
      ok: false,
      reason: 'registration_token_invalid',
    });

    const tokenResponse = await request(app).post('/v1/auth/register').send(regularBody());

    registerUserMock.mockResolvedValueOnce({
      ok: false,
      reason: 'username_taken',
    });

    const usernameResponse = await request(app).post('/v1/auth/register').send(regularBody());

    expect(tokenResponse.status).toBe(401);
    expect(tokenResponse.body.result.code).toBe('REGISTRATION_TOKEN_INVALID');
    expect(usernameResponse.status).toBe(409);
    expect(usernameResponse.body.result.code).toBe('USERNAME_TAKEN');
  });
});
