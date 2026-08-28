import sharp from 'sharp';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import updateCurrentUser from '../../src/utils/user/updateCurrentUser';
import { deleteAvatar, uploadAvatar } from '../../src/utils/avatar/avatarStorage';

vi.mock('../../src/utils/avatar/avatarStorage', () => ({
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}));

const uploadAvatarMock = vi.mocked(uploadAvatar);

const deleteAvatarMock = vi.mocked(deleteAvatar);

const userId = new Types.ObjectId();

const walletAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const createUser = () => {
  const user = new User({
    _id: userId,
    walletAddress,
    username: 'current_user',
    bio: null,
    avatar: 'https://images.beseen.fi/avatars/user/old.webp',
    avatarObjectKey: 'avatars/user/old.webp',
  });
  user.createdAt = new Date('2026-07-27T12:00:00.000Z');
  return user;
};

const findOneResult = (user: ReturnType<typeof createUser>) => ({
  select: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(user),
});

const existsResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('updateCurrentUser', () => {
  beforeEach(() => {
    uploadAvatarMock.mockReset();
    deleteAvatarMock.mockReset();
    deleteAvatarMock.mockResolvedValue();
  });

  afterEach(() => vi.restoreAllMocks());

  it('updates the username without changing or deleting the optional avatar', async () => {
    const user = createUser();
    vi.spyOn(User, 'findOne').mockReturnValue(findOneResult(user) as never);
    vi.spyOn(User, 'exists').mockReturnValue(existsResult(null) as never);
    vi.spyOn(user, 'save').mockResolvedValue(user);

    const result = await updateCurrentUser(userId.toString(), { username: 'new_username' });

    expect(result).toMatchObject({
      ok: true,
      user: {
        username: 'new_username',
        avatar: 'https://images.beseen.fi/avatars/user/old.webp',
      },
    });
    expect(uploadAvatarMock).not.toHaveBeenCalled();
    expect(deleteAvatarMock).not.toHaveBeenCalled();
  });

  it('updates and clears the optional bio', async () => {
    const user = createUser();
    vi.spyOn(User, 'findOne').mockReturnValue(findOneResult(user) as never);
    vi.spyOn(user, 'save').mockResolvedValue(user);

    const updated = await updateCurrentUser(userId.toString(), {
      bio: 'Private social, made simple',
    });

    expect(updated).toMatchObject({
      ok: true,
      user: { bio: 'Private social, made simple' },
    });
    expect(user.bio).toBe('Private social, made simple');

    const cleared = await updateCurrentUser(userId.toString(), { bio: null });
    expect(cleared).toMatchObject({ ok: true, user: { bio: null } });
    expect(user.bio).toBeNull();
  });

  it('uploads a replacement and deletes the previous object after saving', async () => {
    const user = createUser();

    const input = await sharp({
      create: { width: 256, height: 256, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    vi.spyOn(User, 'findOne').mockReturnValue(findOneResult(user) as never);
    vi.spyOn(user, 'save').mockResolvedValue(user);
    uploadAvatarMock.mockResolvedValue({
      objectKey: 'avatars/user/new.webp',
      publicUrl: 'https://images.beseen.fi/avatars/user/new.webp',
    });

    const result = await updateCurrentUser(userId.toString(), {}, {
      buffer: input,
    } as Express.Multer.File);

    expect(result).toMatchObject({
      ok: true,
      user: { avatar: 'https://images.beseen.fi/avatars/user/new.webp' },
    });
    expect(user.avatarObjectKey).toBe('avatars/user/new.webp');
    expect(deleteAvatarMock).toHaveBeenCalledWith('avatars/user/old.webp');
    expect(user.save).toHaveBeenCalledBefore(deleteAvatarMock);
  });

  it('removes an existing optional avatar and its R2 object', async () => {
    const user = createUser();
    vi.spyOn(User, 'findOne').mockReturnValue(findOneResult(user) as never);
    vi.spyOn(user, 'save').mockResolvedValue(user);

    const result = await updateCurrentUser(userId.toString(), { removeAvatar: true });

    expect(result).toMatchObject({ ok: true, user: { avatar: null } });
    expect(user.avatarObjectKey).toBeNull();
    expect(deleteAvatarMock).toHaveBeenCalledWith('avatars/user/old.webp');
  });

  it('deletes a newly uploaded object if the database save fails', async () => {
    const user = createUser();

    const input = await sharp({
      create: { width: 128, height: 128, channels: 3, background: '#ffffff' },
    })
      .webp()
      .toBuffer();
    vi.spyOn(User, 'findOne').mockReturnValue(findOneResult(user) as never);
    uploadAvatarMock.mockResolvedValue({
      objectKey: 'avatars/user/uncommitted.webp',
      publicUrl: 'https://images.beseen.fi/avatars/user/uncommitted.webp',
    });
    vi.spyOn(user, 'save').mockRejectedValue(new Error('database unavailable'));

    await expect(
      updateCurrentUser(userId.toString(), {}, { buffer: input } as Express.Multer.File),
    ).rejects.toThrow('database unavailable');

    expect(deleteAvatarMock).toHaveBeenCalledWith('avatars/user/uncommitted.webp');
    expect(deleteAvatarMock).not.toHaveBeenCalledWith('avatars/user/old.webp');
  });
});
