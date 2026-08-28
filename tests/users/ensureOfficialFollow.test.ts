import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import TokenHolding from '../../src/models/TokenHolding';
import ensureConversation from '../../src/utils/messenger/ensureConversation';
import getOrCreateUserToken from '../../src/utils/token/getOrCreateUserToken';
import ensureOfficialFollow from '../../src/utils/user/ensureOfficialFollow';

vi.mock('../../src/utils/token/getOrCreateUserToken', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/messenger/ensureConversation', () => ({ default: vi.fn() }));

const session = {} as never;
const followerId = new Types.ObjectId('000000000000000000000001');
const officialId = new Types.ObjectId('000000000000000000000002');
const tokenId = new Types.ObjectId('000000000000000000000003');

const findResult = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const updateResult = (upsertedCount: number) => ({
  exec: vi.fn().mockResolvedValue({ upsertedCount }),
});

describe('ensureOfficialFollow', () => {
  beforeEach(() => {
    vi.mocked(getOrCreateUserToken).mockReset();
    vi.mocked(ensureConversation).mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it('idempotently creates the official token holding and conversation', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(findResult({ _id: officialId }) as never);
    vi.mocked(getOrCreateUserToken).mockResolvedValue({ _id: tokenId } as never);
    const holdingSpy = vi
      .spyOn(TokenHolding, 'updateOne')
      .mockReturnValue(updateResult(1) as never);
    vi.mocked(ensureConversation).mockResolvedValue({
      conversation: { _id: new Types.ObjectId() } as never,
      created: true,
    });

    await expect(ensureOfficialFollow(followerId, session)).resolves.toEqual({
      followed: true,
      holdingCreated: true,
      conversationCreated: true,
    });
    expect(User.findOne).toHaveBeenCalledWith({
      username: 'beseenfi',
      status: 'active',
      deletedAt: null,
    });
    expect(holdingSpy).toHaveBeenCalledWith(
      { token: tokenId, holder: followerId },
      { $setOnInsert: { token: tokenId, holder: followerId } },
      { upsert: true, session },
    );
    expect(ensureConversation).toHaveBeenCalledWith(followerId, officialId, session);
  });

  it('does nothing when the official account is unavailable', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(findResult(null) as never);

    await expect(ensureOfficialFollow(followerId, session)).resolves.toEqual({
      followed: false,
      holdingCreated: false,
      conversationCreated: false,
      reason: 'official_account_unavailable',
    });
    expect(getOrCreateUserToken).not.toHaveBeenCalled();
    expect(ensureConversation).not.toHaveBeenCalled();
  });

  it('does not make the official account follow itself', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(findResult({ _id: officialId }) as never);

    await expect(ensureOfficialFollow(officialId, session)).resolves.toEqual({
      followed: false,
      holdingCreated: false,
      conversationCreated: false,
      reason: 'official_account_self',
    });
    expect(getOrCreateUserToken).not.toHaveBeenCalled();
    expect(ensureConversation).not.toHaveBeenCalled();
  });
});
