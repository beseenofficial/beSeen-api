import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import User from '../../src/models/User';
import getBroadcastDrafts from '../../src/utils/broadcast/getBroadcastDrafts';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });
const listQueryResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const createDraft = (creatorId: Types.ObjectId) =>
  new Broadcast({
    _id: new Types.ObjectId(),
    clientBroadcastId: crypto.randomUUID(),
    creator: creatorId,
    audienceSnapshotCount: 3,
    encryptionVersion: 1,
    creatorKeyVersion: 1,
    creatorSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
    creatorEncryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
    createdAt: new Date('2026-07-27T12:00:00.000Z'),
  });

describe('getBroadcastDrafts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists resumable drafts with aggregate upload progress and a stable cursor', async () => {
    const creator = new User({
      _id: new Types.ObjectId(),
      walletAddress: WALLET_ADDRESS,
      username: 'creator_user',
      displayName: 'Creator',
      accountType: 'creator',
    });
    const first = createDraft(creator._id);
    const second = createDraft(creator._id);
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(creator) as never);
    const draftQuery = listQueryResult([first, second]);
    vi.spyOn(Broadcast, 'find').mockReturnValue(draftQuery as never);
    vi.spyOn(BroadcastRecipient, 'aggregate').mockReturnValue({
      exec: vi.fn().mockResolvedValue([{ _id: first._id, uploadedCount: 2 }]),
    } as never);

    const result = await getBroadcastDrafts(creator._id.toString(), { limit: 1 });

    expect(result).toMatchObject({
      ok: true,
      drafts: {
        hasMore: true,
        nextCursor: first._id.toString(),
        items: [
          {
            id: first._id.toString(),
            progress: {
              uploadedCount: 2,
              remainingCount: 1,
              complete: false,
            },
          },
        ],
      },
    });
    expect(draftQuery.limit).toHaveBeenCalledWith(2);
  });

  it('rejects unavailable accounts before reading drafts', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);
    const findDraftsSpy = vi.spyOn(Broadcast, 'find');

    await expect(
      getBroadcastDrafts(new Types.ObjectId().toString(), { limit: 20 }),
    ).resolves.toEqual({ ok: false, reason: 'account_unavailable' });
    expect(findDraftsSpy).not.toHaveBeenCalled();
  });
});
