import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import Broadcast from '../../src/models/Broadcast';
import BroadcastRecipient from '../../src/models/BroadcastRecipient';
import getBroadcastFeed from '../../src/utils/broadcast/getBroadcastFeed';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

const listQueryResult = <T>(value: T) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const createViewer = () =>
  new User({
    _id: new Types.ObjectId(),
    walletAddress: WALLET_ADDRESS,
    username: 'viewer_user',
    avatar: null,
  });

const createPublishedBroadcast = (creatorId: Types.ObjectId) => ({
  _id: new Types.ObjectId(),
  clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  creator: creatorId,
  audienceType: 'demo_all_users' as const,
  audienceSnapshotCount: 1,
  encryptionVersion: 1,
  creatorKeyVersion: 1,
  creatorSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
  contentCiphertext: Buffer.alloc(32, 2).toString('base64'),
  contentNonce: Buffer.alloc(24, 3).toString('base64'),
  creatorEncryptedBroadcastKey: Buffer.alloc(80, 4).toString('base64'),
  recipientKeysDigest: 'a'.repeat(64),
  signature: Buffer.alloc(64, 5).toString('base64'),
  publishedAt: new Date('2026-07-27T12:00:00.000Z'),
});

describe('getBroadcastFeed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns received broadcasts with only the viewer recipient key', async () => {
    const viewer = createViewer();

    const creatorId = new Types.ObjectId();

    const broadcast = createPublishedBroadcast(creatorId);

    const aggregateRows = [
      {
        keyVersion: 1,
        encryptedBroadcastKey: Buffer.alloc(80, 6).toString('base64'),
        broadcastDocument: broadcast,
        creatorDocument: {
          _id: creatorId,
          username: 'creator_user',
          avatar: null,
        },
      },
    ];
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(viewer) as never);
    const aggregateExec = vi.fn().mockResolvedValue(aggregateRows);

    const aggregateSpy = vi
      .spyOn(BroadcastRecipient, 'aggregate')
      .mockReturnValue({ exec: aggregateExec } as never);

    const result = await getBroadcastFeed(viewer._id.toString(), {
      view: 'received',
      limit: 20,
    });

    expect(result).toMatchObject({
      ok: true,
      feed: {
        view: 'received',
        hasMore: false,
        items: [
          {
            id: broadcast._id.toString(),
            creator: { username: 'creator_user' },
            viewerKey: {
              source: 'recipient',
              encryptedBroadcastKey: aggregateRows[0]!.encryptedBroadcastKey,
            },
            integrity: { algorithm: 'Ed25519' },
          },
        ],
      },
    });
    expect(result).not.toHaveProperty('feed.items.0.creator.walletAddress');
    expect(result).not.toHaveProperty('feed.items.0.privateKey');
    expect(aggregateSpy).toHaveBeenCalledOnce();
  });

  it('returns sent broadcasts with the creator wrapped key and cursor pagination', async () => {
    const viewer = createViewer();

    const first = new Broadcast({
      ...createPublishedBroadcast(viewer._id),
      status: 'published',
      creatorEncryptionPublicKey: Buffer.alloc(32, 7).toString('base64'),
    });

    const second = new Broadcast({
      ...createPublishedBroadcast(viewer._id),
      status: 'published',
      creatorEncryptionPublicKey: Buffer.alloc(32, 8).toString('base64'),
    });
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(viewer) as never);
    const broadcastQuery = listQueryResult([first, second]);
    vi.spyOn(Broadcast, 'find').mockReturnValue(broadcastQuery as never);

    const result = await getBroadcastFeed(viewer._id.toString(), {
      view: 'sent',
      limit: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      feed: {
        view: 'sent',
        hasMore: true,
        nextCursor: first._id.toString(),
        items: [
          {
            viewerKey: {
              source: 'creator',
              keyVersion: 1,
              encryptedBroadcastKey: first.creatorEncryptedBroadcastKey,
            },
          },
        ],
      },
    });
    expect(broadcastQuery.limit).toHaveBeenCalledWith(2);
  });
});
