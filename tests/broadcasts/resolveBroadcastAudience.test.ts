import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import AuraFollow from '../../src/models/AuraFollow';
import resolveBroadcastAudience from '../../src/utils/broadcast/resolveBroadcastAudience';

const sortedResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('resolveBroadcastAudience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns only active holders of the sender token that have an active key', async () => {
    const creatorId = new Types.ObjectId();

    const holderId = new Types.ObjectId();

    const key = Buffer.alloc(32, 7).toString('base64');

    vi.spyOn(AuraFollow, 'find').mockReturnValue(
      sortedResult([{ follower: holderId, firstContractTokenId: '42' }]) as never,
    );
    vi.spyOn(User, 'find').mockReturnValue(
      sortedResult([{ _id: holderId, username: 'holder_user' }]) as never,
    );
    vi.spyOn(UserKey, 'find').mockReturnValue({
      exec: vi
        .fn()
        .mockResolvedValue([{ user: holderId, derivationVersion: 1, encryptionPublicKey: key }]),
    } as never);

    await expect(resolveBroadcastAudience(creatorId.toString())).resolves.toEqual([
      {
        recipientId: holderId.toString(),
        username: 'holder_user',
        keyVersion: 1,
        encryptionPublicKey: key,
        accessMode: 'aura',
        auraTokenId: '42',
      },
    ]);
  });
});
