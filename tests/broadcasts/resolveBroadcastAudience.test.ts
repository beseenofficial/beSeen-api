import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import TokenHolding from '../../src/models/TokenHolding';
import getOrCreateUserToken from '../../src/utils/token/getOrCreateUserToken';
import resolveBroadcastAudience from '../../src/utils/broadcast/resolveBroadcastAudience';

vi.mock('../../src/utils/token/getOrCreateUserToken', () => ({ default: vi.fn() }));

const sortedResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('resolveBroadcastAudience', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getOrCreateUserToken).mockReset();
  });

  it('returns only active holders of the sender token that have an active key', async () => {
    const creatorId = new Types.ObjectId();

    const tokenId = new Types.ObjectId();

    const holderId = new Types.ObjectId();

    const key = Buffer.alloc(32, 7).toString('base64');

    vi.mocked(getOrCreateUserToken).mockResolvedValue({ _id: tokenId } as never);
    vi.spyOn(TokenHolding, 'find').mockReturnValue(
      sortedResult([{ token: tokenId, holder: holderId }]) as never,
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
        accessMode: 'token',
        tokenId: tokenId.toString(),
      },
    ]);
  });
});
