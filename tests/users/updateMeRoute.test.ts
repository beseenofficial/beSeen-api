import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import updateCurrentUser from '../../src/utils/user/updateCurrentUser';

vi.mock('../../src/utils/user/updateCurrentUser', () => ({ default: vi.fn() }));

const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const token = signAccessToken({ id: userId, role: 'user' }, sessionId);
const updateCurrentUserMock = vi.mocked(updateCurrentUser);

describe('PATCH /v1/users/me', () => {
  beforeEach(() => {
    updateCurrentUserMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('accepts a username-only JSON update without changing the avatar', async () => {
    updateCurrentUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: userId.toString(),
        username: 'new_username',
        avatar: null,
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: ' New_Username ' });

    expect(response.status).toBe(200);
    expect(updateCurrentUserMock).toHaveBeenCalledWith(
      userId.toString(),
      { username: 'new_username' },
      undefined,
    );
  });

  it('accepts an optional avatar file with an optional profile payload', async () => {
    updateCurrentUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: userId.toString(),
        username: 'new_username',
        avatar: 'https://images.beseen.fi/avatars/user/new.webp',
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify({ username: ' New_Username ' }))
      .attach('avatar', Buffer.from('image bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(updateCurrentUserMock).toHaveBeenCalledWith(
      userId.toString(),
      { username: 'new_username' },
      expect.objectContaining({ fieldname: 'avatar', originalname: 'avatar.png' }),
    );
  });

  it('allows removing an existing avatar', async () => {
    updateCurrentUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: userId.toString(),
        username: 'current_user',
        avatar: null,
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ removeAvatar: true });

    expect(response.status).toBe(200);
    expect(updateCurrentUserMock).toHaveBeenCalledWith(
      userId.toString(),
      { removeAvatar: true },
      undefined,
    );
  });

  it('rejects client-supplied avatar URLs', async () => {
    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: 'https://untrusted.example/avatar.webp' });

    expect(response.status).toBe(400);
    expect(updateCurrentUserMock).not.toHaveBeenCalled();
  });

  it('rejects uploading and removing an avatar in the same request', async () => {
    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify({ removeAvatar: true }))
      .attach('avatar', Buffer.from('image bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(updateCurrentUserMock).not.toHaveBeenCalled();
  });

  it('rejects empty and removed creator/profile fields', async () => {
    const empty = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    const removed = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountType: 'creator' });

    expect(empty.status).toBe(400);
    expect(removed.status).toBe(400);
    expect(updateCurrentUserMock).not.toHaveBeenCalled();
  });
});
