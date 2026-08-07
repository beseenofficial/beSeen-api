import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withDatabaseTransaction } from '../../src/db';
import TokenHolding from '../../src/models/TokenHolding';
import User from '../../src/models/User';
import ensureConversation from '../../src/utils/messenger/ensureConversation';
import getOrCreateUserToken from '../../src/utils/token/getOrCreateUserToken';
import purchaseUserToken from '../../src/utils/token/purchaseUserToken';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../../src/utils/token/getOrCreateUserToken', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/messenger/ensureConversation', () => ({ default: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);
const getOrCreateUserTokenMock = vi.mocked(getOrCreateUserToken);
const ensureConversationMock = vi.mocked(ensureConversation);
const buyerId = new Types.ObjectId();
const ownerId = new Types.ObjectId();
const tokenId = new Types.ObjectId();
const conversationId = new Types.ObjectId();
const acquiredAt = new Date('2026-08-07T12:00:00.000Z');
const session = {} as never;

const queryResult = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const writeResult = (upsertedCount: number) => ({
  exec: vi.fn().mockResolvedValue({ upsertedCount }),
});

describe('purchaseUserToken', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation(session));
    getOrCreateUserTokenMock.mockReset();
    ensureConversationMock.mockReset();

    vi.spyOn(User, 'findOne')
      .mockReturnValueOnce(queryResult({ _id: buyerId }) as never)
      .mockReturnValueOnce(queryResult({ _id: ownerId, username: 'token_owner' }) as never);
    getOrCreateUserTokenMock.mockResolvedValue({ _id: tokenId } as never);
    vi.spyOn(TokenHolding, 'updateOne').mockReturnValue(writeResult(1) as never);
    vi.spyOn(TokenHolding, 'findOne').mockReturnValue(
      queryResult({ token: tokenId, holder: buyerId, createdAt: acquiredAt }) as never,
    );
    ensureConversationMock.mockResolvedValue({
      conversation: { _id: conversationId } as never,
      created: true,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('creates the existing holding and pair conversation in one transaction', async () => {
    const result = await purchaseUserToken(buyerId.toString(), 'token_owner');

    expect(result).toEqual({
      ok: true,
      created: true,
      holding: {
        tokenId: tokenId.toString(),
        ownerId: ownerId.toString(),
        ownerUsername: 'token_owner',
        acquiredAt,
      },
      conversation: { id: conversationId.toString(), created: true },
    });
    expect(getOrCreateUserTokenMock).toHaveBeenCalledWith(ownerId, session);
    expect(ensureConversationMock).toHaveBeenCalledWith(buyerId, ownerId, session);
    expect(TokenHolding.updateOne).toHaveBeenCalledWith(
      { token: tokenId, holder: buyerId },
      { $setOnInsert: { token: tokenId, holder: buyerId } },
      { upsert: true, session },
    );
  });

  it('returns the same conversation when the holding and pair already exist', async () => {
    vi.spyOn(TokenHolding, 'updateOne').mockReturnValue(writeResult(0) as never);
    ensureConversationMock.mockResolvedValue({
      conversation: { _id: conversationId } as never,
      created: false,
    });

    const result = await purchaseUserToken(buyerId.toString(), 'token_owner');

    expect(result).toMatchObject({
      ok: true,
      created: false,
      conversation: { id: conversationId.toString(), created: false },
    });
  });

  it('does not create a holding or conversation for an own-token purchase', async () => {
    vi.spyOn(User, 'findOne')
      .mockReset()
      .mockReturnValueOnce(queryResult({ _id: buyerId }) as never)
      .mockReturnValueOnce(queryResult({ _id: buyerId, username: 'buyer' }) as never);

    await expect(purchaseUserToken(buyerId.toString(), 'buyer')).resolves.toEqual({
      ok: false,
      reason: 'own_token',
    });
    expect(getOrCreateUserTokenMock).not.toHaveBeenCalled();
    expect(ensureConversationMock).not.toHaveBeenCalled();
  });
});
