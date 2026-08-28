import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import Conversation from '../../src/models/Conversation';
import TokenHolding from '../../src/models/TokenHolding';
import getOrCreateUserToken from '../../src/utils/token/getOrCreateUserToken';
import backfillOfficialFollowers from '../../src/migrations/20260828BackfillOfficialFollowers';

vi.mock('../../src/utils/token/getOrCreateUserToken', () => ({ default: vi.fn() }));

const queryResult = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('20260828BackfillOfficialFollowers migration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getOrCreateUserToken).mockReset();
  });

  it('upserts official holdings and canonical conversations for existing active users', async () => {
    const officialId = new Types.ObjectId('000000000000000000000010');
    const firstUserId = new Types.ObjectId('000000000000000000000001');
    const secondUserId = new Types.ObjectId('000000000000000000000020');
    const tokenId = new Types.ObjectId('000000000000000000000030');

    vi.spyOn(User, 'findOne').mockReturnValue(queryResult({ _id: officialId }) as never);
    vi.spyOn(User, 'find').mockReturnValue(
      queryResult([{ _id: firstUserId }, { _id: secondUserId }]) as never,
    );
    vi.mocked(getOrCreateUserToken).mockResolvedValue({ _id: tokenId } as never);
    const holdingSpy = vi.spyOn(TokenHolding, 'bulkWrite').mockResolvedValue({
      upsertedCount: 2,
    } as never);
    const conversationSpy = vi.spyOn(Conversation, 'bulkWrite').mockResolvedValue({
      upsertedCount: 2,
    } as never);

    await expect(backfillOfficialFollowers()).resolves.toEqual({
      officialAccountFound: true,
      eligibleUsers: 2,
      createdHoldings: 2,
      createdConversations: 2,
    });
    expect(holdingSpy).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { token: tokenId, holder: firstUserId },
            update: { $setOnInsert: { token: tokenId, holder: firstUserId } },
            upsert: true,
          },
        },
        {
          updateOne: {
            filter: { token: tokenId, holder: secondUserId },
            update: { $setOnInsert: { token: tokenId, holder: secondUserId } },
            upsert: true,
          },
        },
      ],
      { ordered: false },
    );
    expect(conversationSpy).toHaveBeenCalledOnce();
  });

  it('is a safe no-op before the official account exists', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);

    await expect(backfillOfficialFollowers()).resolves.toEqual({
      officialAccountFound: false,
      eligibleUsers: 0,
      createdHoldings: 0,
      createdConversations: 0,
    });
    expect(getOrCreateUserToken).not.toHaveBeenCalled();
  });
});
