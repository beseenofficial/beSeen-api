import { Types } from 'mongoose';
import type { PipelineStage } from 'mongoose';

import User from '../../models/User';
import Broadcast from '../../models/Broadcast';
import type { UserDocument } from '../../models/User';
import type { BroadcastDocument } from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { BroadcastAudienceType } from '../../constant/broadcast';
import type { BroadcastFeedQuery } from '../../validation/broadcast/feed';
import type { BroadcastFeedItem, GetBroadcastFeedResult } from '../../types/broadcast';
import {
  BROADCAST_CONTENT_ENCRYPTION_SUITE,
  BROADCAST_KEY_WRAP_SUITE,
  BROADCAST_SIGNATURE_VERSION,
} from '../../constant/broadcast';

interface FeedBroadcastRecord {
  _id: Types.ObjectId;
  clientBroadcastId: string;
  creator: Types.ObjectId;
  audienceType: BroadcastAudienceType;
  audienceSnapshotCount: number;
  encryptionVersion: number;
  creatorKeyVersion: number;
  creatorSigningPublicKey: string;
  contentCiphertext: string;
  contentNonce: string;
  creatorEncryptedBroadcastKey: string;
  recipientKeysDigest: string;
  signature: string;
  publishedAt: Date;
}

interface FeedCreatorRecord {
  _id: Types.ObjectId;
  username: string;
  avatar: string | null;
}

interface ReceivedFeedRecord {
  keyVersion: number;
  encryptedBroadcastKey: string;
  broadcastDocument: FeedBroadcastRecord;
  creatorDocument: FeedCreatorRecord;
}

type BroadcastLike = BroadcastDocument | FeedBroadcastRecord;
type CreatorLike = UserDocument | FeedCreatorRecord;

const serializeFeedItem = (
  broadcast: BroadcastLike,
  creator: CreatorLike,
  viewerKey: BroadcastFeedItem['viewerKey'],
): BroadcastFeedItem => ({
  id: broadcast._id.toString(),
  clientBroadcastId: broadcast.clientBroadcastId,
  creator: {
    id: creator._id.toString(),
    username: creator.username,
    avatar: creator.avatar,
  },
  manifest: {
    signatureVersion: BROADCAST_SIGNATURE_VERSION,
    encryptionVersion: broadcast.encryptionVersion,
    contentSuite: BROADCAST_CONTENT_ENCRYPTION_SUITE,
    keyWrapSuite: BROADCAST_KEY_WRAP_SUITE,
    creatorId: broadcast.creator.toString(),
    creatorKeyVersion: broadcast.creatorKeyVersion,
    contentCiphertext: broadcast.contentCiphertext!,
    contentNonce: broadcast.contentNonce!,
    creatorEncryptedBroadcastKey: broadcast.creatorEncryptedBroadcastKey!,
    audienceType: broadcast.audienceType,
    audienceCount: broadcast.audienceSnapshotCount,
    recipientKeysDigest: broadcast.recipientKeysDigest!,
  },
  viewerKey,
  integrity: {
    algorithm: 'Ed25519',
    signingPublicKey: broadcast.creatorSigningPublicKey,
    signature: broadcast.signature!,
  },
  publishedAt: broadcast.publishedAt!,
});

const getReceivedFeed = async (
  userId: string,
  query: BroadcastFeedQuery,
): Promise<BroadcastFeedItem[]> => {
  const match: Record<string, unknown> = {
    recipient: new Types.ObjectId(userId),
    encryptedBroadcastKey: { $ne: null },
  };

  if (query.cursor) {
    match.broadcast = { $lt: new Types.ObjectId(query.cursor) };
  }

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { broadcast: -1 } },
    {
      $lookup: {
        from: Broadcast.collection.name,
        localField: 'broadcast',
        foreignField: '_id',
        as: 'broadcastDocument',
      },
    },
    { $unwind: '$broadcastDocument' },
    { $match: { 'broadcastDocument.status': 'published' } },
    {
      $lookup: {
        from: User.collection.name,
        localField: 'broadcastDocument.creator',
        foreignField: '_id',
        as: 'creatorDocument',
      },
    },
    { $unwind: '$creatorDocument' },
    { $limit: query.limit + 1 },
  ];

  const rows = await BroadcastRecipient.aggregate<ReceivedFeedRecord>(pipeline).exec();

  return rows.map((row) =>
    serializeFeedItem(row.broadcastDocument, row.creatorDocument, {
      source: 'recipient',
      keyVersion: row.keyVersion,
      encryptedBroadcastKey: row.encryptedBroadcastKey,
    }),
  );
};

const getSentFeed = async (
  creator: UserDocument,
  query: BroadcastFeedQuery,
): Promise<BroadcastFeedItem[]> => {
  const match: Record<string, unknown> = {
    creator: creator._id,
    status: 'published',
  };

  if (query.cursor) {
    match._id = { $lt: query.cursor };
  }

  const broadcasts = await Broadcast.find(match)
    .sort({ _id: -1 })
    .limit(query.limit + 1)
    .exec();

  return broadcasts.map((broadcast) =>
    serializeFeedItem(broadcast, creator, {
      source: 'creator',
      keyVersion: broadcast.creatorKeyVersion,
      encryptedBroadcastKey: broadcast.creatorEncryptedBroadcastKey!,
    }),
  );
};

const getBroadcastFeed = async (
  userId: string,
  query: BroadcastFeedQuery,
): Promise<GetBroadcastFeedResult> => {
  const viewer = await User.findOne({
    _id: userId,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!viewer) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const allItems =
    query.view === 'received'
      ? await getReceivedFeed(userId, query)
      : await getSentFeed(viewer, query);

  const hasMore = allItems.length > query.limit;

  const items = hasMore ? allItems.slice(0, query.limit) : allItems;

  const lastItem = items.at(-1);

  return {
    ok: true,
    feed: {
      view: query.view,
      items,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
    },
  };
};

export default getBroadcastFeed;
