import type { Types } from 'mongoose';

import User from '../../models/User';
import Broadcast from '../../models/Broadcast';
import BroadcastRecipient from '../../models/BroadcastRecipient';
import type { BroadcastDraftListQuery } from '../../validation/broadcast/draft';
import type { BroadcastDraftListItem, GetBroadcastDraftsResult } from '../../types/broadcast';
import {
  BROADCAST_CONTENT_ENCRYPTION_SUITE,
  BROADCAST_KEY_WRAP_SUITE,
} from '../../constant/broadcast';

interface UploadedKeyCount {
  _id: Types.ObjectId;
  uploadedCount: number;
}

const getBroadcastDrafts = async (
  creatorId: string,
  query: BroadcastDraftListQuery,
): Promise<GetBroadcastDraftsResult> => {
  const creator = await User.findOne({
    _id: creatorId,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!creator) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const draftFilter: Record<string, unknown> = {
    creator: creator._id,
    status: 'draft',
    expiresAt: { $gt: new Date() },
  };

  if (query.cursor) {
    draftFilter._id = { $lt: query.cursor };
  }

  const allDrafts = await Broadcast.find(draftFilter)
    .sort({ _id: -1 })
    .limit(query.limit + 1)
    .exec();

  const hasMore = allDrafts.length > query.limit;

  const drafts = hasMore ? allDrafts.slice(0, query.limit) : allDrafts;

  const uploadedCounts =
    drafts.length === 0
      ? []
      : await BroadcastRecipient.aggregate<UploadedKeyCount>([
          {
            $match: {
              broadcast: { $in: drafts.map((draft) => draft._id) },
              encryptedBroadcastKey: { $ne: null },
            },
          },
          { $group: { _id: '$broadcast', uploadedCount: { $sum: 1 } } },
        ]).exec();

  const uploadedCountByDraftId = new Map(
    uploadedCounts.map((count) => [count._id.toString(), count.uploadedCount]),
  );

  const items = drafts.map((draft): BroadcastDraftListItem => {
    const uploadedCount = uploadedCountByDraftId.get(draft._id.toString()) ?? 0;

    const remainingCount = Math.max(0, draft.audienceSnapshotCount - uploadedCount);

    return {
      id: draft._id.toString(),
      clientBroadcastId: draft.clientBroadcastId,
      status: 'draft',
      audience: { type: draft.audienceType, count: draft.audienceSnapshotCount },
      progress: {
        uploadedCount,
        remainingCount,
        complete: remainingCount === 0,
      },
      encryption: {
        version: draft.encryptionVersion,
        contentSuite: BROADCAST_CONTENT_ENCRYPTION_SUITE,
        keyWrapSuite: BROADCAST_KEY_WRAP_SUITE,
      },
      creatorKey: {
        keyVersion: draft.creatorKeyVersion,
        encryptionPublicKey: draft.creatorEncryptionPublicKey,
      },
      createdAt: draft.createdAt,
      expiresAt: draft.expiresAt,
    };
  });

  const lastItem = items.at(-1);

  return {
    ok: true,
    drafts: {
      items,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
    },
  };
};

export default getBroadcastDrafts;
